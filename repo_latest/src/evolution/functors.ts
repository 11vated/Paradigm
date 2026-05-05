import { UniversalSeed, GeneType, GeneValue } from '../seeds';

export interface FunctorBridge {
  name: string;
  domain: string;
  encode: (seed: UniversalSeed) => number[];
  decode: (vector: number[]) => UniversalSeed;
  mate: (parentA: UniversalSeed, parentB: UniversalSeed) => UniversalSeed[];
}

export class GameFunctor implements FunctorBridge {
  name = 'game';
  domain = 'game';

  encode(seed: UniversalSeed): number[] {
    const vector: number[] = [];
    const genes: GeneType[] = [
      GeneType.STRUCTURE, GeneType.MOTION, GeneType.PHYSICS,
      GeneType.COLOR, GeneType.TEXTURE, GeneType.BEHAVIOR, GeneType.ANIMATION
    ];

    for (const geneType of genes) {
      const gene = seed.getGene(geneType);
      vector.push(this.encodeGene(gene?.value));
    }

    return vector;
  }

  private encodeGene(value: GeneValue | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return hashString(value);
    if (Array.isArray(value)) return value.length;
    if (typeof value === 'object' && value !== null) return Object.keys(value).length;
    return 0;
  }

  decode(vector: number[]): UniversalSeed {
    const seed = new UniversalSeed();

    const geneTypes: GeneType[] = [
      GeneType.STRUCTURE, GeneType.MOTION, GeneType.PHYSICS,
      GeneType.COLOR, GeneType.TEXTURE, GeneType.BEHAVIOR, GeneType.ANIMATION
    ];

    for (let i = 0; i < geneTypes.length && i < vector.length; i++) {
      seed.setGene(geneTypes[i], vector[i]);
    }

    return seed;
  }

  mate(parentA: UniversalSeed, parentB: UniversalSeed): UniversalSeed[] {
    const childA = parentA.cross(parentB, { nextFloat: Math.random });
    const childB = parentB.cross(parentA, { nextFloat: Math.random });
    return [childA, childB];
  }
}

export class MusicFunctor implements FunctorBridge {
  name = 'music';
  domain = 'music';

  encode(seed: UniversalSeed): number[] {
    const audio = seed.getGeneValue(GeneType.AUDIO);
    const motion = seed.getGeneValue(GeneType.MOTION);

    return [
      extractNumber(audio, 'volume', 1) * 127,
      extractNumber(audio, 'frequency', 440),
      extractNumber(motion, 'velocity', 120) * 10,
      extractNumber(motion, 'acceleration', 0) * 10
    ];
  }

  decode(vector: number[]): UniversalSeed {
    const seed = new UniversalSeed();
    seed.setGene(GeneType.AUDIO, {
      volume: vector[0] / 127,
      frequency: vector[1],
      tempo: vector[2] / 10
    });
    seed.setGene(GeneType.MOTION, {
      velocity: vector[2] / 10,
      acceleration: vector[3] / 10,
      path: []
    });
    return seed;
  }

  mate(parentA: UniversalSeed, parentB: UniversalSeed): UniversalSeed[] {
    return [
      parentA.cross(parentB, { nextFloat: Math.random }),
      parentB.cross(parentA, { nextFloat: Math.random })
    ];
  }
}

export class ArtFunctor implements FunctorBridge {
  name = 'art';
  domain = 'art';

  encode(seed: UniversalSeed): number[] {
    return [
      extractNumber(seed.getGeneValue(GeneType.COLOR), 'r', 0),
      extractNumber(seed.getGeneValue(GeneType.SHAPE), 'type', 0),
      extractNumber(seed.getGeneValue(GeneType.TEXTURE), 'type', 0),
      extractNumber(seed.getGeneValue(GeneType.MATERIAL), 'roughness', 0.5),
      extractNumber(seed.getGeneValue(GeneType.LIGHTING), 'ambient', 0.3)
    ];
  }

  decode(vector: number[]): UniversalSeed {
    const seed = new UniversalSeed();
    seed.setGene(GeneType.COLOR, vector.slice(0, 5));
    seed.setGene(GeneType.SHAPE, ['circle', 'square', 'triangle'][Math.floor(vector[1] % 3)]);
    seed.setGene(GeneType.TEXTURE, ['smooth', 'rough', 'metallic'][Math.floor(vector[2] % 3)]);
    seed.setGene(GeneType.MATERIAL, { roughness: vector[3], metalness: vector[3] * 0.5 });
    seed.setGene(GeneType.LIGHTING, { ambient: vector[4], directional: 1 - vector[4] });
    return seed;
  }

  mate(parentA: UniversalSeed, parentB: UniversalSeed): UniversalSeed[] {
    return [
      parentA.cross(parentB, { nextFloat: Math.random }),
      parentB.cross(parentA, { nextFloat: Math.random })
    ];
  }
}

export class StorytellingFunctor implements FunctorBridge {
  name = 'story';
  domain = 'narrative';

  encode(seed: UniversalSeed): number[] {
    const behavior = seed.getGeneValue(GeneType.BEHAVIOR);
    const logic = seed.getGeneValue(GeneType.LOGIC);

    return [
      extractNumber(behavior, 'stateCount', 3),
      extractNumber(behavior, 'goalCount', 1),
      extractNumber(logic, 'conditionCount', 2),
      extractNumber(logic, 'actionCount', 4)
    ];
  }

  decode(vector: number[]): UniversalSeed {
    const seed = new UniversalSeed();
    seed.setGene(GeneType.BEHAVIOR, {
      stateMachine: Array(Math.floor(vector[0])).fill(0).map((_, i) => `state_${i}`),
      goals: Array(Math.floor(vector[1])).fill(0).map((_, i) => `goal_${i}`),
      reactions: []
    });
    seed.setGene(GeneType.LOGIC, {
      conditions: Array(Math.floor(vector[2])).fill('true'),
      actions: Array(Math.floor(vector[3])).fill('pass')
    });
    return seed;
  }

  mate(parentA: UniversalSeed, parentB: UniversalSeed): UniversalSeed[] {
    return [
      parentA.cross(parentB, { nextFloat: Math.random }),
      parentB.cross(parentA, { nextFloat: Math.random })
    ];
  }
}

export class FunctorRegistry {
  private functors: Map<string, FunctorBridge> = new Map();

  constructor() {
    this.register(new GameFunctor());
    this.register(new MusicFunctor());
    this.register(new ArtFunctor());
    this.register(new StorytellingFunctor());
  }

  register(functor: FunctorBridge): void {
    this.functors.set(functor.name, functor);
  }

  get(name: string): FunctorBridge | undefined {
    return this.functors.get(name);
  }

  getAll(): FunctorBridge[] {
    return Array.from(this.functors.values());
  }

  getDomainNames(): string[] {
    return Array.from(new Set(Array.from(this.functors.values()).map(f => f.domain)));
  }

  getByDomain(domain: string): FunctorBridge[] {
    return Array.from(this.functors.values()).filter(f => f.domain === domain);
  }
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) / 2147483647;
}

function extractNumber(value: GeneValue | undefined, key: string, defaultValue: number): number {
  if (typeof value === 'object' && value !== null) {
    return (value as Record<string, unknown>)[key] as number ?? defaultValue;
  }
  return typeof value === 'number' ? value : defaultValue;
}