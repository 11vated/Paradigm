import { GeneType, GeneSchema, GeneMetadata, GeneValue, GENE_TYPE_DEFINITIONS } from './types';

export interface SeedMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  author?: string;
  created: number;
  updated: number;
  tags: string[];
  lineage: string[];
  fitness?: number;
  phenotype?: string;
  domain?: string;
}

export interface SeedExpression {
  activated: Set<string>;
  suppressed: Set<string>;
  weights: Map<string, number>;
  interactions: Map<string, string[]>;
}

export interface SeedDerivation {
  parents: string[];
  operators: string[];
  generation: number;
  timestamp: number;
}

export interface SerializedSeed {
  id: string;
  metadata: SeedMetadata;
  genes: [string, GeneSchema][];
  expression?: {
    activated: string[];
    suppressed: string[];
    weights: [string, number][];
    interactions: [string, string[]][];
  };
  derivation?: SeedDerivation;
}

export interface UniversalSeedData {
  id: string;
  metadata: SeedMetadata;
  genes: Map<string, GeneSchema>;
  expression: SeedExpression;
  derivation: SeedDerivation;
}

export class UniversalSeed {
  public readonly id: string;
  public readonly metadata: SeedMetadata;
  private genes: Map<string, GeneSchema>;
  private expression: SeedExpression;
  public derivation?: SeedDerivation;
  private isDirty: boolean = false;

  constructor(data?: Partial<UniversalSeedData>) {
    this.id = data?.id ?? crypto.randomUUID();
    this.metadata = data?.metadata ?? this.createDefaultMetadata();
    this.genes = data?.genes ?? new Map();
    this.expression = data?.expression ?? this.createDefaultExpression();
    this.derivation = data?.derivation;

    if (data?.genes === undefined) {
      this.initializeDefaultGenes();
    }
  }

  private createDefaultMetadata(): SeedMetadata {
    return {
      id: this.id,
      name: 'Untitled Seed',
      version: '1.0.0',
      created: Date.now(),
      updated: Date.now(),
      tags: [],
      lineage: [],
      fitness: undefined
    };
  }

  private createDefaultExpression(): SeedExpression {
    return {
      activated: new Set(),
      suppressed: new Set(),
      weights: new Map(),
      interactions: new Map()
    };
  }

  private initializeDefaultGenes(): void {
    for (const def of GENE_TYPE_DEFINITIONS) {
      this.setGene(def.type, def.defaultValue, {
        name: def.name,
        description: def.description,
        mutable: true,
        dominant: false,
        hidden: false,
        locked: false,
        mutationRate: 0.01
      });
    }
  }

  setGene(type: GeneType, value: GeneValue, metadata?: Partial<GeneMetadata>): void {
    const existing = this.genes.get(type);
    const gene: GeneSchema = {
      type,
      value,
      metadata: {
        name: type,
        mutable: true,
        dominant: false,
        hidden: false,
        locked: false,
        ...existing?.metadata,
        ...metadata
      }
    };
    this.genes.set(type, gene);
    this.isDirty = true;
  }

  getGene(type: GeneType): GeneSchema | undefined {
    return this.genes.get(type);
  }

  getGeneValue(type: GeneType): GeneValue | undefined {
    return this.genes.get(type)?.value;
  }

  hasGene(type: GeneType): boolean {
    return this.genes.has(type);
  }

  deleteGene(type: GeneType): boolean {
    const gene = this.genes.get(type);
    if (gene?.metadata.locked) return false;
    return this.genes.delete(type);
  }

  getAllGenes(): Map<string, GeneSchema> {
    return new Map(this.genes);
  }

  getGeneTypes(): GeneType[] {
    return Array.from(this.genes.keys()) as GeneType[];
  }

  setMetadata<T extends keyof SeedMetadata>(key: T, value: SeedMetadata[T]): void {
    this.metadata[key] = value;
    this.isDirty = true;
  }

  getMetadata(): SeedMetadata {
    return { ...this.metadata };
  }

  activateGene(type: GeneType): void {
    this.expression.activated.add(type);
    this.expression.suppressed.delete(type);
    this.isDirty = true;
  }

  suppressGene(type: GeneType): void {
    this.expression.suppressed.add(type);
    this.expression.activated.delete(type);
    this.isDirty = true;
  }

  isGeneActive(type: GeneType): boolean {
    if (this.expression.suppressed.has(type)) return false;
    if (this.expression.activated.has(type)) return true;
    return this.genes.get(type)?.metadata.mutable ?? true;
  }

  setGeneWeight(type: GeneType, weight: number): void {
    this.expression.weights.set(type, Math.max(0, Math.min(1, weight)));
    this.isDirty = true;
  }

  getGeneWeight(type: GeneType): number {
    return this.expression.weights.get(type) ?? 1;
  }

  setGeneInteraction(geneA: GeneType, geneB: GeneType): void {
    const existing = this.expression.interactions.get(geneA) ?? [];
    if (!existing.includes(geneB)) {
      existing.push(geneB);
      this.expression.interactions.set(geneA, existing);
      this.isDirty = true;
    }
  }

  getGeneInteractions(type: GeneType): GeneType[] {
    return (this.expression.interactions.get(type) ?? []) as GeneType[];
  }

  getExpression(): SeedExpression {
    return {
      activated: new Set(this.expression.activated),
      suppressed: new Set(this.expression.suppressed),
      weights: new Map(this.expression.weights),
      interactions: new Map(this.expression.interactions)
    };
  }

  mutate(rng: { nextFloat?: () => number; nextF64?: () => number }, intensity: number = 0.1): UniversalSeed {
    const nextFloat = rng.nextFloat ?? (rng as any).nextF64?.bind(rng) ?? (() => Math.random());
    const mutated = this.clone();

    for (const [type, gene] of mutated.genes) {
      if (!gene.metadata.mutable || gene.metadata.locked) continue;

      if (nextFloat() < gene.metadata.mutationRate * intensity) {
        gene.value = this.mutateValue(gene.value, intensity, rng);
      }
    }

    mutated.metadata.lineage.push(this.id);
    mutated.metadata.updated = Date.now();
    mutated.derivation = {
      parents: [this.id],
      operators: ['mutate'],
      generation: (this.derivation?.generation ?? 0) + 1,
      timestamp: Date.now()
    };

    return mutated;
  }

  private mutateValue(value: GeneValue, intensity: number, rng: { nextFloat?: () => number; nextF64?: () => number }): GeneValue {
    const nextFloat = rng.nextFloat ?? (rng as any).nextF64?.bind(rng) ?? (() => Math.random());
    
    if (typeof value === 'number') {
      return value + (nextFloat() - 0.5) * intensity * 2;
    }
    if (typeof value === 'string') {
      const mutations = ['uppercase', 'lowercase', 'reverse', 'shuffle'];
      const op = mutations[Math.floor(nextFloat() * mutations.length)];
      switch (op) {
        case 'uppercase': return value.toUpperCase();
        case 'lowercase': return value.toLowerCase();
        case 'reverse': return value.split('').reverse().join('');
        default: return value;
      }
    }
    if (typeof value === 'boolean') {
      return nextFloat() < intensity ? !value : value;
    }
    if (Array.isArray(value)) {
      const newArray = [...value];
      const idx = Math.floor(nextFloat() * newArray.length);
      newArray[idx] = this.mutateValue(newArray[idx], intensity, rng);
      return newArray;
    }
    if (typeof value === 'object' && value !== null) {
      const result: Record<string, GeneValue> = { ...value as Record<string, GeneValue> };
      const keys = Object.keys(result);
      if (keys.length > 0) {
        const key = keys[Math.floor(nextFloat() * keys.length)];
        result[key] = this.mutateValue(result[key], intensity, rng);
      }
      return result;
    }
    return value;
  }

  clone(): UniversalSeed {
    const cloned = new UniversalSeed({
      id: crypto.randomUUID(),
      metadata: {
        ...this.metadata,
        id: '',
        created: Date.now(),
        updated: Date.now(),
        lineage: [...this.metadata.lineage]
      },
      genes: new Map(this.genes),
      expression: {
        activated: new Set(this.expression.activated),
        suppressed: new Set(this.expression.suppressed),
        weights: new Map(this.expression.weights),
        interactions: new Map(this.expression.interactions)
      }
    });
    return cloned;
  }

  cross(other: UniversalSeed, rng: { nextFloat?: () => number; nextF64?: () => number }): UniversalSeed {
    const child = new UniversalSeed();
    const nextFloat = rng.nextFloat ?? (rng as any).nextF64?.bind(rng) ?? (() => Math.random());
    
    for (const [type, geneA] of this.genes) {
      const geneB = other.genes.get(type);
      if (geneB) {
        const childGene = nextFloat() < 0.5 ? geneA : geneB;
        child.genes.set(type, {
          ...childGene,
          metadata: { ...childGene.metadata }
        });
      } else {
        child.genes.set(type, { ...geneA });
      }
    }

    child.metadata.lineage = [this.id, other.id];
    child.derivation = {
      parents: [this.id, other.id],
      operators: ['crossover'],
      generation: Math.max(this.derivation?.generation ?? 0, other.derivation?.generation ?? 0) + 1,
      timestamp: Date.now()
    };

    return child;
  }

  evaluate(fitnessFn: (seed: UniversalSeed) => number): number {
    this.metadata.fitness = fitnessFn(this);
    return this.metadata.fitness;
  }

  serialize(): SerializedSeed {
    return {
      id: this.id,
      metadata: this.metadata,
      genes: Array.from(this.genes.entries()),
      expression: {
        activated: Array.from(this.expression.activated),
        suppressed: Array.from(this.expression.suppressed),
        weights: Array.from(this.expression.weights.entries()),
        interactions: Array.from(this.expression.interactions.entries())
      },
      derivation: this.derivation
    };
  }

  static deserialize(data: SerializedSeed): UniversalSeed {
    const seed = new UniversalSeed({
      id: data.id,
      metadata: data.metadata,
      genes: new Map(data.genes),
      derivation: data.derivation
    });

    if (data.expression) {
      seed.expression = {
        activated: new Set(data.expression.activated),
        suppressed: new Set(data.expression.suppressed),
        weights: new Map(data.expression.weights),
        interactions: new Map(data.expression.interactions)
      };
    }

    return seed;
  }

  toJSON(): string {
    return JSON.stringify(this.serialize(), null, 2);
  }

  static fromJSON(json: string): UniversalSeed {
    return UniversalSeed.deserialize(JSON.parse(json));
  }

  isDirty_(): boolean {
    return this.isDirty;
  }

  markClean(): void {
    this.isDirty = false;
  }

  getGeneration(): number {
    return this.derivation?.generation ?? 0;
  }

  getParents(): string[] {
    return this.derivation?.parents ?? [];
  }
}

export { GeneType, GeneSchema, GeneMetadata, GeneValue };
