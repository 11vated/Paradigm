import { Xoshiro256StarStar } from './rng';
import {
  GENE_TYPES as FLAT_TYPES, type GeneTypeOps, type GeneSchema, type ValidateFn, type MutateFn, type DistanceFn,
  validateGene, mutateGene, crossoverGene, distanceGene,
} from './gene_system';
export type { GeneTypeOps, GeneSchema };

// ─── TYPE NODE IN THE LATTICE ──────────────────────────────────────────────

export interface TypeNode {
  name: string;
  parent: string | null;
  children: string[];
  category: 'primitive' | 'container' | 'spatial' | 'temporal' | 'symbolic' | 'learned' | 'meta';
  description: string;
  constraints?: Partial<GeneSchema>;
  ops: GeneTypeOps;
}

// ─── THE LATTICE ────────────────────────────────────────────────────────────

const LATTICE: TypeNode[] = [
  // ── PRIMITIVE ──────────────────────────────────────────────────────────
  { name: 'boolean', parent: null, children: [], category: 'primitive',
    description: 'True/false binary state',
    ops: {
      validate: (v) => typeof v === 'boolean',
      mutate: (v, rate, rng) => rng.nextF64() < rate ? !v : v,
      crossover: (a, b, rng) => rng.nextBool() ? a : b,
      distance: (a, b) => a === b ? 0 : 1,
      canonicalize: (v) => v,
      repair: (v) => typeof v === 'boolean' ? v : false,
    },
  },
  { name: 'scalar', parent: null, children: ['vector'], category: 'primitive',
    description: 'Continuous numeric value, optionally bounded',
    ops: FLAT_TYPES['scalar'],
  },
  { name: 'categorical', parent: null, children: [], category: 'primitive',
    description: 'Discrete choice from a finite set',
    ops: FLAT_TYPES['categorical'],
  },

  // ── CONTAINER (extends primitive) ──────────────────────────────────────
  { name: 'vector', parent: 'scalar', children: ['matrix', 'field'], category: 'container',
    description: 'N-dimensional numeric array; scalar is Vector<1>',
    ops: FLAT_TYPES['vector'],
  },
  { name: 'matrix', parent: 'vector', children: [], category: 'container',
    description: '2D numeric array, rows × columns',
    ops: makeMatrixOps(),
  },
  { name: 'array', parent: 'vector', children: [], category: 'container',
    description: 'Variable-length ordered collection of any gene type',
    ops: FLAT_TYPES['array'],
  },
  { name: 'struct', parent: null, children: [], category: 'container',
    description: 'Fixed-schema composite record of typed fields',
    ops: FLAT_TYPES['struct'],
  },
  { name: 'graph', parent: null, children: ['topology', 'regulatory', 'expression'], category: 'container',
    description: 'Nodes and edges with typed attributes',
    ops: FLAT_TYPES['graph'],
  },

  // ── SPATIAL (extends container) ────────────────────────────────────────
  { name: 'field', parent: 'vector', children: ['sdf'], category: 'spatial',
    description: 'Continuous spatial distribution (SDF tree)',
    ops: FLAT_TYPES['field'],
  },
  { name: 'topology', parent: 'graph', children: [], category: 'spatial',
    description: 'Planar 2-manifold surface descriptor',
    ops: FLAT_TYPES['topology'],
  },
  { name: 'sdf', parent: 'field', children: [], category: 'spatial',
    description: 'Signed distance function — field specialized for surfaces',
    ops: deriveSDFOps(),
  },

  // ── TEMPORAL (extends spatial) ─────────────────────────────────────────
  { name: 'temporal', parent: null, children: ['keyframe', 'envelope'], category: 'temporal',
    description: 'Time-varying signal or envelope',
    ops: FLAT_TYPES['temporal'],
  },
  { name: 'keyframe', parent: 'temporal', children: [], category: 'temporal',
    description: 'Piecewise-linear time-valued pairs',
    ops: FLAT_TYPES['temporal'],
  },
  { name: 'envelope', parent: 'temporal', children: [], category: 'temporal',
    description: 'Parametric ADSR-style envelope',
    ops: FLAT_TYPES['temporal'],
  },

  // ── SYMBOLIC (extends container) ───────────────────────────────────────
  { name: 'expression', parent: 'graph', children: [], category: 'symbolic',
    description: 'Pure expression AST — graph with DAG constraint',
    ops: FLAT_TYPES['expression'],
  },
  { name: 'symbolic', parent: null, children: ['gematria', 'regulatory'], category: 'symbolic',
    description: 'Abstract symbolic structure (grammar, dialogue tree)',
    ops: FLAT_TYPES['symbolic'],
  },
  { name: 'gematria', parent: 'symbolic', children: [], category: 'symbolic',
    description: 'Culturally-grounded numeric encoding of symbols',
    ops: FLAT_TYPES['gematria'],
  },
  { name: 'regulatory', parent: 'graph', children: [], category: 'symbolic',
    description: 'Weighted directed gene-regulation network',
    ops: FLAT_TYPES['regulatory'],
  },

  // ── LEARNED ─────────────────────────────────────────────────────────────
  { name: 'dimensional', parent: 'vector', children: ['quantum'], category: 'learned',
    description: 'Fixed-dimension embedding vector via ML models',
    ops: FLAT_TYPES['dimensional'],
  },
  { name: 'quantum', parent: 'dimensional', children: [], category: 'learned',
    description: 'Superposition of basis states — style mixing',
    ops: FLAT_TYPES['quantum'],
  },
  { name: 'resonance', parent: null, children: [], category: 'learned',
    description: 'Harmonic frequency profile for audio/mechanical timbre',
    ops: FLAT_TYPES['resonance'],
  },

  // ── META ────────────────────────────────────────────────────────────────
  { name: 'sovereignty', parent: 'struct', children: [], category: 'meta',
    description: 'Cryptographic identity — immutable once signed',
    ops: FLAT_TYPES['sovereignty'],
  },
];

// ─── REGISTRY ──────────────────────────────────────────────────────────────

export class GeneTypeRegistry {
  private types = new Map<string, TypeNode>();
  private customTypes = new Map<string, TypeNode>();

  constructor() {
    for (const t of LATTICE) {
      this.types.set(t.name, t);
    }
    // Wire up children references
    for (const t of LATTICE) {
      if (t.parent) {
        const parent = this.types.get(t.parent);
        if (parent) parent.children.push(t.name);
      }
    }
  }

  get(name: string): TypeNode | undefined {
    return this.types.get(name) ?? this.customTypes.get(name);
  }

  getAll(): TypeNode[] {
    return [...this.types.values(), ...this.customTypes.values()];
  }

  getCategory(cat: string): TypeNode[] {
    return this.getAll().filter(t => t.category === cat);
  }

  getChildren(name: string): TypeNode[] {
    const t = this.get(name);
    if (!t) return [];
    return t.children.map(c => this.get(c)).filter(Boolean) as TypeNode[];
  }

  getAncestors(name: string): TypeNode[] {
    const result: TypeNode[] = [];
    let current = this.get(name);
    while (current && current.parent) {
      const parent = this.get(current.parent);
      if (parent) { result.push(parent); current = parent; }
      else break;
    }
    return result;
  }

  isSubTypeOf(name: string, potentialParent: string): boolean {
    if (name === potentialParent) return true;
    return this.getAncestors(name).some(a => a.name === potentialParent);
  }

  // ─── CUSTOM TYPE DERIVATION ──────────────────────────────────────────────

  derive(baseName: string, custom: {
    name: string;
    constraints?: Partial<GeneSchema>;
    ops?: Partial<GeneTypeOps>;
    description?: string;
  }): TypeNode {
    const base = this.get(baseName);
    if (!base) throw new Error(`Base type '${baseName}' not found`);
    if (this.get(custom.name)) throw new Error(`Type '${custom.name}' already exists`);

    const mergedConstraints = { ...base.constraints, ...custom.constraints } as GeneSchema;

    // Wrap ops to inject constraints automatically
    const wrapValidate = (fn: ValidateFn): ValidateFn =>
      (v, _schema) => fn(v, mergedConstraints);
    const wrapMutate = (fn: MutateFn): MutateFn =>
      (v, rate, rng, _schema) => fn(v, rate, rng, mergedConstraints);
    const wrapDistance = (fn: DistanceFn): DistanceFn =>
      (a, b, _schema) => fn(a, b, mergedConstraints);

    const derived: TypeNode = {
      name: custom.name,
      parent: baseName,
      children: [],
      category: base.category,
      description: custom.description || `${custom.name} (derived from ${baseName})`,
      constraints: mergedConstraints,
      ops: {
        validate: wrapValidate(custom.ops?.validate || base.ops.validate),
        mutate: wrapMutate(custom.ops?.mutate || base.ops.mutate),
        crossover: custom.ops?.crossover || base.ops.crossover,
        distance: wrapDistance(custom.ops?.distance || base.ops.distance),
        canonicalize: custom.ops?.canonicalize || base.ops.canonicalize,
        repair: custom.ops?.repair || base.ops.repair,
      },
    };

    this.customTypes.set(custom.name, derived);
    base.children.push(custom.name);
    return derived;
  }

  // ─── DELETE CUSTOM TYPE ───────────────────────────────────────────────────

  deleteCustom(name: string): boolean {
    const t = this.customTypes.get(name);
    if (!t) return false;
    // Remove from parent's children list
    if (t.parent) {
      const parent = this.types.get(t.parent) || this.customTypes.get(t.parent);
      if (parent) {
        parent.children = parent.children.filter(c => c !== name);
      }
    }
    return this.customTypes.delete(name);
  }

  // ─── PROPERTY-BASED LAW VERIFICATION ──────────────────────────────────────

  verifyLaws(name: string, rng: Xoshiro256StarStar): LawResults {
    const t = this.get(name);
    if (!t) return { valid: false, errors: [`Type '${name}' not found`] };
    const errors: string[] = [];
    const rng2 = new Xoshiro256StarStar(rng.nextU64().toString());

    // Generate a test value
    const testVal = generateTestValue(t.name, t.constraints);
    if (testVal === undefined) {
      return { valid: true, errors: [] };
    }

    // Law 1: Round-trip validity
    const valid = t.ops.validate(testVal, t.constraints);
    if (!valid) errors.push(`Generated test value failed validation for type '${name}'`);

    // Law 2: Distance identity: distance(a, a) == 0
    const selfDist = t.ops.distance(testVal, testVal, t.constraints);
    if (selfDist !== 0) errors.push(`distance(a,a) = ${selfDist}, expected 0`);

    // Law 3: Distance symmetry: distance(a,b) == distance(b,a)
    const testValB = generateTestValue(t.name, t.constraints);
    if (testValB !== undefined) {
      const dAB = t.ops.distance(testVal, testValB, t.constraints);
      const dBA = t.ops.distance(testValB, testVal, t.constraints);
      if (dAB !== dBA) errors.push(`distance(a,b)=${dAB} !== distance(b,a)=${dBA}`);
    }

    // Law 4: Zero-rate mutation identity: mutate(v, 0, rng) == v
    const mutant0 = t.ops.mutate(testVal, 0, rng2, t.constraints);
    if (JSON.stringify(mutant0) !== JSON.stringify(testVal)) {
      errors.push(`mutate(v, 0, rng) changed the value`);
    }

    // Law 5: Determinism — same RNG seed → same result
    const mutSeed = new Xoshiro256StarStar('verify-mut');
    const mut1 = t.ops.mutate(testVal, 0.5, mutSeed, t.constraints);
    const mutSeed2 = new Xoshiro256StarStar('verify-mut');
    const mut2 = t.ops.mutate(testVal, 0.5, mutSeed2, t.constraints);
    if (JSON.stringify(mut1) !== JSON.stringify(mut2)) {
      errors.push(`mutate is not deterministic`);
    }
    const crossSeed1 = new Xoshiro256StarStar('verify-cross');
    const crossSeed2 = new Xoshiro256StarStar('verify-cross');
    const cross1Val = t.ops.crossover(testVal, testValB || testVal, crossSeed1);
    const cross2Val = t.ops.crossover(testVal, testValB || testVal, crossSeed2);
    if (JSON.stringify(cross1Val) !== JSON.stringify(cross2Val)) {
      errors.push(`crossover is not deterministic`);
    }

    return { valid: errors.length === 0, errors };
  }

  // ─── PERSISTENCE ─────────────────────────────────────────────────────────

  /**
   * Serialize custom types to a portable JSON format (operators stored as
   * function bodies that can be reconstructed via new Function() on load).
   */
  serializeCustomTypes(): SerializedCustomType[] {
    const result: SerializedCustomType[] = [];
    for (const [name, t] of this.customTypes) {
      result.push({
        name: t.name,
        parent: t.parent || 'scalar',
        description: t.description,
        constraints: t.constraints ? { ...t.constraints } : undefined,
        opsSource: {
          validate: t.ops.validate.toString(),
          mutate: t.ops.mutate.toString(),
          crossover: t.ops.crossover.toString(),
          distance: t.ops.distance.toString(),
        },
      });
    }
    return result;
  }

  /**
   * Reconstruct custom types from serialized data.
   * Returns the number of types restored.
   */
  deserializeCustomTypes(data: SerializedCustomType[]): number {
    let count = 0;
    for (const entry of data) {
      if (this.get(entry.name)) continue;
      try {
        // Reconstruct operator functions from source
        const ops: GeneTypeOps = {
          validate: new Function('return ' + entry.opsSource.validate)(),
          mutate: new Function('return ' + entry.opsSource.mutate)(),
          crossover: new Function('return ' + entry.opsSource.crossover)(),
          distance: new Function('return ' + entry.opsSource.distance)(),
          canonicalize: new Function('return ' + (entry.opsSource.canonicalize ?? '(v) => v'))(),
          repair: new Function('return ' + (entry.opsSource.repair ?? '(v) => v'))(),
        };
        this.derive(entry.parent, {
          name: entry.name,
          constraints: entry.constraints,
          ops,
          description: entry.description,
        });
        count++;
      } catch {
        // Skip malformed entries silently
      }
    }
    return count;
  }
}

export interface SerializedCustomType {
  name: string;
  parent: string;
  description?: string;
  constraints?: Partial<GeneSchema>;
  opsSource: { validate: string; mutate: string; crossover: string; distance: string; canonicalize?: string; repair?: string };
}

export interface LawResults {
  valid: boolean;
  errors: string[];
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function generateTestValue(typeName: string, constraints?: GeneSchema): any {
  switch (typeName) {
    case 'boolean': return true;
    case 'scalar': case 'vector': case 'dimensional':
    case 'matrix': case 'field': case 'sdf':
      return constraints?.dimensions
        ? Array.from({ length: constraints.dimensions }, () => 0.5)
        : 0.5;
    case 'categorical': return constraints?.choices?.[0] || 'test';
    case 'array': return [0.5, 0.5];
    case 'struct': return {};
    case 'graph': case 'topology': case 'regulatory': case 'expression':
      return { nodes: [], edges: [] };
    case 'temporal': case 'keyframe': case 'envelope':
      return [{ time: 0, value: 0 }, { time: 1, value: 1 }];
    case 'symbolic': return { grammar: 'test', derivation: [] };
    case 'gematria': return { system: 'english', sequence: 'test', value: 42 };
    case 'quantum': return { amplitudes: [{ real: 1, imag: 0 }], basis: ['test'] };
    case 'resonance': return { fundamentals: [432], partials: [{ freq_ratio: 2, amplitude: 0.5, phase: 0 }], damping: 0.5 };
    case 'sovereignty': return { author_pubkey: {}, lineage_proof: [], signature: '' };
    default: return undefined;
  }
}

function deriveSDFOps(): GeneTypeOps {
  return {
    validate: (v, schema) => FLAT_TYPES['field'].validate(v, schema),
    mutate: (v, rate, rng, schema) => FLAT_TYPES['field'].mutate(v, rate, rng, schema),
    crossover: (a, b, rng) => FLAT_TYPES['field'].crossover(a, b, rng),
    distance: (a, b, schema) => FLAT_TYPES['field'].distance(a, b, schema),
    canonicalize: (v, schema) => FLAT_TYPES['field'].canonicalize(v, schema),
    repair: (v, schema) => FLAT_TYPES['field'].repair(v, schema),
  };
}

function makeMatrixOps(): GeneTypeOps {
  const vecOps = FLAT_TYPES['vector'];
  return {
    validate: (v, schema) => Array.isArray(v) && v.length > 0 && v.every((row: any) => vecOps.validate(row, schema)),
    mutate: (v, rate, rng, schema) => (v as any[]).map((row: any) => vecOps.mutate(row, rate, rng, schema)),
    crossover: (a: any[], b: any[], rng) => a.map((row, i) => vecOps.crossover(row, b[i] ?? row, rng)),
    distance: (a: any[], b: any[], schema) => {
      if (a.length !== b.length) return 1;
      return a.reduce((sum, row, i) => sum + vecOps.distance(row, b[i], schema), 0) / a.length;
    },
    canonicalize: (v, schema) => (v as any[]).map((row: any) => vecOps.canonicalize(row, schema)),
    repair: (v, schema) => Array.isArray(v) ? (v as any[]).map((row: any) => vecOps.repair(row, schema)) : [],
  };
}

// ─── SINGLETON ─────────────────────────────────────────────────────────────

export const geneTypeRegistry = new GeneTypeRegistry();

// ─── BACKWARD-COMPATIBLE SHIM ──────────────────────────────────────────────

export const GENE_TYPES: Record<string, GeneTypeOps> = {};
for (const t of LATTICE) {
  GENE_TYPES[t.name] = t.ops;
}
export const GENE_TYPE_LIST = LATTICE.map(t => t.name);
