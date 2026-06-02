/**
 * Seed CRUD routes: list, create, get, delete, generate.
 * Slice 8 of the modular router split.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- Server-side route uses require() for pipeline/domain-config and auth/ownership dynamic resolution. */
import type { Express } from 'express';

export interface SeedsCrudDeps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  CreateSeedSchema: any;
  GenerateSeedSchema: any;
  crypto: { randomUUID: () => string; createHash: (algo: string) => { update: (d: string | Buffer) => any; digest: (enc: string) => string } };
  GENE_TYPES: Record<string, unknown>;
  validateGene: (type: string, value: any) => boolean;
  rngFromHash: (hash: string) => any;
  deterministicSeedId: (parentHash?: string, extra?: string) => string;
  addOwnerIfAuthed: (seed: any, user: any) => void;
  log: (level: string, msg: string, meta?: any) => void;
  audit: (action: string, resource: string, resourceId?: string, details?: any, req?: any) => void;
  metrics: { seedsCreated: number };
  IntelligenceLayer: { generateEmbedding: (seed: any) => Promise<any> };
}

export function registerSeedsCrudRoutes(app: Express, deps: SeedsCrudDeps): void {
  const { seeds, saveSeeds, optionalAuth, validateBody, CreateSeedSchema, crypto, GENE_TYPES, validateGene, rngFromHash, deterministicSeedId, addOwnerIfAuthed, log, audit, metrics, IntelligenceLayer } = deps;

  app.get('/api/seeds', optionalAuth, (req: any, res: any) => {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
    const domain = req.query.domain as string | undefined;
    const sort = (req.query.sort as string) || 'created';

    let filtered = [...seeds];
    if (domain) {
      filtered = filtered.filter((s: any) => s.$domain === domain);
    }
    if (sort === 'fitness') {
      filtered.sort((a: any, b: any) => (b.$fitness?.overall || 0) - (a.$fitness?.overall || 0));
    } else if (sort === 'domain') {
      filtered.sort((a: any, b: any) => (a.$domain || '').localeCompare(b.$domain || ''));
    }
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const items = filtered.slice(offset, offset + limit);
    res.json({
      seeds: items,
      pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    });
  });

  app.post('/api/seeds', optionalAuth, validateBody(CreateSeedSchema), (req: any, res: any) => {
    const domain = req.body.domain || 'character';
    let genes = req.body.genes || {};
    if (Object.keys(genes).length === 0) {
      try {
        const { getDomainConfig } = require('../../lib/kernel/pipeline/domain-config');
        const cfg = getDomainConfig?.(domain);
        if (cfg?.defaultGenes && typeof cfg.defaultGenes === 'object') {
          genes = { ...cfg.defaultGenes };
        }
      } catch { /* swallow: best-effort CRUD cleanup, db is closed */ }
    }
    if (Object.keys(genes).length === 0) {
      const promptText = String(req.body.name || '').toLowerCase();
      const rngLocal = rngFromHash(crypto.createHash('sha256').update(`${domain}:${promptText}`).digest('hex'));
      genes = {
        intent:    { type: 'categorical', value: promptText.split(/\s+/).filter(Boolean).slice(0, 4).join('-') || 'genesis' },
        archetype: { type: 'categorical', value: promptText.match(/\b(warrior|samurai|wizard|robot|priest|hunter|scholar|trader|child|elder|king|queen)\b/)?.[1] ?? 'unspecified' },
        mood:      { type: 'categorical', value: promptText.match(/\b(fierce|gentle|melancholy|joyful|chaotic|serene|ominous|hopeful|cozy|cold)\b/)?.[1] ?? 'neutral' },
        biome:     { type: 'categorical', value: promptText.match(/\b(desert|ocean|forest|tundra|city|jungle|mountain|cyberpunk|underwater|space)\b/)?.[1] ?? 'unspecified' },
        density:   { type: 'scalar', value: Math.round(rngLocal.nextF64() * 10000) / 10000 },
        scale:     { type: 'scalar', value: Math.round((0.5 + rngLocal.nextF64() * 1.5) * 10000) / 10000 },
        hue:       { type: 'scalar', value: Math.round(rngLocal.nextF64() * 360 * 100) / 100 },
        saturation:{ type: 'scalar', value: Math.round(rngLocal.nextF64() * 10000) / 10000 },
        complexity:{ type: 'scalar', value: Math.round(rngLocal.nextF64() * 10000) / 10000 },
        rhythm:    { type: 'scalar', value: Math.round((0.2 + rngLocal.nextF64() * 0.8) * 10000) / 10000 },
        symmetry:  { type: 'scalar', value: Math.round(rngLocal.nextF64() * 10000) / 10000 },
        palette:   { type: 'categorical', value: ['monochrome', 'analogous', 'complementary', 'triadic', 'split-complementary'][Math.floor(rngLocal.nextF64() * 5)] },
      };
    }
    const seedHash = crypto.createHash('sha256').update(JSON.stringify({ domain, genes })).digest('hex');
    const rng = rngFromHash(seedHash);
    for (const [name, gene] of Object.entries(genes) as [string, any][]) {
      if (gene.type && GENE_TYPES[gene.type]) {
        const valid = validateGene(gene.type, gene.value);
        if (!valid) {
          log('WARN', `Invalid gene ${name} of type ${gene.type}`, { value: gene.value });
        }
      }
    }
    const newSeed: any = {
      id: deterministicSeedId(seedHash),
      $domain: domain,
      $name: req.body.name || 'Untitled Seed',
      $lineage: { generation: 1, operation: 'primordial', timestamp: 0 },
      $hash: seedHash,
      $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
      genes,
    };
    addOwnerIfAuthed(newSeed, req.user);
    seeds.push(newSeed);
    saveSeeds();
    metrics.seedsCreated++;
    log('INFO', 'Seed created', { id: newSeed.id, domain, owner: newSeed.$owner?.userId ?? null });
    audit('seed.create', 'seed', newSeed.id, { domain, owner: newSeed.$owner?.userId ?? null }, req);
    res.json(newSeed);
  });

  app.get('/api/seeds/:id', (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (seed) res.json(seed);
    else res.status(404).json({ detail: 'Not found' });
  });

  app.delete('/api/seeds/:id', optionalAuth, (req: any, res: any) => {
    const idx = seeds.findIndex((s: any) => s.id === req.params.id);
    if (idx === -1) return res.status(404).json({ detail: 'Not found' });
    const seed = seeds[idx];
    const { authorizeSeedMutation } = require('../../lib/auth/ownership');
    if (!authorizeSeedMutation(seed, req, res, 'seed.delete', audit)) return;
    const deletedId = seed.id;
    seeds.splice(idx, 1);
    saveSeeds();
    audit('seed.delete', 'seed', deletedId, {}, req);
    res.json({ deleted: true });
  });
}

export function registerSeedsGenerateRoutes(app: Express, deps: SeedsCrudDeps): void {
  const { seeds, saveSeeds, optionalAuth, validateBody, GenerateSeedSchema, crypto, rngFromHash, log, metrics: _metrics, IntelligenceLayer: _IntelligenceLayer } = deps;

  app.post('/api/seeds/generate', optionalAuth, validateBody(GenerateSeedSchema), (req: any, res: any) => {
    const promptStr = req.body.prompt || 'random';
    const domain = req.body.domain || 'character';
    const promptHash = crypto.createHash('sha256').update(promptStr).digest('hex');
    const rng = rngFromHash(promptHash);
    const genes: Record<string, any> = {};
    const baseGenes: [string, string, () => any][] = [
      ['core_power', 'scalar', () => rng.nextF64()],
      ['stability', 'scalar', () => rng.nextF64()],
      ['complexity', 'scalar', () => rng.nextF64()],
      ['theme_color', 'vector', () => [rng.nextF64(), rng.nextF64(), rng.nextF64()]],
    ];
    const domainGenes: Record<string, [string, string, () => any][]> = {
      character: [
        ['archetype', 'categorical', () => rng.nextChoice(['warrior', 'mage', 'rogue', 'paladin', 'ranger', 'dark_knight', 'bard'])],
        ['strength', 'scalar', () => rng.nextF64()],
        ['agility', 'scalar', () => rng.nextF64()],
        ['intelligence', 'scalar', () => rng.nextF64()],
        ['size', 'scalar', () => 0.3 + rng.nextF64() * 0.7],
        ['palette', 'vector', () => [rng.nextF64(), rng.nextF64(), rng.nextF64()]],
      ],
      music: [
        ['tempo', 'scalar', () => 0.3 + rng.nextF64() * 0.5],
        ['key', 'categorical', () => rng.nextChoice(['C', 'D', 'E', 'F', 'G', 'A', 'B'])],
        ['scale', 'categorical', () => rng.nextChoice(['major', 'minor', 'dorian', 'pentatonic', 'blues', 'mixolydian'])],
        ['melody', 'array', () => Array.from({ length: 8 }, () => 48 + rng.nextInt(0, 36))],
      ],
      sprite: [
        ['resolution', 'scalar', () => 0.2 + rng.nextF64() * 0.6],
        ['paletteSize', 'scalar', () => rng.nextF64()],
        ['colors', 'vector', () => [rng.nextF64(), rng.nextF64(), rng.nextF64()]],
        ['symmetry', 'categorical', () => rng.nextChoice(['bilateral', 'radial', 'none', 'quad'])],
      ],
      procedural: [
        ['biome', 'categorical', () => rng.nextChoice(['temperate', 'desert', 'arctic', 'tropical', 'volcanic', 'oceanic'])],
        ['density', 'scalar', () => rng.nextF64()],
        ['scale_factor', 'scalar', () => rng.nextF64()],
      ],
    };
    for (const [name, type, gen] of baseGenes) {
      genes[name] = { type, value: gen() };
    }
    if (domainGenes[domain]) {
      for (const [name, type, gen] of domainGenes[domain]) {
        genes[name] = { type, value: gen() };
      }
    }
    const newSeed: any = {
      id: crypto.randomUUID(),
      $domain: domain,
      $name: `${promptStr.substring(0, 40)}`,
      $lineage: { generation: 1, operation: 'generate' },
      $hash: crypto.createHash('sha256').update(JSON.stringify(genes)).digest('hex'),
      $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
      genes,
    };
    try {
      _IntelligenceLayer.generateEmbedding(newSeed).then((emb: any) => {
        newSeed.$embedding = emb;
        saveSeeds();
      }).catch(() => {});
    } catch (_) { /* swallow: best-effort persist fire-and-forget */ }
    seeds.push(newSeed);
    saveSeeds();
    log('INFO', 'Seed generated', { id: newSeed.id, domain, prompt: promptStr.substring(0, 50) });
    res.json(newSeed);
  });
}
