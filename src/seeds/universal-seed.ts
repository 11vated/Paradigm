import { GeneType, GeneSchema, GeneMetadata, GeneValue, GENE_TYPE_DEFINITIONS } from './types';
import { nextDeterministicFloat, type LegacyFloatRng } from '../lib/kernel/rng-contract.js';
import { distanceGene } from '../lib/kernel/gene_system.js';
import { canonicalizeSeed } from '../lib/sovereignty/canonical.js';
import crypto from 'crypto';
import { signData, verifySignature } from '../lib/sovereignty/signing.js';

const DEFAULT_SEED_TIMESTAMP = 0;
let deterministicSeedCounter = 0;

function createDeterministicSeedId(): string {
  deterministicSeedCounter += 1;
  return `seed-${deterministicSeedCounter.toString(36).padStart(8, '0')}`;
}

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

export interface SeedSovereignty {
  authorPubkey: string;
  signature: string;
  signedAt: number;
  genes?: Record<string, { owner: string; license: string; signature: string; transferable: boolean }>;
}

export class UniversalSeed {
  public readonly id: string;
  public readonly metadata: SeedMetadata;
  private genes: Map<string, GeneSchema>;
  private expression: SeedExpression;
  public derivation?: SeedDerivation;
  private isDirty: boolean = false;
  public hash: string = '';
  public sovereignty?: SeedSovereignty;

  constructor(data?: Partial<UniversalSeedData>) {
    this.id = data?.id ?? createDeterministicSeedId();
    this.metadata = data?.metadata ?? this.createDefaultMetadata();
    this.genes = data?.genes ?? new Map();
    this.expression = data?.expression ?? this.createDefaultExpression();
    this.derivation = data?.derivation;

    if (data?.genes === undefined) {
      this.initializeDefaultGenes();
    }

    this.hash = this.computeHash();  // Deterministic content hash from genes
  }

  private createDefaultMetadata(): SeedMetadata {
    return {
      id: this.id,
      name: 'Untitled Seed',
      version: '1.0.0',
      created: DEFAULT_SEED_TIMESTAMP,
      updated: DEFAULT_SEED_TIMESTAMP,
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
        mutationRate: 0.01,
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

  mutate(rng: LegacyFloatRng, intensity: number = 0.1): UniversalSeed {
    const nextFloat = this.requireDeterministicFloat(rng);
    const mutated = this.clone();

    for (const [type, gene] of mutated.genes) {
      if (!gene.metadata.mutable || gene.metadata.locked) continue;

      if (nextFloat() < gene.metadata.mutationRate * intensity) {
        gene.value = this.mutateValue(gene.value, intensity, rng);
      }
    }

    mutated.metadata.lineage.push(this.id);
    mutated.metadata.updated = this.metadata.updated;
    mutated.derivation = {
      parents: [this.id],
      operators: ['mutate'],
      generation: (this.derivation?.generation ?? 0) + 1,
      timestamp: this.derivation?.timestamp ?? this.metadata.updated
    };

    return mutated;
  }

  private mutateValue(value: GeneValue, intensity: number, rng: LegacyFloatRng): GeneValue {
    const nextFloat = this.requireDeterministicFloat(rng);
    
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
      id: `${this.id}:clone`,
      metadata: {
        ...this.metadata,
        id: `${this.id}:clone`,
        created: this.metadata.created,
        updated: this.metadata.updated,
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

  cross(other: UniversalSeed, rng: LegacyFloatRng): UniversalSeed {
    const child = new UniversalSeed({ id: `${this.id}:x:${other.id}` });
    const nextFloat = this.requireDeterministicFloat(rng);
    
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
      timestamp: Math.max(this.derivation?.timestamp ?? this.metadata.updated, other.derivation?.timestamp ?? other.metadata.updated)
    };

    return child;
  }

  evaluate(fitnessFn: (seed: UniversalSeed) => number): number {
    this.metadata.fitness = fitnessFn(this);
    return this.metadata.fitness;
  }

  distance(other: UniversalSeed): number {
    let totalDistance = 0;
    let count = 0;
    const allTypes = new Set([...this.genes.keys(), ...other.genes.keys()]);
    for (const type of allTypes) {
      const geneA = this.genes.get(type);
      const geneB = other.genes.get(type);
      if (!geneA || !geneB) {
        totalDistance += 1.0;
      } else {
        totalDistance += distanceGene(type, geneA.value, geneB.value, geneA);
      }
      count++;
    }
    return count > 0 ? totalDistance / count : 0.0;
  }

  private requireDeterministicFloat(rng: LegacyFloatRng): () => number {
    return () => nextDeterministicFloat(rng);
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

  // ─────────────────────────────────────────────────────────────────────────────
  // SPEC-COMPATIBLE FIELD ACCESSORS ($gst, $domain, $hash, $name, $lineage, $fitness)
  // Mirrors the UniversalSeed spec format in spec/01-universal-seed.md
  // Used by code expecting the reference spec's dollar-prefixed field names
  // ─────────────────────────────────────────────────────────────────────────────

  get $gst(): string {
    return this.hash ?? '';
  }

  set $gst(value: string) {
    this.hash = value;
  }

  get $domain(): string {
    return this.metadata.domain ?? this.metadata.tags[0] ?? 'unknown';
  }

  set $domain(value: string) {
    this.metadata.domain = value;
  }

  get $hash(): string {
    if (!this.hash) {
      this.hash = this.computeHash();
    }
    return this.hash;
  }

  set $hash(value: string) {
    this.hash = value;
  }

  get $name(): string {
    return this.metadata.name;
  }

  set $name(value: string) {
    this.metadata.name = value;
  }

  get $lineage(): { generation: number; parents: string[]; operators: string[] } {
    return {
      generation: this.derivation?.generation ?? 0,
      parents: this.derivation?.parents ?? [],
      operators: this.derivation?.operators ?? [],
    };
  }

  set $lineage(value: { generation?: number; parents?: string[]; operators?: string[] }) {
    this.derivation = {
      parents: value.parents ?? this.derivation?.parents ?? [],
      operators: value.operators ?? this.derivation?.operators ?? [],
      generation: value.generation ?? this.derivation?.generation ?? 0,
      timestamp: this.derivation?.timestamp ?? this.metadata.created,
    };
  }

  get $fitness(): Record<string, number> {
    return { overall: this.metadata.fitness ?? 0 };
  }

  /**
   * Compute a deterministic content hash from the seed's genes.
   * Uses SHA-256 over sorted gene entries for reproducible output.
   */
  private computeHash(): string {
    const sortedGenes = Array.from(this.genes.entries())
      .sort(([a], [b]) => a.localeCompare(b));
    const hashInput = sortedGenes
      .map(([type, gene]) => `${type}:${JSON.stringify(gene.value)}`)
      .join('|');
    return crypto.createHash('sha256').update(hashInput).digest('hex');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SOVEREIGNTY (ECDSA P-256 signing)
  // Per spec/05-sovereignty.md: signatures live inside the seed itself
  // ─────────────────────────────────────────────────────────────────────────────

  private canonicalForm(): string {
    const sorted: Record<string, any> = {
      domain: this.metadata.domain ?? this.metadata.tags[0] ?? 'unknown',
      name: this.metadata.name,
    };
    const genes: Record<string, any> = {};
    const sortedGenes = Array.from(this.genes.keys()).sort();
    for (const key of sortedGenes) {
      const g = this.genes.get(key);
      if (g) genes[key] = g.value;
    }
    sorted.genes = genes;
    return JSON.stringify(sorted, Object.keys(sorted).sort());
  }

  async sign(privateKey: CryptoKey, authorPubkey?: string): Promise<UniversalSeed> {
    const canonical = this.canonicalForm();
    const pubkey = authorPubkey ?? '';
    const signature = await signData(canonical + ':' + pubkey, privateKey);
    const cloned = this.clone();
    cloned.sovereignty = {
      authorPubkey: pubkey,
      signature,
      signedAt: 0,
    };
    return cloned;
  }

  async verify(publicKey: CryptoKey, authorPubkey?: string): Promise<boolean> {
    if (!this.sovereignty?.signature) return false;
    const canonical = this.canonicalForm();
    const pubkey = authorPubkey ?? this.sovereignty.authorPubkey;
    return await verifySignature(canonical + ':' + pubkey, this.sovereignty.signature, publicKey);
  }

  async signGene(geneName: string, privateKey: CryptoKey, license: string, owner?: string): Promise<UniversalSeed> {
    const gene = this.genes.get(geneName as any);
    if (!gene) throw new Error(`Gene '${geneName}' not found`);
    const geneValue = JSON.stringify(gene.value);
    const signature = await signData(geneValue + ':' + license, privateKey);
    const cloned = this.clone();
    cloned.sovereignty = {
      ...(cloned.sovereignty ?? { authorPubkey: '', signature: '', signedAt: 0 }),
      genes: {
        ...(cloned.sovereignty?.genes ?? {}),
        [geneName]: {
          owner: owner ?? '',
          license,
          signature,
          transferable: true,
        },
      },
    };
    return cloned;
  }

  async verifyGene(geneName: string, publicKey: CryptoKey): Promise<boolean> {
    const geneSovereignty = this.sovereignty?.genes?.[geneName];
    if (!geneSovereignty?.signature) return false;
    const gene = this.genes.get(geneName as any);
    if (!gene) return false;
    const geneValue = JSON.stringify(gene.value);
    return await verifySignature(
      geneValue + ':' + geneSovereignty.license,
      geneSovereignty.signature,
      publicKey
    );
  }
}

export { GeneType };
export type { GeneSchema, GeneMetadata, GeneValue };
