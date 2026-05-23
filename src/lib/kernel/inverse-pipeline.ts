import crypto from 'crypto';
import { Xoshiro256StarStar, rngFromHash } from './rng';
import { growSeed } from './engines';
import { DOMAIN_ALIASES, resolveDomain } from './domain-constants';
import { GENE_TYPES, mutateGene } from './gene_system';

// ─── INPUT TYPES ───────────────────────────────────────────────────────────

export interface InverseInput {
  /** Raw media data (base64-encoded image, audio bytes, etc.) */
  data?: string;
  /** Media type hint */
  mimeType?: string;
  /** Text description of the desired artifact */
  description?: string;
  /** Optional target domain */
  domain?: string;
  /** Optional reference seed hash to start from */
  referenceSeedHash?: string;
}

export interface InverseResult {
  seed: any;
  confidence: number;
  domain: string;
  iterations: number;
  artifact: any;
}

// ─── DOMAIN DETECTION ──────────────────────────────────────────────────────

const MIME_TO_DOMAIN: Record<string, string> = {
  'image/png': 'visual2d',
  'image/jpeg': 'visual2d',
  'image/webp': 'visual2d',
  'image/gif': 'sprite',
  'image/svg+xml': 'visual2d',
  'audio/wav': 'music',
  'audio/mpeg': 'music',
  'audio/ogg': 'audio',
  'audio/midi': 'music',
  'model/gltf+json': 'geometry3d',
  'model/gltf-binary': 'geometry3d',
  'model/obj': 'geometry3d',
  'text/plain': 'narrative',
  // Phase 1+2 new domains
  'text/html': 'website',
  'chemical/x-pdb': 'molecule',
  'chemical/x-mdl-molfile': 'molecule',
  'application/zip': 'app',
  'application/json': 'agent',
};

const DESCRIPTION_PATTERNS: { pattern: RegExp; domain: string }[] = [
  // ... existing patterns ...
  { pattern: /character|person|warrior|mage|rogue|hero|villain|npc|avatar/i, domain: 'character' },
  { pattern: /sprite|pixel|2d character|icon|spritesheet/i, domain: 'sprite' },
  { pattern: /music|song|melody|beat|rhythm|orchestra|piano|guitar|symphony|track/i, domain: 'music' },
  { pattern: /image|art|painting|drawing|illustration|generative art/i, domain: 'visual2d' },
  { pattern: /3d|mesh|model|geometry|sculpture|object/i, domain: 'geometry3d' },
  { pattern: /game|level|platformer|rpg|puzzle|shooter|fullgame/i, domain: 'fullgame' },
  { pattern: /animation|motion|keyframe|skeletal|character animation/i, domain: 'animation' },
  { pattern: /story|narrative|tale|plot|fiction|novel|script/i, domain: 'narrative' },
  { pattern: /\bui\b|interface|button|layout|screen|hud|dashboard(?!.*app)/i, domain: 'ui' },
  { pattern: /physics|simulation|force|gravity|collision|rigidbody/i, domain: 'physics' },
  { pattern: /sound|sfx|effect|noise|ambient|foley|explosion/i, domain: 'audio' },
  { pattern: /particle|fire|smoke|magic|spark|explosion.*vfx|trail/i, domain: 'particle' },
  { pattern: /shader|glsl|material|texture|lighting|render|pbr/i, domain: 'shader' },
  { pattern: /architecture|building|house|tower|structure/i, domain: 'architecture' },
  { pattern: /vehicle|car|ship|plane|spaceship|boat|train|bike/i, domain: 'vehicle' },
  { pattern: /furniture|chair|table|bed|shelf|cabinet|desk/i, domain: 'furniture' },
  { pattern: /fashion|clothing|dress|shirt|jacket|outfit|garment/i, domain: 'fashion' },
  { pattern: /food|recipe|dish|meal|cooking|cuisine|ingredient/i, domain: 'food' },
  { pattern: /circuit|electronics|pcb|schematic|component|board/i, domain: 'circuit' },
  { pattern: /alife|life|creature|organism|cellular|automata/i, domain: 'alife' },
  { pattern: /typography|font|typeface|text|letter|glyph|type/i, domain: 'typography' },
  // Phase 1+2 sovereign domains
  { pattern: /website|landing.page|homepage|web.presence|site|portfolio.site|brand.site/i, domain: 'website' },
  { pattern: /electromagnetic|electric.field|magnetic.field|fdtd|em.wave|maxwell|antenna|dipole/i, domain: 'field' },
  { pattern: /quantum|wavefunction|schr.dinger|probability.density|superposition|tunneling|orbital/i, domain: 'quantum' },
  { pattern: /molecule|molecular|chemistry|compound|smiles|atom|bond|protein|peptide|drug/i, domain: 'molecule' },
  { pattern: /cosmology|universe|galaxy|n.body|orbital.mechanics|star.formation|dark.matter|black.hole/i, domain: 'cosmology' },
  { pattern: /world.map|terrain.map|heightmap|biome|continent|tectonic|kingdom|topographic/i, domain: 'world' },
  { pattern: /\bapp\b|application|react.app|web.app|mobile.app|dashboard.app|full.stack/i, domain: 'app' },
  { pattern: /ecosystem|biome|terrain|nature|forest|ocean|planet/i, domain: 'ecosystem' },
];

export function detectDomain(input: InverseInput): string {
  if (input.domain) {
    const resolved = resolveDomain(input.domain);
    if (resolved) return resolved;
  }
  if (input.mimeType && MIME_TO_DOMAIN[input.mimeType]) {
    return MIME_TO_DOMAIN[input.mimeType];
  }
  if (input.description) {
    for (const { pattern, domain } of DESCRIPTION_PATTERNS) {
      if (pattern.test(input.description)) return domain;
    }
  }
  return 'visual2d';
}

// ─── GENE INFERENCE ─────────────────────────────────────────────────────

const TOTAL_GENE_COUNT = 17;
const GENE_NAMES_BY_DOMAIN: Record<string, string[]> = {
  character: ['archetype', 'strength', 'agility', 'intelligence', 'size', 'palette'],
  music: ['tempo', 'key', 'scale', 'melody', 'harmony', 'timbre'],
  sprite: ['resolution', 'paletteSize', 'colors', 'symmetry', 'frameCount'],
  visual2d: ['style', 'complexity', 'colorPalette', 'composition', 'brush'],
  procedural: ['biome', 'density', 'scale', 'seed', 'octaves'],
  fullgame: ['genre', 'difficulty', 'levelCount', 'mechanic', 'theme'],
  geometry3d: ['primitive', 'subdivision', 'symmetry', 'scale', 'detail'],
  narrative: ['genre', 'tone', 'length', 'characterCount', 'structure'],
  ui: ['theme', 'layout', 'spacing', 'radius', 'typography'],
  physics: ['gravity', 'friction', 'elasticity', 'bodyCount', 'integrator'],
  audio: ['waveform', 'frequency', 'attack', 'decay', 'filter'],
  ecosystem: ['species', 'trophic', 'size', 'climate', 'interaction'],
  animation: ['frames', 'fps', 'easing', 'amplitude', 'loop'],
  agent: ['persona', 'temperature', 'reasoning', 'memory', 'tools'],
  shader: ['technique', 'iterations', 'epsilon', 'noise'],
  particle: ['emitter', 'rate', 'lifetime', 'velocity', 'gravity'],
  typography: ['weight', 'width', 'xheight', 'contrast', 'serif'],
  architecture: ['style', 'floors', 'height', 'windows', 'roof'],
  vehicle: ['type', 'speed', 'mass', 'range', 'propulsion'],
  furniture: ['type', 'style', 'material', 'dimensions', 'ergonomics'],
  fashion: ['type', 'fabric', 'silhouette', 'season', 'color'],
  robotics: ['type', 'dof', 'payload', 'battery', 'sensors'],
  circuit: ['type', 'components', 'power', 'frequency', 'layers'],
  food: ['cuisine', 'spice', 'prepTime', 'cookTime', 'ingredients'],
  choreography: ['style', 'tempo', 'complexity', 'duration', 'formation'],
  alife: ['species', 'rules', 'gridSize', 'generations', 'interaction'],
};

export interface InferredGene {
  name: string;
  type: string;
  value: any;
  confidence: number;
}

function inferGenesFromDescription(
  description: string,
  domain: string,
  rng: Xoshiro256StarStar,
): InferredGene[] {
  const genes: InferredGene[] = [];
  const geneNames = GENE_NAMES_BY_DOMAIN[domain] || ['complexity', 'color', 'style'];

  const desc = description.toLowerCase();

  for (const name of geneNames) {
    let value: any = rng.nextF64();
    let type = 'scalar';
    let confidence = 0.3;

    if (name === 'archetype') {
      type = 'categorical';
      const archetypes = ['warrior', 'mage', 'rogue', 'paladin', 'ranger', 'bard', 'dark_knight'];
      const matched = archetypes.find(a => desc.includes(a));
      value = matched || rng.nextChoice(archetypes);
      confidence = matched ? 0.8 : 0.3;
    } else if (name === 'genre' || name === 'style') {
      type = 'categorical';
      const options = ['fantasy', 'sci-fi', 'horror', 'comedy', 'drama', 'action', 'adventure'];
      const matched = options.find(o => desc.includes(o));
      value = matched || rng.nextChoice(options);
      confidence = matched ? 0.8 : 0.3;
    } else if (name === 'key') {
      type = 'categorical';
      const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      value = rng.nextChoice(keys);
    } else if (name === 'scale') {
      type = 'categorical';
      const scales = ['major', 'minor', 'pentatonic', 'blues', 'dorian'];
      const matched = scales.find(s => desc.includes(s));
      value = matched || rng.nextChoice(scales);
      confidence = matched ? 0.7 : 0.3;
    } else if (name === 'palette' || name === 'colors' || name === 'colorPalette') {
      type = 'vector';
      value = [rng.nextF64(), rng.nextF64(), rng.nextF64()];
    } else if (name === 'melody') {
      type = 'array';
      value = Array.from({ length: 8 }, () => 48 + rng.nextInt(0, 36));
    } else if (name === 'tempo') {
      value = 0.3 + rng.nextF64() * 0.5;
      confidence = desc.includes('fast') ? 0.7 : desc.includes('slow') ? 0.7 : 0.3;
      if (desc.includes('fast')) value = 0.8 + rng.nextF64() * 0.2;
      if (desc.includes('slow')) value = 0.1 + rng.nextF64() * 0.3;
    } else if (name === 'complexity' || name === 'detail') {
      confidence = desc.includes('simple') ? 0.6 : desc.includes('complex') ? 0.6 : 0.3;
      if (desc.includes('simple')) value = 0.1 + rng.nextF64() * 0.2;
      if (desc.includes('complex')) value = 0.7 + rng.nextF64() * 0.3;
    } else if (name === 'resolution' || name === 'size') {
      if (desc.includes('large') || desc.includes('big') || desc.includes('hd')) value = 0.8;
      else if (desc.includes('small') || desc.includes('tiny')) value = 0.2;
    }

    genes.push({ name, type, value, confidence });
  }

  return genes;
}

// ─── MAIN INVERSE ENTRY POINT ───────────────────────────────────────────

/**
 * Take an artifact or description and produce a seed that would grow into it.
 * This is the "cloning engine" — reverses the grow pipeline.
 */
export async function inversePipeline(input: InverseInput): Promise<InverseResult> {
  const domain = detectDomain(input);
  const phrase = input.description || 'inverse-generated';
  const seedKey = `${domain}:${phrase}:${input.mimeType || ''}:${input.referenceSeedHash || ''}`;
  const rng = rngFromHash(crypto.createHash('sha256').update(seedKey).digest('hex'));

  const inferredGenes = inferGenesFromDescription(phrase, domain, rng);

  // Build gene map
  const genes: Record<string, any> = {};
  for (const g of inferredGenes) {
    genes[g.name] = { type: g.type, value: g.value };
  }

  // Add baseline genes
  const baselineGenes: [string, string, () => any][] = [
    ['core_power', 'scalar', () => rng.nextF64()],
    ['stability', 'scalar', () => rng.nextF64()],
    ['complexity', 'scalar', () => rng.nextF64()],
    ['theme_color', 'vector', () => [rng.nextF64(), rng.nextF64(), rng.nextF64()]],
  ];
  for (const [name, type, gen] of baselineGenes) {
    if (!genes[name]) genes[name] = { type, value: gen() };
  }

  // Build seed
  const seedHash = crypto.createHash('sha256').update(JSON.stringify(genes)).digest('hex');
  const seed = {
    id: `inverse-${seedHash.slice(0, 12)}`,
    $domain: domain,
    $name: phrase.substring(0, 40),
    $lineage: { generation: 1, operation: 'inverse_pipeline' },
    $hash: seedHash,
    $fitness: { overall: 0.3 + rng.nextF64() * 0.4 },
    $description: phrase,
    genes,
  };

  // Growth attempt
  let artifact: any = null;
  let iterations = 0;
  let confidence = 0.5;

  try {
    artifact = await growSeed(seed);
    iterations = 1;

    // Iterative refinement: mutate toward better quality
    if (artifact && !artifact.render_hints?.error) {
      for (let i = 0; i < 2; i++) {
        const refinedId = `inverse-${crypto.createHash('sha256').update(seedHash + String(i)).digest('hex').slice(0, 12)}`;
        const refined = { ...seed, id: refinedId };
        const newGenes: Record<string, any> = {};

        for (const [key, gene] of Object.entries(genes)) {
          if (gene.type && GENE_TYPES[gene.type] && rng.nextF64() < 0.2) {
            newGenes[key] = {
              type: gene.type,
              value: mutateGene(gene.type, gene.value, 0.1, rng),
            };
          } else {
            newGenes[key] = { ...gene };
          }
        }

        refined.$hash = crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex');
        (refined as any).genes = newGenes;

        try {
          const newArtifact = await growSeed(refined as any);
          if (newArtifact && !newArtifact.render_hints?.error) {
            artifact = newArtifact;
            Object.assign(seed, refined);
            iterations++;
            confidence = Math.min(1, confidence + 0.15);
          }
        } catch {}
      }
    }

    if (artifact && !artifact.render_hints?.error) {
      confidence = Math.min(1, 0.5 + iterations * 0.15);
    }
  } catch {}

  return {
    seed,
    confidence,
    domain,
    iterations,
    artifact,
  };
}

// ─── API RESPONSE HELPER ─────────────────────────────────────────────────

export function formatInverseResult(result: InverseResult): any {
  return {
    seed: {
      id: result.seed.id,
      domain: result.domain,
      name: result.seed.$name,
      hash: result.seed.$hash,
      geneCount: Object.keys(result.seed.genes || {}).length,
    },
    confidence: +result.confidence.toFixed(2),
    domain: result.domain,
    iterations: result.iterations,
    artifact: result.artifact
      ? {
          type: result.artifact.type,
          generation_quality: result.artifact.generation_quality,
          render_hints: result.artifact.render_hints,
        }
      : null,
  };
}
