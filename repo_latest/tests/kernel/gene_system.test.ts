/**
 * Unit tests for the 17-type gene system
 * Validates: validation, mutation, crossover, distance for each type
 */
import { describe, it, expect } from 'vitest';
import {
  GENE_TYPES, validateGene, mutateGene, crossoverGene, distanceGene, getGeneTypeInfo
} from '../../src/lib/kernel/gene_system.js';
import { Xoshiro256StarStar } from '../../src/lib/kernel/rng.js';

function makeRng(seed: number = 42): Xoshiro256StarStar {
  return new Xoshiro256StarStar(BigInt(seed));
}

describe('Gene System', () => {
  describe('registry', () => {
    it('has exactly 17 gene types', () => {
      expect(Object.keys(GENE_TYPES).length).toBe(17);
    });

    it('every type has all 4 operators', () => {
      for (const [name, ops] of Object.entries(GENE_TYPES) as [string, any][]) {
        expect(ops).toHaveProperty('validate');
        expect(ops).toHaveProperty('mutate');
        expect(ops).toHaveProperty('crossover');
        expect(ops).toHaveProperty('distance');
      }
    });

    it('includes all expected types', () => {
      const expected = [
        'scalar', 'categorical', 'vector', 'expression', 'struct', 'array',
        'graph', 'topology', 'temporal', 'regulatory', 'field', 'symbolic',
        'quantum', 'gematria', 'resonance', 'dimensional', 'sovereignty',
      ];
      for (const t of expected) {
        expect(GENE_TYPES).toHaveProperty(t);
      }
    });
  });

  describe('getGeneTypeInfo', () => {
    it('returns an array of 17 type descriptions', () => {
      const info = getGeneTypeInfo();
      expect(Array.isArray(info)).toBe(true);
      expect(info.length).toBe(17);
    });

    it('each entry has id, name, encodes, example', () => {
      for (const entry of getGeneTypeInfo()) {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('name');
        expect(entry).toHaveProperty('encodes');
        expect(entry).toHaveProperty('example');
      }
    });
  });

  describe('scalar', () => {
    it('validates numbers', () => {
      expect(validateGene('scalar', 0.5)).toBe(true);
      expect(validateGene('scalar', 0)).toBe(true);
      expect(validateGene('scalar', 50)).toBe(true);
    });

    it('rejects non-numbers', () => {
      expect(validateGene('scalar', 'hello')).toBe(false);
    });

    it('mutates and returns a number', () => {
      const rng = makeRng();
      for (let i = 0; i < 100; i++) {
        const mutated = mutateGene('scalar', 0.5, 0.1, rng);
        expect(typeof mutated).toBe('number');
      }
    });

    it('crossover blends values', () => {
      const rng = makeRng();
      const results: number[] = [];
      for (let i = 0; i < 100; i++) {
        results.push(crossoverGene('scalar', 0.2, 0.8, rng) as number);
      }
      const mean = results.reduce((a, b) => a + b, 0) / results.length;
      expect(mean).toBeGreaterThan(0.25);
      expect(mean).toBeLessThan(0.75);
    });

    it('distance works correctly', () => {
      expect(distanceGene('scalar', 0.3, 0.7)).toBeCloseTo(0.4, 5);
      expect(distanceGene('scalar', 0.5, 0.5)).toBeCloseTo(0, 5);
    });
  });

  describe('categorical', () => {
    it('validates strings', () => {
      expect(validateGene('categorical', 'warrior')).toBe(true);
      expect(validateGene('categorical', 123)).toBe(false);
    });

    it('crossover returns one parent', () => {
      const rng = makeRng();
      for (let i = 0; i < 50; i++) {
        const result = crossoverGene('categorical', 'alpha', 'beta', rng);
        expect(['alpha', 'beta']).toContain(result);
      }
    });

    it('distance is 0 for same, 1 for different', () => {
      expect(distanceGene('categorical', 'same', 'same')).toBe(0);
      expect(distanceGene('categorical', 'a', 'b')).toBe(1);
    });
  });

  describe('vector', () => {
    it('validates arrays of numbers', () => {
      expect(validateGene('vector', [1, 2, 3])).toBe(true);
      expect(validateGene('vector', 'not-array')).toBe(false);
    });

    it('mutates preserving length', () => {
      const rng = makeRng();
      const mutated = mutateGene('vector', [0.1, 0.5, 0.9], 0.2, rng) as number[];
      expect(mutated.length).toBe(3);
    });

    it('distance to self is 0', () => {
      expect(distanceGene('vector', [0.5, 0.5], [0.5, 0.5])).toBeCloseTo(0, 5);
    });
  });

  describe('sovereignty (immutable)', () => {
    const validSov = { author_pubkey: '0xdeadbeef', lineage: ['root'] };

    it('validates objects with author_pubkey', () => {
      expect(validateGene('sovereignty', validSov)).toBe(true);
    });

    it('rejects non-objects', () => {
      expect(validateGene('sovereignty', 'just a string')).toBe(false);
    });

    it('mutate returns original', () => {
      const rng = makeRng();
      expect(mutateGene('sovereignty', validSov, 0.5, rng)).toBe(validSov);
    });

    it('crossover returns parent A', () => {
      const rng = makeRng();
      const b = { author_pubkey: '0xcafe', lineage: ['other'] };
      expect(crossoverGene('sovereignty', validSov, b, rng)).toBe(validSov);
    });
  });

  describe('quantum', () => {
    const q = { amplitudes: [0.707, 0.707], basis: ['|0>', '|1>'] };

    it('validates objects with amplitudes + basis', () => {
      expect(validateGene('quantum', q)).toBe(true);
      expect(validateGene('quantum', [0.707, 0.707])).toBe(false);
    });

    it('mutation preserves normalization', () => {
      const rng = makeRng();
      const mutated = mutateGene('quantum', q, 0.5, rng) as any;
      const sumSq = mutated.amplitudes.reduce((s: number, v: number) => s + v * v, 0);
      expect(sumSq).toBeCloseTo(1, 1);
    });
  });

  describe('all types smoke test', () => {
    const sampleValues: Record<string, any> = {
      scalar: 0.5,
      categorical: 'test',
      vector: [0.1, 0.5, 0.9],
      expression: 'sin(x) + cos(y)',
      struct: { a: 1, b: 'hello' },
      array: [1, 2, 3, 4, 5],
      graph: { nodes: ['a', 'b'], edges: [['a', 'b']] },
      topology: 'sphere',
      temporal: [{ t: 0, v: 0 }, { t: 1, v: 1 }],
      regulatory: [0.5, -0.3, 0.8],
      field: { basis: 'fourier', coeffs: [1, 0.5, 0.25] },
      symbolic: '(+ x (* 2 y))',
      quantum: { amplitudes: [0.707, 0.707], basis: ['|0>', '|1>'] },
      gematria: { sequence: 'hello', system: 'hebrew', computed_value: 532 },
      resonance: { fundamentals: [440, 880], partials: [{ freq: 440, amplitude: 1.0 }] },
      dimensional: [0.1, 0.2, 0.3, 0.4, 0.5],
      sovereignty: { author_pubkey: '0xdeadbeef', lineage: ['root'] },
    };

    for (const [type, value] of Object.entries(sampleValues)) {
      it(`${type}: mutate does not throw`, () => {
        const rng = makeRng();
        expect(() => mutateGene(type, value, 0.2, rng)).not.toThrow();
      });

      it(`${type}: crossover does not throw`, () => {
        const rng = makeRng();
        expect(() => crossoverGene(type, value, value, rng)).not.toThrow();
      });

      it(`${type}: distance does not throw`, () => {
        expect(() => distanceGene(type, value, value)).not.toThrow();
      });

      it(`${type}: distance to self is near 0`, () => {
        const d = distanceGene(type, value, value);
        expect(d).toBeGreaterThanOrEqual(0);
        expect(d).toBeLessThanOrEqual(0.01);
      });
    }
  });
});
