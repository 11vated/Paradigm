import { describe, it, expect } from 'vitest';
import { GeneTypeRegistry, geneTypeRegistry, GENE_TYPE_LIST } from '../../src/lib/kernel/gene-type-registry';
import { Xoshiro256StarStar } from '../../src/lib/kernel/rng';

describe('Gene Type Registry — Lattice', () => {
  it('has all 22 registered types (17 original + 5 new)', () => {
    const all = geneTypeRegistry.getAll();
    expect(all.length).toBe(22);
  });

  it('scalar has vector as child', () => {
    const scalar = geneTypeRegistry.get('scalar');
    expect(scalar!.children).toContain('vector');
  });

  it('vector is a subtype of scalar', () => {
    expect(geneTypeRegistry.isSubTypeOf('vector', 'scalar')).toBe(true);
  });

  it('topology is subtype of graph, sovereignty is subtype of struct', () => {
    expect(geneTypeRegistry.isSubTypeOf('topology', 'graph')).toBe(true);
    expect(geneTypeRegistry.isSubTypeOf('sovereignty', 'struct')).toBe(true);
    expect(geneTypeRegistry.isSubTypeOf('scalar', 'categorical')).toBe(false);
  });

  it('dimensional ancestors include vector and scalar', () => {
    const ancestors = geneTypeRegistry.getAncestors('dimensional');
    expect(ancestors.some(a => a.name === 'vector')).toBe(true);
    expect(ancestors.some(a => a.name === 'scalar')).toBe(true);
  });

  it('each category has at least one type', () => {
    for (const cat of ['primitive', 'container', 'spatial', 'temporal', 'symbolic', 'learned', 'meta']) {
      expect(geneTypeRegistry.getCategory(cat).length).toBeGreaterThan(0);
    }
  });
});

describe('Gene Type Registry — Custom Type Derivation', () => {
  const registry = new GeneTypeRegistry();

  it('derives a bounded scalar from scalar', () => {
    const t = registry.derive('scalar', {
      name: 'bounded_scalar',
      constraints: { min: 0, max: 1 },
    });
    expect(t.ops.validate(0.5)).toBe(true);
    expect(t.ops.validate(-1)).toBe(false);
    expect(t.ops.validate(2)).toBe(false);
  });

  it('derives a dimension-constrained vector', () => {
    const t = registry.derive('vector', {
      name: 'rgb_vector',
      constraints: { dimensions: 3 },
    });
    expect(t.ops.validate([255, 128, 0])).toBe(true);
    expect(t.ops.validate([255, 128])).toBe(false);
    expect(t.ops.validate('not-array')).toBe(false);
  });

  it('derives with custom operators', () => {
    const t = registry.derive('scalar', {
      name: 'parity_scalar',
      ops: { distance: (a: number, b: number) => Math.round(a) % 2 === Math.round(b) % 2 ? 1 : 0 },
    });
    // same parity → distance 1; different parity → distance 0
    expect(t.ops.distance(2, 4)).toBe(1);
    expect(t.ops.distance(2, 3)).toBe(0);
  });

  it('throws on duplicate name', () => {
    expect(() => registry.derive('scalar', { name: 'bounded_scalar' })).toThrow();
  });

  it('derived type passes law verification', () => {
    const rng = new Xoshiro256StarStar('test-derived-laws');
    const result = registry.verifyLaws('bounded_scalar', rng);
    expect(result.valid).toBe(true);
  });
});

describe('Gene Type Registry — Law Verification', () => {
  it('scalar passes all laws', () => {
    const rng = new Xoshiro256StarStar('law-test-scalar');
    expect(geneTypeRegistry.verifyLaws('scalar', rng).valid).toBe(true);
  });

  it('categorical passes all laws', () => {
    const rng = new Xoshiro256StarStar('law-test-cat');
    expect(geneTypeRegistry.verifyLaws('categorical', rng).valid).toBe(true);
  });

  it('boolean passes all laws', () => {
    const rng = new Xoshiro256StarStar('law-test-bool');
    expect(geneTypeRegistry.verifyLaws('boolean', rng).valid).toBe(true);
  });

  it('fails verification for non-existent type', () => {
    const rng = new Xoshiro256StarStar('law-test-none');
    expect(geneTypeRegistry.verifyLaws('nonexistent_type', rng).valid).toBe(false);
  });
});

describe('Gene Type Registry — GENE_TYPE_LIST', () => {
  it('includes all original 17 types plus new types', () => {
    const original = ['scalar', 'categorical', 'vector', 'expression', 'struct', 'array',
      'graph', 'topology', 'temporal', 'regulatory', 'field', 'symbolic',
      'quantum', 'gematria', 'resonance', 'dimensional', 'sovereignty'];
    for (const t of original) expect(GENE_TYPE_LIST).toContain(t);
    for (const t of ['boolean', 'matrix', 'sdf', 'keyframe', 'envelope']) {
      expect(GENE_TYPE_LIST).toContain(t);
    }
  });
});
