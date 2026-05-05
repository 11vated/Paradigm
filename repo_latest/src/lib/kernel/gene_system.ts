/**
 * Paradigm Absolute — Gene System: All 17 gene types with 4 operators each.
 * Ported from Python gene_system.py. Every operator is fully deterministic
 * given the same RNG state (xoshiro256**).
 */
import { Xoshiro256StarStar } from './rng.js';

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

interface GeneSchema {
  min?: number;
  max?: number;
  choices?: string[];
  dimensions?: number;
  [key: string]: any;
}

type ValidateFn = (value: any, schema?: GeneSchema) => boolean;
type MutateFn = (value: any, rate: number, rng: Xoshiro256StarStar, schema?: GeneSchema) => any;
type CrossoverFn = (a: any, b: any, rng: Xoshiro256StarStar) => any;
type DistanceFn = (a: any, b: any, schema?: GeneSchema) => number;

interface GeneTypeOps {
  validate: ValidateFn;
  mutate: MutateFn;
  crossover: CrossoverFn;
  distance: DistanceFn;
}

// ─── 1. SCALAR ────────────────────────────────────────────────────────────────
const scalar: GeneTypeOps = {
  validate(value, schema) {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) return false;
    if (schema) {
      const lo = schema.min ?? -Infinity;
      const hi = schema.max ?? Infinity;
      if (value < lo || value > hi) return false;
    }
    return true;
  },
  mutate(value, rate, rng, schema) {
    const lo = schema?.min ?? 0.0;
    const hi = schema?.max ?? 1.0;
    const sigma = rate * (hi - lo);
    return clamp(value + sigma * rng.nextGaussian(), lo, hi);
  },
  crossover(a, b, rng) {
    const alpha = rng.nextF64();
    return a + alpha * (b - a);
  },
  distance(a, b, schema) {
    const lo = schema?.min ?? 0.0;
    const hi = schema?.max ?? 1.0;
    const r = hi - lo > 0 ? hi - lo : 1.0;
    return Math.abs(a - b) / r;
  }
};

// ─── 2. CATEGORICAL ───────────────────────────────────────────────────────────
const categorical: GeneTypeOps = {
  validate(value, schema) {
    if (typeof value !== 'string') return false;
    if (schema?.choices) return schema.choices.includes(value);
    return true;
  },
  mutate(value, rate, rng, schema) {
    const choices = schema?.choices ?? [value];
    if (rng.nextF64() < rate && choices.length > 1) {
      const others = choices.filter(c => c !== value);
      return others.length > 0 ? rng.nextChoice(others) : value;
    }
    return value;
  },
  crossover(a, b, rng) {
    return rng.nextBool() ? a : b;
  },
  distance(a, b) {
    return a === b ? 0.0 : 1.0;
  }
};

// ─── 3. VECTOR ────────────────────────────────────────────────────────────────
const vector: GeneTypeOps = {
  validate(value, schema) {
    if (!Array.isArray(value)) return false;
    if (schema?.dimensions && value.length !== schema.dimensions) return false;
    return value.every(v => typeof v === 'number' && !isNaN(v));
  },
  mutate(value, rate, rng) {
    return value.map((v: number) => clamp(v + rate * rng.nextGaussian(), 0.0, 1.0));
  },
  crossover(a, b, rng) {
    return a.map((ai: number, i: number) => ai + rng.nextF64() * ((b[i] ?? ai) - ai));
  },
  distance(a, b) {
    let sum = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      sum += (a[i] - b[i]) ** 2;
    }
    return Math.sqrt(sum);
  }
};

// ─── 4. EXPRESSION ────────────────────────────────────────────────────────────
const expression: GeneTypeOps = {
  validate(value) {
    return typeof value === 'string' && value.length > 0;
  },
  mutate(value, rate, rng) {
    const ops = ['+', '-', '*', '/'];
    const fns = ['sin', 'cos', 'abs', 'sqrt'];
    if (rng.nextF64() < rate) {
      if (rng.nextBool()) {
        return `${rng.nextChoice(fns)}(${value})`;
      } else {
        const c = Math.round(rng.nextF64() * 200) / 100;
        return `(${value}) ${rng.nextChoice(ops)} ${c}`;
      }
    }
    return value;
  },
  crossover(a, b, rng) {
    return rng.nextBool() ? a : b;
  },
  distance(a, b) {
    return a === b ? 0.0 : 1.0;
  }
};

// ─── 5. STRUCT ────────────────────────────────────────────────────────────────
const struct: GeneTypeOps = {
  validate(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  },
  mutate(value, rate, rng) {
    const result = JSON.parse(JSON.stringify(value));
    const keys = Object.keys(result);
    if (keys.length > 0 && rng.nextF64() < rate) {
      const key = rng.nextChoice(keys);
      const v = result[key];
      if (typeof v === 'number') {
        result[key] = v + rate * rng.nextGaussian();
      }
    }
    return result;
  },
  crossover(a, b, rng) {
    const result: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of allKeys) {
      if (k in a && k in b) result[k] = rng.nextBool() ? a[k] : b[k];
      else if (k in a) result[k] = a[k];
      else result[k] = b[k];
    }
    return result;
  },
  distance(a, b) {
    const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
    if (allKeys.size === 0) return 0.0;
    let diffs = 0;
    for (const k of allKeys) {
      if (!(k in a) || !(k in b)) diffs += 1;
      else if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs += 0.5;
    }
    return diffs / allKeys.size;
  }
};

// ─── 6. ARRAY ─────────────────────────────────────────────────────────────────
const array: GeneTypeOps = {
  validate(value) {
    return Array.isArray(value);
  },
  mutate(value, rate, rng) {
    const result = JSON.parse(JSON.stringify(value));
    if (result.length > 0 && rng.nextF64() < rate) {
      const idx = rng.nextInt(0, result.length - 1);
      if (typeof result[idx] === 'number') {
        result[idx] = result[idx] + rate * rng.nextGaussian();
      }
    }
    return result;
  },
  crossover(a, b, rng) {
    if (!a.length || !b.length) return a.length ? a : b;
    const point = rng.nextInt(0, Math.min(a.length, b.length) - 1);
    return [...a.slice(0, point), ...b.slice(point)];
  },
  distance(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0.0;
    let diffs = Math.abs(a.length - b.length);
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) diffs += 1;
    }
    return diffs / maxLen;
  }
};

// ─── 7. GRAPH ─────────────────────────────────────────────────────────────────
const graph: GeneTypeOps = {
  validate(value) {
    return typeof value === 'object' && value !== null && 'nodes' in value && 'edges' in value;
  },
  mutate(value, rate, rng) {
    const result = JSON.parse(JSON.stringify(value)) as any;
    if (rng.nextF64() < rate) {
      const op = rng.nextInt(0, 2);
      if (op === 0 && result.nodes?.length) {
        const node = rng.nextChoice(result.nodes as any[]);
        if ('weight' in node) {
          node.weight = clamp(node.weight + rng.nextGaussian() * rate, 0, 1);
        }
      } else if (op === 1 && result.nodes?.length > 1) {
        const n1 = rng.nextChoice(result.nodes as any[]);
        const n2 = rng.nextChoice(result.nodes as any[]);
        if (n1.id !== n2.id) {
          result.edges.push({ from: n1.id, to: n2.id, weight: rng.nextF64() });
        }
      } else if (op === 2 && result.edges?.length) {
        const idx = rng.nextInt(0, result.edges.length - 1);
        result.edges.splice(idx, 1);
      }
    }
    return result;
  },
  crossover(a, b, rng) {
    return rng.nextBool() ? JSON.parse(JSON.stringify(a)) : JSON.parse(JSON.stringify(b));
  },
  distance(a, b) {
    const aGraph = a as any;
    const bGraph = b as any;
    return Math.abs((aGraph.nodes?.length ?? 0) - (bGraph.nodes?.length ?? 0)) +
           Math.abs((aGraph.edges?.length ?? 0) - (bGraph.edges?.length ?? 0));
  }
};

// ─── 8. TOPOLOGY ──────────────────────────────────────────────────────────────
const topology: GeneTypeOps = {
  validate(value) {
    return typeof value === 'object' && value !== null;
  },
  mutate(value, rate, rng) {
    const result = JSON.parse(JSON.stringify(value));
    if (result.vertices?.length && rng.nextF64() < rate) {
      const idx = rng.nextInt(0, result.vertices.length - 1);
      result.vertices[idx] = result.vertices[idx].map((v: number) => v + rate * rng.nextGaussian());
    }
    return result;
  },
  crossover(a, b, rng) {
    return rng.nextBool() ? JSON.parse(JSON.stringify(a)) : JSON.parse(JSON.stringify(b));
  },
  distance(a, b) {
    return JSON.stringify(a) === JSON.stringify(b) ? 0.0 : 1.0;
  }
};

// ─── 9. TEMPORAL ──────────────────────────────────────────────────────────────
const temporal: GeneTypeOps = {
  validate(value) {
    if (typeof value !== 'object' || value === null) return false;
    return 'keyframes' in value || 'expression' in value || 'envelope' in value;
  },
  mutate(value, rate, rng) {
    const result = JSON.parse(JSON.stringify(value));
    if (result.keyframes?.length && rng.nextF64() < rate) {
      const idx = rng.nextInt(0, result.keyframes.length - 1);
      result.keyframes[idx].value += rate * rng.nextGaussian();
    }
    if (result.envelope && rng.nextF64() < rate) {
      for (const k of ['attack', 'decay', 'sustain', 'release']) {
        if (k in result.envelope) {
          result.envelope[k] = clamp(result.envelope[k] + rate * rng.nextGaussian() * 0.1, 0, 2);
        }
      }
    }
    return result;
  },
  crossover(a, b, rng) {
    return rng.nextBool() ? JSON.parse(JSON.stringify(a)) : JSON.parse(JSON.stringify(b));
  },
  distance(a, b) {
    return JSON.stringify(a) === JSON.stringify(b) ? 0.0 : 1.0;
  }
};

// ─── 10. REGULATORY ───────────────────────────────────────────────────────────
const regulatory: GeneTypeOps = {
  validate(value) {
    return typeof value === 'object' && value !== null && 'nodes' in value && 'edges' in value;
  },
  mutate(value, rate, rng) {
    const result = JSON.parse(JSON.stringify(value)) as any;
    if (result.edges?.length && rng.nextF64() < rate) {
      const edge = rng.nextChoice(result.edges as any[]);
      if ('weight' in edge) {
        edge.weight = clamp(edge.weight + rate * rng.nextGaussian(), -1, 1);
      }
    }
    return result;
  },
  crossover(a, b, rng) {
    return rng.nextBool() ? JSON.parse(JSON.stringify(a)) : JSON.parse(JSON.stringify(b));
  },
  distance(a, b) {
    return JSON.stringify(a) === JSON.stringify(b) ? 0.0 : 1.0;
  }
};

// ─── 11. FIELD ────────────────────────────────────────────────────────────────
const field: GeneTypeOps = {
  validate(value) {
    return typeof value === 'object' && value !== null && 'type' in value;
  },
  mutate(value, rate, rng) {
    const result = JSON.parse(JSON.stringify(value));
    if (result.parameters) {
      for (const k of Object.keys(result.parameters)) {
        if (typeof result.parameters[k] === 'number') {
          result.parameters[k] += rate * rng.nextGaussian();
        }
      }
    }
    return result;
  },
  crossover(a, b, rng) {
    return rng.nextBool() ? JSON.parse(JSON.stringify(a)) : JSON.parse(JSON.stringify(b));
  },
  distance(a, b) {
    return JSON.stringify(a) === JSON.stringify(b) ? 0.0 : 1.0;
  }
};

// ─── 12. SYMBOLIC ─────────────────────────────────────────────────────────────
const symbolic: GeneTypeOps = {
  validate(value) {
    return typeof value === 'string' || typeof value === 'object' || Array.isArray(value);
  },
  mutate(value, rate, rng) {
    if (typeof value === 'string' && rng.nextF64() < rate) {
      return value + ' (mutated)';
    }
    return value;
  },
  crossover(a, b, rng) {
    return rng.nextBool() ? a : b;
  },
  distance(a, b) {
    return JSON.stringify(a) === JSON.stringify(b) ? 0.0 : 1.0;
  }
};

// ─── 13. QUANTUM ──────────────────────────────────────────────────────────────
const quantum: GeneTypeOps = {
  validate(value) {
    if (typeof value !== 'object' || value === null) return false;
    if (!('amplitudes' in value) || !('basis' in value)) return false;
    return value.amplitudes.length === value.basis.length;
  },
  mutate(value, rate, rng) {
    const result = JSON.parse(JSON.stringify(value));
    const amps: number[] = result.amplitudes;
    if (amps.length && rng.nextF64() < rate) {
      const idx = rng.nextInt(0, amps.length - 1);
      amps[idx] = clamp(amps[idx] + rate * rng.nextGaussian() * 0.1, 0, 1);
      // Re-normalize amplitudes (Born rule: sum of |a|^2 = 1)
      const total = Math.sqrt(amps.reduce((s, a) => s + a * a, 0));
      if (total > 0) {
        result.amplitudes = amps.map(a => a / total);
      }
    }
    return result;
  },
  crossover(a, b, rng) {
    if (a.basis.length !== b.basis.length) return rng.nextBool() ? a : b;
    const alpha = rng.nextF64();
    const amps = a.amplitudes.map((ai: number, i: number) => ai * alpha + b.amplitudes[i] * (1 - alpha));
    const total = Math.sqrt(amps.reduce((s: number, x: number) => s + x * x, 0));
    return {
      amplitudes: total > 0 ? amps.map((x: number) => x / total) : amps,
      basis: a.basis
    };
  },
  distance(a, b) {
    if (a.amplitudes.length !== b.amplitudes.length) return 1.0;
    const dot = a.amplitudes.reduce((s: number, ai: number, i: number) => s + ai * b.amplitudes[i], 0);
    return 1.0 - Math.abs(dot) ** 2;
  }
};

// ─── 14. GEMATRIA ─────────────────────────────────────────────────────────────
const gematria: GeneTypeOps = {
  validate(value) {
    return typeof value === 'object' && value !== null && 'sequence' in value && 'system' in value;
  },
  mutate(value, rate, rng) {
    const result = JSON.parse(JSON.stringify(value));
    if (rng.nextF64() < rate) {
      const seq = result.sequence.split('');
      if (seq.length > 0) {
        const idx = rng.nextInt(0, seq.length - 1);
        const offset = rng.nextInt(-3, 3);
        const c = seq[idx].charCodeAt(0) + offset;
        if (c >= 32 && c <= 126) seq[idx] = String.fromCharCode(c);
        result.sequence = seq.join('');
      }
    }
    result.computed_value = result.sequence.split('').reduce((s: number, c: string) => s + c.charCodeAt(0), 0);
    return result;
  },
  crossover(a, b, rng) {
    return rng.nextBool() ? JSON.parse(JSON.stringify(a)) : JSON.parse(JSON.stringify(b));
  },
  distance(a, b) {
    return Math.abs((a.computed_value ?? 0) - (b.computed_value ?? 0));
  }
};

// ─── 15. RESONANCE ────────────────────────────────────────────────────────────
const resonance: GeneTypeOps = {
  validate(value) {
    return typeof value === 'object' && value !== null && 'fundamentals' in value;
  },
  mutate(value, rate, rng) {
    const result = JSON.parse(JSON.stringify(value)) as any;
    if (result.partials?.length && rng.nextF64() < rate) {
      const p = rng.nextChoice(result.partials as any[]);
      p.amplitude = clamp(p.amplitude + rate * rng.nextGaussian() * 0.1, 0, 1);
    }
    if (result.fundamentals?.length && rng.nextF64() < rate) {
      const idx = rng.nextInt(0, result.fundamentals.length - 1);
      result.fundamentals[idx] = Math.max(20, result.fundamentals[idx] + rate * rng.nextGaussian() * 50);
    }
    return result;
  },
  crossover(a, b, rng) {
    return rng.nextBool() ? JSON.parse(JSON.stringify(a)) : JSON.parse(JSON.stringify(b));
  },
  distance(a, b) {
    const af = a.fundamentals ?? [];
    const bf = b.fundamentals ?? [];
    if (!af.length || !bf.length) return 1.0;
    return Math.abs(af[0] - bf[0]) / Math.max(af[0], bf[0], 1);
  }
};

// ─── 16. DIMENSIONAL ──────────────────────────────────────────────────────────
const dimensional: GeneTypeOps = {
  validate(value) {
    return Array.isArray(value) && value.every(v => typeof v === 'number');
  },
  mutate(value, rate, rng) {
    return value.map((v: number) => v + rate * rng.nextGaussian() * 0.1);
  },
  crossover(a, b, rng) {
    if (a.length !== b.length) return a;
    const t = rng.nextF64();
    const result = a.map((ai: number, i: number) => ai * (1 - t) + b[i] * t);
    const norm = Math.sqrt(result.reduce((s: number, x: number) => s + x * x, 0));
    return norm > 0 ? result.map((x: number) => x / norm) : result;
  },
  distance(a, b) {
    if (a.length !== b.length) return 1.0;
    const dot = a.reduce((s: number, ai: number, i: number) => s + ai * b[i], 0);
    const na = Math.sqrt(a.reduce((s: number, x: number) => s + x * x, 0));
    const nb = Math.sqrt(b.reduce((s: number, x: number) => s + x * x, 0));
    return (na === 0 || nb === 0) ? 1.0 : 1.0 - Math.abs(dot / (na * nb));
  }
};

// ─── 17. SOVEREIGNTY ──────────────────────────────────────────────────────────
const sovereignty: GeneTypeOps = {
  validate(value) {
    return typeof value === 'object' && value !== null && 'author_pubkey' in value;
  },
  mutate(value) {
    return value; // Immutable — mutation forbidden
  },
  crossover(a) {
    return a; // Crossover forbidden
  },
  distance(a, b) {
    return a?.author_pubkey === b?.author_pubkey ? 0.0 : 1.0;
  }
};

// ─── REGISTRY ─────────────────────────────────────────────────────────────────
export const GENE_TYPES: Record<string, GeneTypeOps> = {
  scalar, categorical, vector, expression, struct, array, graph,
  topology, temporal, regulatory, field, symbolic, quantum,
  gematria, resonance, dimensional, sovereignty
};

export function validateGene(geneType: string, value: any, schema?: GeneSchema): boolean {
  const ops = GENE_TYPES[geneType];
  return ops ? ops.validate(value, schema) : false;
}

export function mutateGene(geneType: string, value: any, rate: number, rng: Xoshiro256StarStar, schema?: GeneSchema): any {
  const ops = GENE_TYPES[geneType];
  return ops ? ops.mutate(value, rate, rng, schema) : value;
}

export function crossoverGene(geneType: string, a: any, b: any, rng: Xoshiro256StarStar): any {
  const ops = GENE_TYPES[geneType];
  return ops ? ops.crossover(a, b, rng) : a;
}

export function distanceGene(geneType: string, a: any, b: any, schema?: GeneSchema): number {
  const ops = GENE_TYPES[geneType];
  return ops ? ops.distance(a, b, schema) : 1.0;
}

export function getGeneTypeInfo() {
  return [
    { id: 1, name: 'scalar', encodes: 'Continuous numeric values', example: 'size, intensity, speed' },
    { id: 2, name: 'categorical', encodes: 'Discrete choices from finite sets', example: 'species, genre, archetype' },
    { id: 3, name: 'vector', encodes: 'Multi-dimensional numeric arrays', example: 'color(rgb), position(xyz)' },
    { id: 4, name: 'expression', encodes: 'Runtime-evaluated mathematical formulas', example: 'x → sin(x*π)/2' },
    { id: 5, name: 'struct', encodes: 'Composite records with named fields', example: '{head, torso, limbs}' },
    { id: 6, name: 'array', encodes: 'Ordered homogeneous collections', example: 'melody_notes[32]' },
    { id: 7, name: 'graph', encodes: 'Nodes and edges encoding relational structure', example: 'state_machine, skill_tree' },
    { id: 8, name: 'topology', encodes: 'Surface and manifold descriptions', example: 'silhouette, blend_shapes' },
    { id: 9, name: 'temporal', encodes: 'Time-varying signals and envelopes', example: 'motion_curve, ADSR' },
    { id: 10, name: 'regulatory', encodes: 'Gene-expression control networks', example: 'personality → behavior_bias' },
    { id: 11, name: 'field', encodes: 'Continuous spatial distributions', example: 'density_field, temperature_map' },
    { id: 12, name: 'symbolic', encodes: 'Abstract symbolic representations', example: 'story_grammar, dialogue_tree' },
    { id: 13, name: 'quantum', encodes: 'Superposition and entanglement states', example: 'style_superposition(cubist, art_nouveau)' },
    { id: 14, name: 'gematria', encodes: 'Numerological / symbolic-numeric encodings', example: 'name_numerology, title_resonance' },
    { id: 15, name: 'resonance', encodes: 'Harmonic frequency profiles', example: 'voice_timbre, material_tap_tone' },
    { id: 16, name: 'dimensional', encodes: 'Embedding-space coordinates', example: 'style_embedding, semantic_vector' },
    { id: 17, name: 'sovereignty', encodes: 'Cryptographic ownership chains', example: 'author_key, lineage_proof' },
  ];
}
