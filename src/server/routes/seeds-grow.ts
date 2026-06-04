/**
 * Seed grow routes: body-based and ID-based growth.
 * Slice 12 of the modular router split.
 */
import type { Express } from 'express';
import { deriveCleanTitle } from '../../lib/kernel/types';
import { executeGspl } from '../../lib/kernel/gspl-interpreter.js';

export interface SeedsGrowDeps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  BodyGrowSeedSchema: any;
  GrowSeedSchema: any;
  getAllDomains: () => string[];
  growSeed: (seed: any) => Promise<any>;
  buildC2PAManifest: (seed: any, domain: string, version?: string, artifact?: any) => any;
  growCacheKey: (hash: string, domain: string) => string;
  cache: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, ttl?: number) => Promise<void> };
  log: (level: string, msg: string, meta?: any) => void;
}

export function registerSeedsGrowRoutes(app: Express, deps: SeedsGrowDeps): void {
  const { seeds, optionalAuth, validateBody, BodyGrowSeedSchema, GrowSeedSchema, getAllDomains, growSeed, buildC2PAManifest, growCacheKey, cache, log } = deps;

  app.post('/api/seeds/grow', optionalAuth, validateBody(BodyGrowSeedSchema), async (req: any, res: any) => {
    let result: any;
    try {
      const body = req.body ?? {};
      const { seed: rawSeedFromBody, domain: domainOverride } = body;
      let gsplSource: string | undefined;
      let rawSeed = rawSeedFromBody;

      // Stronger executeGspl integration in grow (per revised Section 1): GSPL-first for programs.
      // if gsplProgram/gspl in body: await executeGspl(gspl) -> produce seed(s), then grow using existing,
      // promote rich, return with gsplSource echoed for roundtrip. Makes grow path GSPL-first for programs.
      if (body.gsplProgram || body.gspl) {
        gsplSource = String(body.gsplProgram || body.gspl);
        try {
          const gsplRes: any = await Promise.resolve(executeGspl(gsplSource));
          let produced: any[] = [];
          if (gsplRes?.seeds) {
            if (gsplRes.seeds instanceof Map) produced = Array.from(gsplRes.seeds.values());
            else if (Array.isArray(gsplRes.seeds)) produced = gsplRes.seeds;
            else produced = [gsplRes.seeds];
          } else if (gsplRes?.seed) {
            produced = [gsplRes.seed];
          } else if (Array.isArray(gsplRes)) {
            produced = gsplRes;
          }
          if (produced.length > 0) {
            rawSeed = produced[0];
          }
        } catch (gsplErr: any) {
          log('WARN', 'GSPL program in grow failed, falling back to seed', { error: gsplErr?.message });
        }
      }

      if (!rawSeed) return res.status(400).json({ error: 'Missing seed in body' });
      const domain = domainOverride ?? rawSeed.$domain ?? 'visual2d';
      let seed = { ...rawSeed, $domain: domain };
      let result: any;

      const NEW_DOMAIN_GENERATORS: Record<string, (s: any, p: string) => Promise<any>> = {
        website:   async (s, p) => { const { generateWebsite }   = await import('../../lib/kernel/generators/website.js');   return generateWebsite(s, p); },
        field:     async (s, p) => { const { generateField }     = await import('../../lib/kernel/generators/field.js');     return generateField(s, p); },
        quantum:   async (s, p) => { const { generateQuantum }   = await import('../../lib/kernel/generators/quantum.js');   return generateQuantum(s, p); },
        molecule:  async (s, p) => { const { generateMolecule }  = await import('../../lib/kernel/generators/molecule.js');  return generateMolecule(s, p); },
        cosmology: async (s, p) => { const { generateCosmology } = await import('../../lib/kernel/generators/cosmology.js'); return generateCosmology(s, p); },
      };
      const outputDir = `data/artifacts/${domain}`;
      const outputPath = `${outputDir}/${seed.$hash ?? 'seed'}-${Date.now()}.out`;
      if (NEW_DOMAIN_GENERATORS[domain]) {
        result = await NEW_DOMAIN_GENERATORS[domain](seed, outputPath);
        result.c2pa_manifest = buildC2PAManifest(seed, domain, '2.0', result);
      } else {
        result = await growSeed(seed);
      }
      if (result?.svgPath) {
        try { const { readFileSync } = await import('fs'); result.svgContent = readFileSync(result.svgPath, 'utf-8'); } catch { /* swallow: best-effort seeds-grow route cleanup */ }
      }
      if (result?.indexHtml || result?.htmlContent) { result.htmlContent = result.htmlContent ?? result.indexHtml; }

      // Light safety net for body-grow direct paths (visual2d/character etc) - promote data fields if contract/generate supplied them.
      // Extremely minimal; main enrichment lives in the QC contracts.
      try {
        if (result?.meta?.pngPath && !result.pngDataURL) {
          const fsMod = await import('fs');
          const buf = await fsMod.promises.readFile(result.meta.pngPath);
          result.pngDataURL = `data:image/png;base64,${buf.toString('base64')}`;
        }
        if (result?.svg && !result.svgDataURL) {
          result.svgDataURL = `data:image/svg+xml;base64,${Buffer.from(String(result.svg)).toString('base64')}`;
        }
        if (result?.wavBuffer && !result.audioDataURL) {
          result.audioDataURL = `data:audio/wav;base64,${result.wavBuffer.toString('base64')}`;
        }
        if (result?.manuscript && !result.storyData) {
          result.storyData = JSON.stringify(result.manuscript);
        }
        if (!result.visual) result.visual = {};
        if (result.pngDataURL) result.visual.pngDataURL = result.pngDataURL;
        if (result.svgDataURL) result.visual.svgDataURL = result.svgDataURL;
        if (result.structuredData || result.visual?.structuredData || result.summary || result.metrics) {
          result.visual.type = result.visual?.type || 'structured';
          if (result.structuredData) result.visual.structuredData = result.structuredData;
          if (result.summary) result.visual.summary = result.summary;
          if (result.metrics) result.visual.metrics = result.metrics;
        }
        if ((result.pngDataURL || result.svgDataURL) && !result.emergent_assets?.visual) {
          if (!result.emergent_assets) result.emergent_assets = {};
          result.emergent_assets.visual = {
            type: result.pngDataURL ? 'png' : 'svg',
            data: result.pngDataURL || result.svgDataURL,
            path: result.meta?.pngPath || result.svgPath,
          };
        }
      } catch { /* light only */ }

      if (gsplSource) {
        result.gsplSource = gsplSource; // echo for roundtrip (GSPL-first grow per revised Section 1)
      }

      res.json(result);
    } catch (e: any) {
      log('ERROR', 'Body-grow failed', { error: e.message });
      const errBody: any = { error: 'Growth failed', message: e.message };
      if (typeof result !== 'undefined' && result && (result.previewData || result.structuredData || result.visual || result.emergent_assets)) {
        errBody.richPartial = {
          preview: result.previewData || result.visual,
          structured: result.structuredData,
          emergent: result.emergent_assets
        };
      }
      res.status(500).json(errBody);
    }
  });

  app.post('/api/seeds/:id/grow', optionalAuth, validateBody(GrowSeedSchema), async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) { return res.status(404).json({ error: 'Seed not found', message: `No seed found with ID '${req.params.id}'`, suggestion: 'Check the seed ID and try again', example: { id: '53a6edaf-9a76-46ea-845b-ae283e8ad21c' }, docs: '/api/docs#seeds' }); }
    const supportedDomains = getAllDomains();
    const DOMAIN_ALIASES: Record<string, string> = {
      '2d': 'visual2d', 'visual-2d': 'visual2d', 'visual_2d': 'visual2d', '2dvisual': 'visual2d',
      '3d': 'geometry3d', 'geometry-3d': 'geometry3d', 'geometry_3d': 'geometry3d', '3dgeometry': 'geometry3d',
      'full-game': 'fullgame', 'full_game': 'fullgame', 'full game': 'fullgame',
      'anims': 'animation', 'animations': 'animation', 'animate': 'animation',
      'narratives': 'narrative', 'story': 'narrative', 'stories': 'narrative',
      'sound': 'audio', 'sfx': 'audio',
      'ecosystems': 'ecosystem', 'eco': 'ecosystem',
      'shaders': 'shader', 'glsl': 'shader',
      'particles': 'particle', 'vfx': 'particle',
      'typo': 'typography', 'type': 'typography', 'fonts': 'typography',
      'arch': 'architecture', 'buildings': 'architecture',
      'robot': 'robotics', 'robots': 'robotics',
      'car': 'vehicle', 'cars': 'vehicle',
      'furnitures': 'furniture',
      'fashions': 'fashion', 'cloth': 'fashion', 'clothing': 'fashion',
      'circuits': 'circuit', 'electronics': 'circuit',
      'dance': 'choreography',
      'agents': 'agent', 'npc': 'agent',
      'recipes': 'food', 'recipe': 'food',
      'procgen': 'procedural', 'noise': 'procedural',
      'artificial_life': 'alife',
      'user_interface': 'ui', 'interface': 'ui',
      'algorithm': 'procedural', 'algorithms': 'procedural',
      'biology': 'ecosystem', 'biochemistry': 'ecosystem',
      'engineering': 'physics',
      'data': 'procedural', 'analytics': 'procedural',
      'camera': 'visual2d', 'photography': 'visual2d',
      'creature': 'character', 'monster': 'character', 'beast': 'character',
      'scene': 'visual2d', 'environment': 'procedural',
      'weather': 'procedural', 'climate': 'procedural',
      'lighting': 'shader', 'illumination': 'shader',
      'materials': 'procedural',
      'plant': 'ecosystem', 'plants': 'ecosystem', 'flora': 'ecosystem',
      'field': 'field', 'force': 'physics',
      'style': 'visual2d', 'styling': 'visual2d', 'theme': 'visual2d',
      'framework': 'agent', 'system': 'agent',
      'cross-domain': 'agent', 'multidomain': 'agent', 'hybrid': 'agent',
      'fluid': 'physics', 'liquid': 'physics', 'gas': 'physics',
      'element': 'alife', 'elements': 'alife',
      'abstract': 'visual2d', 'generative': 'procedural',
      'em_field': 'field', 'electromagnetic': 'field', 'fdtd': 'field', 'em': 'field',
      'quantum': 'quantum', 'wavefunction': 'quantum', 'schrodinger': 'quantum', 'qm': 'quantum', 'dirac': 'quantum',
      'molecule': 'molecule', 'chemistry': 'molecule', 'chemical': 'molecule', 'mol': 'molecule', 'chem': 'molecule', 'smiles': 'molecule',
      'cosmology': 'cosmology', 'nbody': 'cosmology', 'n-body': 'cosmology', 'galaxy': 'cosmology', 'universe': 'cosmology', 'astrophysics': 'cosmology',
      'website': 'website', 'web': 'website', 'landing': 'website', 'site': 'website', 'html': 'website', 'page': 'website',
      'world': 'world', 'map': 'world', 'terrain': 'world', 'planet': 'world', 'continent': 'world',
      'app': 'app', 'application': 'app', 'webapp': 'app', 'react-app': 'app', 'frontend': 'app',
    };
    function findClosestDomain(input: string, candidates: string[]): string | null {
      if (!input) return null;
      const lower = input.toLowerCase().trim();
      if (candidates.includes(lower)) return lower;
      if (DOMAIN_ALIASES[lower]) return DOMAIN_ALIASES[lower];
      for (const c of candidates) { if (c.includes(lower) || lower.includes(c)) return c; }
      for (const [alias, canonical] of Object.entries(DOMAIN_ALIASES)) { if (candidates.includes(canonical) && (alias.includes(lower) || lower.includes(alias))) return canonical; }
      return null;
    }
    if (!seed.$domain || !supportedDomains.includes(seed.$domain)) {
      const closest = findClosestDomain(seed.$domain || '', supportedDomains);
      if (closest && supportedDomains.includes(closest)) {
        const oldDomain = seed.$domain;
        seed.$domain = closest;
        log('INFO', `Auto-fixed domain "${oldDomain}" → "${closest}" for seed ${seed.id}`);
      } else {
        return res.status(400).json({ error: 'Unsupported domain', message: `Domain '${seed.$domain}' is not supported for growth`, supported_domains: supportedDomains, suggestion: closest ? `Did you mean '${closest}'?` : `Use a seed with one of these domains: ${supportedDomains.slice(0, 5).join(', ')}...`, example: { domain: 'character' }, docs: '/api/docs#domains' });
      }
    }
    try {
      const cacheKey = growCacheKey(seed.$hash, seed.$domain);
      const cached = await cache.get(cacheKey);
      if (cached) { log('INFO', 'Seed grown (cached)', { id: seed.id, domain: seed.$domain }); return res.json(JSON.parse(cached)); }
      const grown = await growSeed(seed);
      await cache.set(cacheKey, JSON.stringify(grown), 300);
      log('INFO', 'Seed grown', { id: seed.id, domain: seed.$domain });

      // Light safety-net normalization (approved): if contract/grow produced rich visual data
      // (pngDataURL etc), ensure top-level + visual/emergent_assets for renderer paths.
      // No heavy logic, no duplication of synthesis. Pure pass-through / promote.
      try {
        const g: any = grown || {};
        if (g.meta?.pngPath && !g.pngDataURL) {
          const fsMod = await import('fs');
          const buf = await fsMod.promises.readFile(g.meta.pngPath);
          g.pngDataURL = `data:image/png;base64,${buf.toString('base64')}`;
        }
        if (g.svg && !g.svgDataURL) {
          g.svgDataURL = `data:image/svg+xml;base64,${Buffer.from(String(g.svg)).toString('base64')}`;
        }
        if (!g.visual) g.visual = {};
        if (g.pngDataURL) g.visual.pngDataURL = g.pngDataURL;
        if (g.svgDataURL) g.visual.svgDataURL = g.svgDataURL;
        if ((g.pngDataURL || g.svgDataURL) && !g.emergent_assets?.visual) {
          if (!g.emergent_assets) g.emergent_assets = {};
          g.emergent_assets.visual = {
            type: g.pngDataURL ? 'png' : 'svg',
            data: g.pngDataURL || g.svgDataURL,
            path: g.meta?.pngPath || g.svgPath,
            resolution: g.meta?.resolution,
          };
        }
        // Extended light promotion for full rich completion (audio, html/story/sim/code, gltf, preview, strata)
        if (g.audioDataURL || g.wavPath) {
          if (!g.visual) g.visual = {};
          g.visual.audioDataURL = g.audioDataURL || (g.wavPath ? `/artifacts/${g.wavPath.replace(/^.*[\\\/]/, '')}` : null);
        }
        if (g.htmlData || g.storyData || g.previewData) {
          if (!g.visual) g.visual = g.visual || {};
          if (g.htmlData) g.visual.htmlData = g.htmlData;
          if (g.storyData) g.visual.storyData = g.storyData;
          if (g.previewData) g.visual.previewData = g.previewData;
        }
        if (g.gltfPath || g.mesh) {
          if (!g.visual) g.visual = {};
          g.visual.gltf = g.gltfPath || g.mesh;
        }
        if (g.strataCompliance || g.axes?.strataCompliance || g.rate?.axes?.strataCompliance) {
          const sc = g.strataCompliance || g.axes?.strataCompliance || g.rate?.axes?.strataCompliance;
          g.strataCompliance = typeof sc === 'number' ? sc : g.strataCompliance;
        }
        if (g.emergent_assets && !g.visual?.emergent) {
          // ensure top level access for renderer
        }
        // Light name normalization (Priority 2)
        const currentName = g.$name || g.name || g.display_name;
        if (!currentName || currentName === 'Untitled Seed' || currentName.length < 4 || currentName.includes(seed.$hash?.slice(0,8) || '')) {
          const nice = deriveCleanTitle(seed.$name || seed.$intent || seed.originalPrompt || currentName, seed.$hash || g.seed_hash);
          g.name = nice;
          g.$name = nice;
          g.display_name = nice;
        }
      } catch { /* best-effort light norm only; never break grow */ }

      res.json(grown);
    } catch (e: any) {
      log('ERROR', 'Grow failed', { id: seed.id, error: e.message });
      let errorMessage = 'Failed to grow seed';
      let suggestion = 'Try again or contact support if the issue persists';
      if (e.message.includes('document is not defined')) { errorMessage = 'Server configuration error - browser APIs not available'; suggestion = 'This is a server configuration issue. Please contact support.'; }
      else if (e.message.includes('generator')) { errorMessage = `Domain generator error for '${seed.$domain}'`; suggestion = `The ${seed.$domain} generator encountered an issue. Try a different seed.`; }
      const artifact: any = { id: `artifact-${seed.id}`, name: deriveCleanTitle(seed.$name || seed.$intent || seed.originalPrompt, seed.$hash), domain: seed.$domain, generation: seed.$lineage?.generation || 0, seed_hash: seed.$hash, type: seed.$domain, visual: {}, stats: {}, error: { message: errorMessage, suggestion, originalError: e.message } };
      if (seed.genes) {
        for (const [key, gene] of Object.entries(seed.genes) as [string, any][]) {
          if (gene.type === 'scalar') artifact.stats[key] = gene.value;
          else if (gene.type === 'vector' && Array.isArray(gene.value) && gene.value.length === 3) {
            const [r, g, b] = gene.value;
            if (r <= 1 && g <= 1 && b <= 1) { artifact.visual.color = `rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`; }
          }
        }
      }
      res.json(artifact);
    }
  });
}
