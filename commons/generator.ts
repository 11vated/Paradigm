import { UniversalSeed, GeneType, GeneValue } from '../seeds';

export interface SeedTemplate {
  id: string;
  name: string;
  domain: string;
  genes: Record<string, GeneValue>;
  description: string;
  tags: string[];
  author?: string;
  created: number;
}

const COLOR_PALETTES = [
  ['#ff0000', '#00ff00', '#0000ff'],
  ['#ff6b6b', '#4ecdc4', '#45b7d1'],
  ['#a855f7', '#ec4899', '#f43f5e'],
  ['#06b6d4', '#8b5cf6', '#10b981'],
  ['#f59e0b', '#ef4444', '#6366f1'],
  ['#3b82f6', '#22c55e', '#eab308'],
  ['#14b8a6', '#f97316', '#8b5cf6'],
  ['#0ea5e9', '#d946ef', '#f43f5e']
];

const SHAPES = ['circle', 'square', 'triangle', 'polygon', 'organic', 'custom'];
const TEXTURES = ['smooth', 'rough', 'metallic', 'fabric', 'organic', 'custom'];
const MOTION_PATTERNS = [
  { velocity: 1, acceleration: 0.5, path: 'linear' },
  { velocity: 0.5, acceleration: 1, path: 'ease-in' },
  { velocity: 0.8, acceleration: 0.8, path: 'ease-out' },
  { velocity: 0.3, acceleration: 1.5, path: 'bounce' },
  { velocity: 1, acceleration: 0.2, path: 'oscillate' }
];

const AUDIO_PATTERNS = [
  { volume: 0.8, frequency: 440, tempo: 120 },
  { volume: 1, frequency: 880, tempo: 140 },
  { volume: 0.5, frequency: 220, tempo: 80 },
  { volume: 0.6, frequency: 550, tempo: 100 }
];

const PHYSICS_PROPS = [
  { mass: 1, gravity: 9.8, friction: 0.5, bounce: 0.5 },
  { mass: 0.5, gravity: 9.8, friction: 0.3, bounce: 0.8 },
  { mass: 2, gravity: 9.8, friction: 0.7, bounce: 0.2 },
  { mass: 1.5, gravity: 3.7, friction: 0.4, bounce: 0.6 }
];

const BEHAVIOR_CONFIGS = [
  { stateMachine: ['idle', 'walk', 'run'], goals: ['survive'], reactions: ['attack', 'flee'] },
  { stateMachine: ['patrol', 'chase', 'attack'], goals: ['defend'], reactions: ['pursue', 'retreat'] },
  { stateMachine: ['wait', 'approach', 'interact'], goals: ['explore'], reactions: ['inspect', 'ignore'] }
];

const ANIMATION_KEYFRAMES = [
  { keyframes: 10, duration: 1, loop: true, easing: 'linear' },
  { keyframes: 24, duration: 2, loop: true, easing: 'ease-in-out' },
  { keyframes: 60, duration: 5, loop: false, easing: 'cubic-bezier' }
];

const LIGHTING_SETUPS = [
  { ambient: 0.3, directional: 0.7, shadows: false, color: '#ffffff' },
  { ambient: 0.5, directional: 0.5, shadows: true, color: '#ffcc00' },
  { ambient: 0.2, directional: 0.8, shadows: true, color: '#ffffff' },
  { ambient: 0.4, directional: 0.6, shadows: false, color: '#ffe4b5' }
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

export class SeedGenerator {
  private rng: () => number;
  private generated: number = 0;

  constructor(seed: number = Date.now()) {
    this.rng = seededRandom(seed);
  }

  private pick<T>(array: T[]): T {
    return array[Math.floor(this.rng() * array.length)];
  }

  private nextId(): string {
    this.generated++;
    return `seed_${this.generated.toString().padStart(5, '0')}`;
  }

  generate(template: Partial<SeedTemplate> & { domain: string }): UniversalSeed {
    const seed = new UniversalSeed();
    const now = Date.now();

    seed.setMetadata('id', this.nextId());
    seed.setMetadata('name', template.name || `${template.domain}-${this.generated}`);
    seed.setMetadata('description', template.description || '');
    seed.setMetadata('tags', template.tags || []);
    seed.setMetadata('created', template.created || now);
    seed.setMetadata('author', template.author || 'Paradigm Commons');
    seed.setMetadata('domain', template.domain);

    seed.setGene(GeneType.COLOR, template.genes?.color ?? this.pick(COLOR_PALETTES));
    seed.setGene(GeneType.SHAPE, template.genes?.shape ?? this.pick(SHAPES));
    seed.setGene(GeneType.TEXTURE, template.genes?.texture ?? this.pick(TEXTURES));
    seed.setGene(GeneType.MOTION, template.genes?.motion ?? this.pick(MOTION_PATTERNS));
    seed.setGene(GeneType.AUDIO, template.genes?.audio ?? this.pick(AUDIO_PATTERNS));
    seed.setGene(GeneType.PHYSICS, template.genes?.physics ?? this.pick(PHYSICS_PROPS));
    seed.setGene(GeneType.BEHAVIOR, template.genes?.behavior ?? this.pick(BEHAVIOR_CONFIGS));
    seed.setGene(GeneType.ANIMATION, template.genes?.animation ?? this.pick(ANIMATION_KEYFRAMES));
    seed.setGene(GeneType.LIGHTING, template.genes?.lighting ?? this.pick(LIGHTING_SETUPS));

    return seed;
  }

  generateBatch(domain: string, count: number): UniversalSeed[] {
    const seeds: UniversalSeed[] = [];
    for (let i = 0; i < count; i++) {
      seeds.push(this.generate({ domain }));
    }
    return seeds;
  }

  generateAll(): UniversalSeed[] {
    const domains = [
      'game', 'music', 'art', 'animation', 'simulation',
      'ui', 'physics', 'audio', 'visualization', 'character'
    ];

    const seeds: UniversalSeed[] = [];
    for (const domain of domains) {
      seeds.push(...this.generateBatch(domain, 100));
    }
    return seeds;
  }

  exportToJSON(seeds: UniversalSeed[]): string {
    return JSON.stringify(seeds.map(s => s.serialize()), null, 2);
  }

  exportManifest(seeds: UniversalSeed[]): object {
    return {
      version: '1.0.0',
      totalSeeds: seeds.length,
      domains: this.getDomainCounts(seeds),
      generated: Date.now(),
      checksum: hashString(this.exportToJSON(seeds)).toString(16)
    };
  }

  private getDomainCounts(seeds: UniversalSeed[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const seed of seeds) {
      const domain = seed.getMetadata().domain as string || 'unknown';
      counts[domain] = (counts[domain] || 0) + 1;
    }
    return counts;
  }
}

export async function generateSeedCommons(outputPath: string, targetCount: number = 1000): Promise<{ seeds: UniversalSeed[]; manifest: object }> {
  const generator = new SeedGenerator();
  const seeds = generator.generateAll().slice(0, targetCount);
  const manifest = generator.exportManifest(seeds);

  return { seeds, manifest };
}