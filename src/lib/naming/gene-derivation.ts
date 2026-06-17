/**
 * Gene-to-Name Derivation System
 *
 * Maps seed genes to meaningful names based on their values.
 * Seeds with similar genetic traits get related names, creating
 * a semantic connection between genotype and nomenclature.
 *
 * This is a Tier 1.5 enhancement that sits between pure PoS pairing
 * and LLM naming, using actual gene values to drive name selection.
 */

// import type { Vocab } from './seed-namer';

export interface Gene {
  type: string;
  value: unknown;
}

export interface Seed {
  genes?: Record<string, Gene>;
  $domain?: string;
  $hash?: string;
}

/**
 * Gene value ranges and their name mappings.
 * Maps numeric gene values to vocabulary indices for deterministic selection.
 */
interface GeneMapping {
  gene: string;
  ranges: Array<{ min: number; max: number; adjectives: string[]; nouns: string[] }>;
}

/**
 * Domain-specific gene mappings.
 * Each domain has genes that are particularly meaningful for naming.
 */
const DOMAIN_GENE_MAPPINGS: Record<string, GeneMapping[]> = {
  character: [
    {
      gene: 'strength',
      ranges: [
        { min: 0, max: 0.3, adjectives: ['frail', 'delicate', 'gentle'], nouns: ['whisper', 'breeze', 'feather'] },
        { min: 0.3, max: 0.6, adjectives: ['balanced', 'steady', 'moderate'], nouns: ['guard', 'warden', 'keeper'] },
        { min: 0.6, max: 0.8, adjectives: ['strong', 'robust', 'sturdy'], nouns: ['warrior', 'knight', 'sentinel'] },
        { min: 0.8, max: 1.0, adjectives: ['mighty', 'powerful', 'formidable'], nouns: ['titan', 'giant', 'colossus'] }
      ]
    },
    {
      gene: 'agility',
      ranges: [
        { min: 0, max: 0.3, adjectives: ['slow', 'deliberate', 'heavy'], nouns: ['mountain', 'stone', 'anchor'] },
        { min: 0.3, max: 0.6, adjectives: ['steady', 'measured', 'calm'], nouns: ['stream', 'river', 'path'] },
        { min: 0.6, max: 0.8, adjectives: ['swift', 'quick', 'nimble'], nouns: ['wind', 'arrow', 'swift'] },
        { min: 0.8, max: 1.0, adjectives: ['lightning', 'instant', 'blazing'], nouns: ['flash', 'spark', 'bolt'] }
      ]
    },
    {
      gene: 'intelligence',
      ranges: [
        { min: 0, max: 0.3, adjectives: ['simple', 'direct', 'honest'], nouns: ['child', 'novice', 'beginner'] },
        { min: 0.3, max: 0.6, adjectives: ['thoughtful', 'considered', 'wise'], nouns: ['scholar', 'student', 'seeker'] },
        { min: 0.6, max: 0.8, adjectives: ['brilliant', 'clever', 'sharp'], nouns: ['sage', 'master', 'expert'] },
        { min: 0.8, max: 1.0, adjectives: ['genius', 'transcendent', 'luminous'], nouns: ['oracle', 'prophet', 'visionary'] }
      ]
    }
  ],
  music: [
    {
      gene: 'tempo',
      ranges: [
        { min: 0, max: 60, adjectives: ['slow', 'languid', 'drifting'], nouns: ['adagio', 'lullaby', 'nocturne'] },
        { min: 60, max: 100, adjectives: ['moderate', 'steady', 'walking'], nouns: ['andante', 'procession', 'journey'] },
        { min: 100, max: 140, adjectives: ['lively', 'energetic', 'bright'], nouns: ['allegro', 'dance', 'celebration'] },
        { min: 140, max: 200, adjectives: ['fast', 'furious', 'racing'], nouns: ['presto', 'storm', 'cascade'] }
      ]
    },
    {
      gene: 'warmth',
      ranges: [
        { min: 0, max: 0.3, adjectives: ['cold', 'icy', 'distant'], nouns: ['frost', 'winter', 'glacier'] },
        { min: 0.3, max: 0.6, adjectives: ['cool', 'calm', 'serene'], nouns: ['breeze', 'stream', 'mist'] },
        { min: 0.6, max: 0.8, adjectives: ['warm', 'gentle', 'soothing'], nouns: ['sunlight', 'ember', 'hearth'] },
        { min: 0.8, max: 1.0, adjectives: ['hot', 'blazing', 'fiery'], nouns: ['inferno', 'blaze', 'volcano'] }
      ]
    }
  ],
  world: [
    {
      gene: 'temperature',
      ranges: [
        { min: -50, max: 0, adjectives: ['frozen', 'arctic', 'glacial'], nouns: ['tundra', 'icecap', 'frost'] },
        { min: 0, max: 15, adjectives: ['cold', 'chilly', 'brisk'], nouns: ['tundra', 'taiga', 'highland'] },
        { min: 15, max: 25, adjectives: ['temperate', 'mild', 'pleasant'], nouns: ['meadow', 'valley', 'garden'] },
        { min: 25, max: 35, adjectives: ['warm', 'tropical', 'lush'], nouns: ['jungle', 'rainforest', 'paradise'] },
        { min: 35, max: 60, adjectives: ['hot', 'scorching', 'arid'], nouns: ['desert', 'wasteland', 'dunes'] }
      ]
    },
    {
      gene: 'humidity',
      ranges: [
        { min: 0, max: 30, adjectives: ['dry', 'arid', 'parched'], nouns: ['desert', 'wasteland', 'dust'] },
        { min: 30, max: 60, adjectives: ['moderate', 'balanced', 'temperate'], nouns: ['plain', 'steppe', 'grassland'] },
        { min: 60, max: 80, adjectives: ['humid', 'damp', 'moist'], nouns: ['swamp', 'marsh', 'fen'] },
        { min: 80, max: 100, adjectives: ['wet', 'saturated', 'drenched'], nouns: ['rainforest', 'deluge', 'flood'] }
      ]
    }
  ],
  visual2d: [
    {
      gene: 'complexity',
      ranges: [
        { min: 0, max: 0.3, adjectives: ['simple', 'clean', 'minimal'], nouns: ['line', 'stroke', 'dot'] },
        { min: 0.3, max: 0.6, adjectives: ['moderate', 'balanced', 'structured'], nouns: ['pattern', 'grid', 'form'] },
        { min: 0.6, max: 0.8, adjectives: ['complex', 'intricate', 'detailed'], nouns: ['mandala', 'tapestry', 'mosaic'] },
        { min: 0.8, max: 1.0, adjectives: ['chaotic', 'fractal', 'infinite'], nouns: ['kaleidoscope', 'abyss', 'infinity'] }
      ]
    },
    {
      gene: 'saturation',
      ranges: [
        { min: 0, max: 0.3, adjectives: ['muted', 'pale', 'faded'], nouns: ['dust', 'ash', 'shadow'] },
        { min: 0.3, max: 0.6, adjectives: ['subtle', 'soft', 'gentle'], nouns: ['mist', 'haze', 'cloud'] },
        { min: 0.6, max: 0.8, adjectives: ['vibrant', 'rich', 'deep'], nouns: ['sunset', 'aurora', 'spectrum'] },
        { min: 0.8, max: 1.0, adjectives: ['intense', 'blazing', 'neon'], nouns: ['fire', 'plasma', 'supernova'] }
      ]
    }
  ]
};

/**
 * Default gene mappings for domains without specific mappings.
 */
const DEFAULT_GENE_MAPPINGS: GeneMapping[] = [
  {
    gene: 'value',
    ranges: [
      { min: 0, max: 0.25, adjectives: ['low', 'minor', 'small'], nouns: ['fragment', 'shard', 'speck'] },
      { min: 0.25, max: 0.5, adjectives: ['moderate', 'medium', 'average'], nouns: ['piece', 'portion', 'segment'] },
      { min: 0.5, max: 0.75, adjectives: ['high', 'major', 'significant'], nouns: ['mass', 'bulk', 'body'] },
      { min: 0.75, max: 1.0, adjectives: ['extreme', 'maximum', 'ultimate'], nouns: ['total', 'whole', 'entirety'] }
    ]
  }
];

/**
 * Extract numeric value from a gene.
 */
function extractGeneValue(gene: Gene): number | null {
  const val = gene.value;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) return parsed;
  }
  if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'number') {
    return val[0]; // Use first element of array
  }
  if (typeof val === 'object' && val !== null) {
    // Try to find a numeric property
    for (const key of ['value', 'amount', 'level', 'intensity', 'magnitude']) {
      if (key in val) {
        const propVal = (val as Record<string, unknown>)[key];
        if (typeof propVal === 'number') return propVal;
      }
    }
  }
  return null;
}

/**
 * Find the appropriate range for a gene value.
 */
function findRangeForValue(
  mappings: GeneMapping[],
  geneName: string,
  value: number
): { adjectives: string[]; nouns: string[] } | null {
  for (const mapping of mappings) {
    if (mapping.gene === geneName) {
      for (const range of mapping.ranges) {
        if (value >= range.min && value < range.max) {
          return { adjectives: range.adjectives, nouns: range.nouns };
        }
      }
    }
  }
  return null;
}

/**
 * Generate a name from seed genes using gene-to-name mapping.
 *
 * This is deterministic: same genes → same name.
 */
export function nameFromGenes(seed: Seed): { name: string; etymology: string } | null {
  const genes = seed.genes;
  if (!genes || Object.keys(genes).length === 0) {
    return null;
  }

  const domain = seed.$domain || 'default';
  const mappings = DOMAIN_GENE_MAPPINGS[domain] || DEFAULT_GENE_MAPPINGS;

  // Find the first gene with a mappable numeric value
  for (const [geneName, gene] of Object.entries(genes)) {
    const value = extractGeneValue(gene);
    if (value === null) continue;

    const range = findRangeForValue(mappings, geneName, value);
    if (range) {
      // Use seed hash to deterministically select from the range
      const hash = seed.$hash || 'default';
      let hashNum = 0;
      for (let i = 0; i < hash.length; i++) {
        hashNum = ((hashNum << 5) + hashNum + hash.charCodeAt(i)) | 0;
      }
      const normalizedHash = Math.abs(hashNum) % 1;

      const adjIndex = Math.floor(normalizedHash * range.adjectives.length);
      const nounIndex = Math.floor((normalizedHash * 1000) % range.nouns.length);

      const adjective = range.adjectives[adjIndex];
      const noun = range.nouns[nounIndex];
      const name = `${adjective.charAt(0).toUpperCase() + adjective.slice(1)} ${noun.charAt(0).toUpperCase() + noun.slice(1)}`;

      return {
        name,
        etymology: `Derived from gene ${geneName}=${value.toFixed(2)}: ${adjective} + ${noun}`
      };
    }
  }

  return null;
}

/**
 * Enhanced Tier 1 naming that incorporates gene derivation.
 * Falls back to standard PoS pairing if gene derivation fails.
 */
export function nameTier1WithGenes(
  intent: string,
  domain: string,
  seed?: Seed
): { name: string; etymology: string; tier: number } {
  // Try gene derivation first if seed is provided
  if (seed) {
    const geneName = nameFromGenes(seed);
    if (geneName) {
      return {
        name: geneName.name,
        etymology: geneName.etymology,
        tier: 1.5
      };
    }
  }

  // Fall back to standard Tier 1 (imported from seed-namer)
  // This would need to be integrated with the existing seed-namer module
  // For now, return a placeholder
  return {
    name: 'Standard Tier 1 Name',
    etymology: 'Standard PoS pairing from vocabulary',
    tier: 1
  };
}
