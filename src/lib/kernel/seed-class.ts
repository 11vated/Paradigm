/**
 * @deprecated Use UniversalSeed from 'src/seeds/universal-seed.ts' instead.
 * 
 * PARADIGM ABSOLUTE — Universal Seed Class (Legacy)
 * 
 * This class is DEPRECATED and will be removed in v1.1.
 * Use `UniversalSeed` from `src/seeds/universal-seed.ts` as the canonical seed class.
 * 
 * Migration:
 *   import { Seed } from './seed-class'  →  import { UniversalSeed } from '../../seeds/universal-seed'
 *   new Seed(domain, name, genes)        →  new UniversalSeed({ metadata: { name, domain }, genes })
 *   seed.setGene(type, value, schema)    →  seed.setGene(type, value, metadata)
 *   seed.getGeneValue(type)              →  seed.getGeneValue(type)
 *   seed.mutate(rng, intensity)          →  seed.mutate(rng, intensity)
 *   seed.cross(other, rng)               →  seed.cross(other, rng)
 *   seed.distance(other)                 →  seed.distance(other)
 *   seed.clone()                         →  seed.clone()
 *   seed.toJSON()                        →  seed.toJSON()
 *   Seed.fromJSON(json)                  →  UniversalSeed.fromJSON(json)
 */

import { Xoshiro256StarStar } from './rng';
import { GeneSystem, GeneSchema } from './gene_system';

import crypto from 'crypto';
import { kernelNow, kernelNowIso } from './clock';

/** @deprecated Use canonical.ts / lib/sovereignty/canonical.ts instead. */
function computeSeedHash(canonicalJson: string): string {
  // Uses SHA-256 per spec/01-universal-seed.md
  // Format: sha256:7f8b3b... (64 hex chars)
  const encoder = new TextEncoder();
  const bytes = encoder.encode(canonicalJson);
  const hashHex = crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
  return `sha256:${hashHex}`;
}

// ─────────────────────────────────────────────────────────────────────────────

export interface GeneValue {
  type: string;
  value: any;
  schema?: GeneSchema;
  timestamp?: number;
}

export interface SeedExpression {
  activated: Set<string>;  // Active genes
  suppressed: Set<string>;  // Inactive genes
  weights: Map<string, number>;  // Gene expression weights
  interactions: Array<[string, string, number]>;  // Gene interactions
}

export interface SeedLineage {
  generation: number;
  parents: string[];
  operators: string[];  // ['mutate', 'breed', 'compose', 'evolve']
  timestamp: number;
  fitness?: number;
}

export interface SeedMetadata {
  name: string;
  domain: string;
  owner?: string;
  license?: string;
  tags: string[];
  description?: string;
}

export interface SeedJSON {
  id: string;
  hash: string;
  metadata: SeedMetadata;
  genes: Array<[string, any]>;  // Serialized as tuples
  expression?: {
    activated: string[];
    suppressed: string[];
    weights: Array<[string, number]>;
    interactions: Array<[string, string, number]>;
  };
  lineage: SeedLineage;
  signature?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

export class Seed {
  // Identity
  readonly id: string;  // UUID - immutable
  readonly hash: string;  // SHA-256 of canonical form - computed
  
  // Content
  readonly metadata: SeedMetadata;
  readonly genes: Map<string, GeneValue>;
  
  // Expression
  readonly expression: SeedExpression;
  
  // Lineage
  readonly lineage: SeedLineage;
  
  // Sovereignty
  readonly signature?: string;

  // ─────────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────────

  constructor(
    domain: string,
    name: string = `Seed_${domain}`,
    genes?: Map<string, GeneValue>
  ) {
    this.metadata = {
      name,
      domain,
      tags: [],
    };
    this.genes = genes ?? new Map();
    this.expression = {
      activated: new Set(),
      suppressed: new Set(),
      weights: new Map(),
      interactions: [],
    };
    this.lineage = {
      generation: 0,
      parents: [],
      operators: [],
      timestamp: 0,
    };
    this.hash = this.computeHash();
    this.id = this.hash;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GENE OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Set a gene value with validation
   */
  setGene(type: string, value: any, schema?: GeneSchema): Seed {
    // Validate
    const ops = GeneSystem.getOps(type);
    if (!ops.validate(value, schema)) {
      throw new Error(
        `Invalid value for gene type ${type}: ${JSON.stringify(value)}`
      );
    }

    // Create new seed with updated genes
    const newGenes = new Map(this.genes);
    newGenes.set(type, {
      type,
      value,
      schema,
      timestamp: 0,
    });

    const newSeed = new Seed(this.metadata.domain, this.metadata.name, newGenes);
    newSeed.copyMetadata(this);
    newSeed.copyLineage(this);
    return newSeed;
  }

  /**
   * Get a gene value
   */
  getGene(type: string): GeneValue | undefined {
    return this.genes.get(type);
  }

  /**
   * Get gene value only (not schema)
   */
  getGeneValue(type: string): any {
    return this.genes.get(type)?.value;
  }

  /**
   * Check if gene exists
   */
  hasGene(type: string): boolean {
    return this.genes.has(type);
  }

  /**
   * Delete a gene
   */
  deleteGene(type: string): Seed {
    const newGenes = new Map(this.genes);
    newGenes.delete(type);
    const newSeed = new Seed(this.metadata.domain, this.metadata.name, newGenes);
    newSeed.copyMetadata(this);
    newSeed.copyLineage(this);
    return newSeed;
  }

  /**
   * Get all genes
   */
  getAllGenes(): Map<string, GeneValue> {
    return new Map(this.genes);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GENETIC OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Mutate this seed, return new Seed
   */
  mutate(rng: Xoshiro256StarStar, intensity: number = 0.15): Seed {
    const newGenes = new Map();

    for (const [type, geneValue] of this.genes) {
      const ops = GeneSystem.getOps(type);
      const mutatedValue = ops.mutate(geneValue.value, intensity, rng, geneValue.schema);
      newGenes.set(type, {
        ...geneValue,
        value: mutatedValue,
        timestamp: 0,
      });
    }

    const mutated = new Seed(this.metadata.domain, this.metadata.name, newGenes);
    mutated.copyMetadata(this);
    mutated.addDerivation('mutate', [this.id], [this.lineage.generation], intensity);
    return mutated;
  }

  /**
   * Breed with another seed via crossover
   */
  cross(other: Seed, rng: Xoshiro256StarStar): Seed {
    if (this.metadata.domain !== other.metadata.domain) {
      throw new Error(
        `Cannot breed seeds from different domains: ${this.metadata.domain} vs ${other.metadata.domain}`
      );
    }

    const newGenes = new Map();
    const allTypes = new Set([...this.genes.keys(), ...other.genes.keys()]);

    for (const type of allTypes) {
      const geneA = this.genes.get(type);
      const geneB = other.genes.get(type);

      if (!geneA && !geneB) continue;
      if (!geneA) {
        newGenes.set(type, JSON.parse(JSON.stringify(geneB)));
        continue;
      }
      if (!geneB) {
        newGenes.set(type, JSON.parse(JSON.stringify(geneA)));
        continue;
      }

      // Crossover
      const ops = GeneSystem.getOps(type);
      const childValue = ops.crossover(geneA.value, geneB.value, rng);
      newGenes.set(type, {
        type,
        value: childValue,
        schema: geneA.schema || geneB.schema,
        timestamp: 0,
      });
    }

    const child = new Seed(this.metadata.domain, 'child', newGenes);
    child.metadata.name = `${this.metadata.name} × ${other.metadata.name}`;
    child.addDerivation('breed', [this.id, other.id], [this.lineage.generation, other.lineage.generation]);
    return child;
  }

  /**
   * Clone this seed (deep copy with new ID)
   */
  clone(): Seed {
    const newGenes = new Map();
    for (const [type, geneValue] of this.genes) {
      newGenes.set(type, {
        ...geneValue,
        value: JSON.parse(JSON.stringify(geneValue.value)),
      });
    }

    const cloned = new Seed(this.metadata.domain, this.metadata.name, newGenes);
    cloned.copyMetadata(this);
    cloned.addDerivation('clone', [this.id], [this.lineage.generation]);
    return cloned;
  }

  /**
   * Compute genetic distance to another seed
   */
  distance(other: Seed): number {
    if (this.metadata.domain !== other.metadata.domain) {
      return 1.0;  // Maximum distance
    }

    let totalDistance = 0;
    let count = 0;

    const allTypes = new Set([...this.genes.keys(), ...other.genes.keys()]);

    for (const type of allTypes) {
      const geneA = this.genes.get(type);
      const geneB = other.genes.get(type);

      if (!geneA || !geneB) {
        totalDistance += 1.0;  // Different genes = distance 1
      } else {
        const ops = GeneSystem.getOps(type);
        totalDistance += ops.distance(geneA.value, geneB.value, geneA.schema);
      }
      count++;
    }

    return count > 0 ? totalDistance / count : 0.0;
  }

  /**
   * Evaluate fitness
   */
  async evaluate(fitnessFn: (seed: Seed) => Promise<number> | number): Promise<number> {
    const fitness = await fitnessFn(this);
    
    // Update lineage
    this.lineage.fitness = fitness;
    
    return fitness;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPRESSION CONTROL
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Activate a gene
   */
  activateGene(type: string): Seed {
    const newSeed = this.clone();
    newSeed.expression.activated.add(type);
    newSeed.expression.suppressed.delete(type);
    return newSeed;
  }

  /**
   * Suppress a gene
   */
  suppressGene(type: string): Seed {
    const newSeed = this.clone();
    newSeed.expression.suppressed.add(type);
    newSeed.expression.activated.delete(type);
    return newSeed;
  }

  /**
   * Set gene expression weight
   */
  setGeneWeight(type: string, weight: number): Seed {
    const newSeed = this.clone();
    newSeed.expression.weights.set(type, Math.max(0, Math.min(1, weight)));
    return newSeed;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CONTENT HASHING (Deterministic)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Compute content hash (SHA-256 of canonical form)
   * Two seeds with identical genes will have identical hashes
   */
  computeHash(): string {
    // Canonical form: sorted genes
    const canonical = this.getCanonicalForm();
    const json = JSON.stringify(canonical);
    return computeSeedHash(json);
  }

  /**
   * Get canonical form for hashing (deterministic)
   */
  private getCanonicalForm(): any {
    const genes: Array<[string, any]> = [];
    
    // Sort by gene type for determinism
    const sortedTypes = Array.from(this.genes.keys()).sort();
    
    for (const type of sortedTypes) {
      const gene = this.genes.get(type)!;
      genes.push([type, gene.value]);  // Hash only value, not schema
    }

    return {
      domain: this.metadata.domain,
      genes: genes,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SERIALIZATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Serialize to JSON
   */
  toJSON(): SeedJSON {
    return {
      id: this.id,
      hash: this.hash,
      metadata: this.metadata,
      genes: Array.from(this.genes.entries()).map(([type, gene]) => [type, gene.value]),
      expression: {
        activated: Array.from(this.expression.activated),
        suppressed: Array.from(this.expression.suppressed),
        weights: Array.from(this.expression.weights),
        interactions: this.expression.interactions,
      },
      lineage: this.lineage,
      signature: this.signature,
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(data: SeedJSON): Seed {
    const genes = new Map<string, GeneValue>();
    
    for (const [type, value] of data.genes) {
      genes.set(type, {
        type,
        value,
        timestamp: kernelNow(),
      });
    }

    const seed = new Seed(data.metadata.domain, data.metadata.name, genes);
    seed.metadata.owner = data.metadata.owner;
    seed.metadata.tags = data.metadata.tags;
    seed.lineage.generation = data.lineage.generation;
    seed.lineage.parents = data.lineage.parents;
    seed.lineage.operators = data.lineage.operators;
    seed.lineage.fitness = data.lineage.fitness;

    if (data.expression) {
      seed.expression.activated = new Set(data.expression.activated);
      seed.expression.suppressed = new Set(data.expression.suppressed);
      seed.expression.weights = new Map(data.expression.weights);
      seed.expression.interactions = data.expression.interactions;
    }

    return seed;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  private copyMetadata(other: Seed): void {
    Object.assign(this.metadata, other.metadata);
  }

  private copyLineage(other: Seed): void {
    this.lineage.generation = other.lineage.generation;
    this.lineage.parents = [...other.lineage.parents];
    this.lineage.operators = [...other.lineage.operators];
    this.lineage.fitness = other.lineage.fitness;
  }

  private addDerivation(operator: string, parentIds: string[], parentGenerations: number[], params?: any): void {
    this.lineage.generation = Math.max(...parentGenerations, 0) + 1;
    this.lineage.parents = parentIds;
    this.lineage.operators = [...this.lineage.operators, operator];
    this.lineage.timestamp = 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export default Seed;
