/**
 * Tests for VCS object model — canonical JSON, hashing, tree/commit shapes.
 *
 * The canonical-hash contract is load-bearing for the whole VCS: if it
 * drifts, every stored hash becomes unreachable. These tests pin behavior
 * like "key order doesn't matter", "finite numbers only", and "deep
 * structural equality" so any accidental change surfaces immediately.
 */
import { describe, it, expect } from 'vitest';
import {
  canonicalJson,
  hashJson,
  hashTree,
  hashCommit,
  treeFromSeed,
  makeCommit,
  type SeedTree,
} from '../../src/lib/vcs/objects.js';

describe('canonicalJson', () => {
  it('sorts object keys recursively', () => {
    const a = canonicalJson({ b: 2, a: 1, c: { z: 1, y: 2 } });
    const b = canonicalJson({ a: 1, b: 2, c: { y: 2, z: 1 } });
    expect(a).toBe(b);
    expect(a).toBe('{"a":1,"b":2,"c":{"y":2,"z":1}}');
  });

  it('preserves array order', () => {
    expect(canonicalJson([3, 1, 2])).toBe('[3,1,2]');
  });

  it('handles nested mixed types', () => {
    expect(canonicalJson({ a: [1, { b: 2, a: 1 }] })).toBe('{"a":[1,{"a":1,"b":2}]}');
  });

  it('rejects NaN and Infinity', () => {
    expect(() => canonicalJson({ v: NaN })).toThrow();
    expect(() => canonicalJson({ v: Infinity })).toThrow();
  });

  it('rejects functions and symbols', () => {
    expect(() => canonicalJson({ f: () => 1 })).toThrow();
    expect(() => canonicalJson({ s: Symbol('x') })).toThrow();
  });

  it('omits undefined like JSON.stringify', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it('rejects circular references', () => {
    const obj: any = { a: 1 };
    obj.self = obj;
    expect(() => canonicalJson(obj)).toThrow(/circular/);
  });

  it('handles empty object and empty array', () => {
    expect(canonicalJson({})).toBe('{}');
    expect(canonicalJson([])).toBe('[]');
  });
});

describe('hashJson', () => {
  it('is deterministic across key orderings', () => {
    const h1 = hashJson({ a: 1, b: 2 });
    const h2 = hashJson({ b: 2, a: 1 });
    expect(h1).toBe(h2);
  });

  it('produces 64-hex SHA-256', () => {
    const h = hashJson({ x: 1 });
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes with content', () => {
    expect(hashJson({ a: 1 })).not.toBe(hashJson({ a: 2 }));
  });
});

describe('treeFromSeed', () => {
  it('extracts content fields and strips runtime state', () => {
    const tree = treeFromSeed({
      $domain: 'audio',
      $name: 'wave',
      $hash: 'deadbeef',
      $fitness: { overall: 0.9 },
      $embedding: [0.1, 0.2],
      $lineage: { generation: 2, operation: 'mutate' },
      genes: { amp: { type: 'scalar', value: 0.5 } },
    } as any);
    expect(tree.kind).toBe('tree');
    expect(tree.version).toBe(1);
    expect(tree.domain).toBe('audio');
    expect(tree.name).toBe('wave');
    expect(tree.genes.amp.value).toBe(0.5);
    expect(tree.meta).toEqual({ generation: 2, operation: 'mutate' });
    // Runtime state is NOT in the tree
    expect((tree as any).$hash).toBeUndefined();
    expect((tree as any).$fitness).toBeUndefined();
    expect((tree as any).$embedding).toBeUndefined();
  });

  it('handles missing name and lineage', () => {
    const tree = treeFromSeed({ $domain: 'x', genes: {} });
    expect(tree.name).toBe('');
    expect(tree.meta).toBeUndefined();
  });
});

describe('hashTree / hashCommit', () => {
  const baseTree: SeedTree = {
    kind: 'tree',
    version: 1,
    domain: 'audio',
    name: 'wave',
    genes: { amp: { type: 'scalar', value: 0.5 } },
  };

  it('hashTree stable across re-runs', () => {
    const h1 = hashTree(baseTree);
    const h2 = hashTree(baseTree);
    expect(h1).toBe(h2);
  });

  it('hashTree ignores gene-key insertion order', () => {
    const t1: SeedTree = { ...baseTree, genes: { a: { type: 's', value: 1 }, b: { type: 's', value: 2 } } };
    const t2: SeedTree = { ...baseTree, genes: { b: { type: 's', value: 2 }, a: { type: 's', value: 1 } } };
    expect(hashTree(t1)).toBe(hashTree(t2));
  });

  it('hashCommit changes when any commit field changes', () => {
    const c = makeCommit({
      tree: 'a'.repeat(64),
      parents: [],
      author: 'alice',
      timestamp: '2026-04-14T00:00:00Z',
      message: 'init',
      seed_id: 'seed-1',
    });
    const h1 = hashCommit(c);
    const h2 = hashCommit({ ...c, message: 'init!' });
    const h3 = hashCommit({ ...c, author: 'bob' });
    const h4 = hashCommit({ ...c, parents: ['x'.repeat(64)] });
    expect(h1).not.toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).not.toBe(h4);
  });
});
