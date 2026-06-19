/**
 * Gene System Tests — All 17 gene types
 * Tests validation, mutation, crossover, and distance operations
 */

import { describe, it, expect } from 'vitest';
import {
  GENE_TYPES,
  validateGene,
  validateGeneWithDetails,
  mutateGene,
  crossoverGene,
  distanceGene,
} from '../src/lib/kernel/gene_system';
import { Xoshiro256StarStar } from '../src/lib/kernel/rng';

const rng = new Xoshiro256StarStar('test-seed-123');

describe('Gene System — All 17 Types', () => {
  describe('Scalar', () => {
    it('validates numbers within range', () => {
      expect(validateGene('scalar', 0.5, { min: 0, max: 1 })).toBe(true);
      expect(validateGene('scalar', 0, { min: 0, max: 1 })).toBe(true);
      expect(validateGene('scalar', 1, { min: 0, max: 1 })).toBe(true);
    });

    it('rejects numbers outside range', () => {
      expect(validateGene('scalar', -0.1, { min: 0, max: 1 })).toBe(false);
      expect(validateGene('scalar', 1.1, { min: 0, max: 1 })).toBe(false);
    });

    it('rejects non-numbers', () => {
      expect(validateGene('scalar', 'not a number')).toBe(false);
      expect(validateGene('scalar', null)).toBe(false);
      expect(validateGene('scalar', NaN)).toBe(false);
    });

    it('provides detailed validation errors', () => {
      const result = validateGeneWithDetails('scalar', 'invalid', { min: 0, max: 1 });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.suggestion).toBeDefined();
    });

    it('mutates within bounds', () => {
      const mutated = mutateGene('scalar', 0.5, 0.1, rng, { min: 0, max: 1 });
      expect(mutated).toBeGreaterThanOrEqual(0);
      expect(mutated).toBeLessThanOrEqual(1);
    });

    it('crosses over correctly', () => {
      const child = crossoverGene('scalar', 0.2, 0.8, rng);
      expect(child).toBeGreaterThanOrEqual(0.2);
      expect(child).toBeLessThanOrEqual(0.8);
    });

    it('calculates distance correctly', () => {
      const dist = distanceGene('scalar', 0.0, 1.0, { min: 0, max: 1 });
      expect(dist).toBe(1.0);
    });
  });

  describe('Categorical', () => {
    it('validates choices', () => {
      expect(validateGene('categorical', 'warrior', { choices: ['warrior', 'mage', 'rogue'] })).toBe(true);
      expect(validateGene('categorical', 'invalid', { choices: ['warrior', 'mage', 'rogue'] })).toBe(false);
    });

    it('validates strings without schema', () => {
      expect(validateGene('categorical', 'any string')).toBe(true);
    });

    it('rejects non-strings', () => {
      expect(validateGene('categorical', 123)).toBe(false);
      expect(validateGene('categorical', null)).toBe(false);
    });

    it('mutates to valid choice', () => {
      const mutated = mutateGene('categorical', 'warrior', 1.0, rng, { choices: ['warrior', 'mage', 'rogue'] });
      expect(['warrior', 'mage', 'rogue']).toContain(mutated);
    });

    it('crosses over correctly', () => {
      const child = crossoverGene('categorical', 'A', 'B', rng);
      expect(['A', 'B']).toContain(child);
    });

    it('calculates distance correctly', () => {
      expect(distanceGene('categorical', 'A', 'A')).toBe(0.0);
      expect(distanceGene('categorical', 'A', 'B')).toBe(1.0);
    });
  });

  describe('Vector', () => {
    it('validates arrays of numbers', () => {
      expect(validateGene('vector', [0.1, 0.2, 0.3])).toBe(true);
      expect(validateGene('vector', [1, 2, 3, 4, 5])).toBe(true);
    });

    it('validates dimensions', () => {
      expect(validateGene('vector', [0.1, 0.2, 0.3], { dimensions: 3 })).toBe(true);
      expect(validateGene('vector', [0.1, 0.2], { dimensions: 3 })).toBe(false);
    });

    it('rejects non-numeric arrays', () => {
      expect(validateGene('vector', ['a', 'b', 'c'])).toBe(false);
      expect(validateGene('vector', [1, 'a', 3])).toBe(false);
    });

    it('mutates correctly', () => {
      const mutated = mutateGene('vector', [0.5, 0.5, 0.5], 0.1, rng);
      expect(Array.isArray(mutated)).toBe(true);
      expect(mutated.length).toBe(3);
    });

    it('crosses over correctly', () => {
      const child = crossoverGene('vector', [0, 0, 0], [1, 1, 1], rng);
      expect(child.length).toBe(3);
    });

    it('calculates distance correctly', () => {
      const dist = distanceGene('vector', [0, 0, 0], [1, 1, 1]);
      expect(dist).toBeGreaterThan(0);
    });
  });

  describe('Expression', () => {
    it('validates strings', () => {
      expect(validateGene('expression', 'sin(x)')).toBe(true);
      expect(validateGene('expression', 'x + 1')).toBe(true);
    });

    it('rejects empty strings', () => {
      expect(validateGene('expression', '')).toBe(false);
    });

    it('rejects non-strings', () => {
      expect(validateGene('expression', 123)).toBe(false);
    });

    it('mutates correctly', () => {
      const mutated = mutateGene('expression', 'x', 1.0, rng);
      expect(typeof mutated).toBe('string');
      expect(mutated.length).toBeGreaterThan(0);
    });

    it('calculates distance correctly', () => {
      expect(distanceGene('expression', 'x', 'x')).toBe(0.0);
      expect(distanceGene('expression', 'x', 'y')).toBe(1.0);
    });
  });

  describe('Struct', () => {
    it('validates objects', () => {
      expect(validateGene('struct', { a: 1, b: 2 })).toBe(true);
      expect(validateGene('struct', { name: 'test', value: 0.5 })).toBe(true);
    });

    it('rejects arrays', () => {
      expect(validateGene('struct', [1, 2, 3])).toBe(false);
    });

    it('rejects null', () => {
      expect(validateGene('struct', null)).toBe(false);
    });

    it('mutates correctly', () => {
      const mutated = mutateGene('struct', { a: 0.5, b: 0.5 }, 0.1, rng);
      expect(typeof mutated).toBe('object');
      expect(mutated).not.toBeNull();
    });
  });

  describe('Array', () => {
    it('validates arrays', () => {
      expect(validateGene('array', [1, 2, 3])).toBe(true);
      expect(validateGene('array', ['a', 'b', 'c'])).toBe(true);
    });

    it('mutates correctly', () => {
      const mutated = mutateGene('array', [1, 2, 3, 4, 5], 0.1, rng);
      expect(Array.isArray(mutated)).toBe(true);
    });
  });

  describe('Graph', () => {
    it('validates graph structure', () => {
      expect(validateGene('graph', { nodes: [{ id: 1 }], edges: [] })).toBe(true);
    });

    it('mutates correctly', () => {
      const mutated = mutateGene('graph', { nodes: [{ id: 1 }], edges: [] }, 0.1, rng);
      expect(typeof mutated).toBe('object');
    });
  });

  describe('Sovereignty', () => {
    it('requires author_pubkey', () => {
      expect(validateGene('sovereignty', { author_pubkey: '0x123' })).toBe(true);
      expect(validateGene('sovereignty', {})).toBe(false);
    });

    it('is immutable', () => {
      const value = { author_pubkey: '0x123', timestamp: Date.now() };
      const mutated = mutateGene('sovereignty', value, 1.0, rng);
      expect(mutated).toEqual(value); // No change
    });

    it('cannot crossover', () => {
      const a = { author_pubkey: '0x123' };
      const b = { author_pubkey: '0x456' };
      const child = crossoverGene('sovereignty', a, b, rng);
      expect(child).toEqual(a); // Returns first parent
    });
  });

  // Test remaining gene types with basic validation
  describe('Other Gene Types', () => {
    const otherTypes = [
      'topology',
      'temporal',
      'regulatory',
      'field',
      'symbolic',
      'quantum',
      'gematria',
      'resonance',
      'dimensional',
    ];

    otherTypes.forEach((type) => {
      it(`${type} has validation`, () => {
        expect(GENE_TYPES[type]).toBeDefined();
        expect(GENE_TYPES[type].validate).toBeDefined();
        expect(GENE_TYPES[type].mutate).toBeDefined();
        expect(GENE_TYPES[type].crossover).toBeDefined();
        expect(GENE_TYPES[type].distance).toBeDefined();
      });
    });
  });

  describe('Unknown Gene Type', () => {
    it('returns false for unknown types', () => {
      expect(validateGene('invalid_type', 'value')).toBe(false);
    });

    it('provides helpful error message', () => {
      const result = validateGeneWithDetails('invalid_type', 'value');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Unknown'))).toBe(true);
      expect(result.suggestion).toBeDefined();
    });
  });
});

describe('Gene System Helper Functions', () => {
  describe('getGeneTypeInfo', () => {
    it('returns info for all 17 gene types', async () => {
      const { getGeneTypeInfo } = await import('../src/lib/kernel/gene_system');
      const info = getGeneTypeInfo();
      expect(info.length).toBe(17);
      expect(info.map((i) => i.name)).toEqual([
        'scalar',
        'categorical',
        'vector',
        'expression',
        'struct',
        'array',
        'graph',
        'topology',
        'temporal',
        'regulatory',
        'field',
        'symbolic',
        'quantum',
        'gematria',
        'resonance',
        'dimensional',
        'sovereignty',
      ]);
    });
  });
});
