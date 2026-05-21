/**
 * Federated knowledge graph + reference loop + ZK membership tests.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  canonicalize, contentHashOf, InMemoryGraphStore,
  MerkleTree, verifyInclusion,
  gatherReferences, parseNodeUrl, formatNodeUrl,
} from '../../src/lib/intelligence/federation';

describe('content addressing', () => {
  it('canonicalize is order-stable across key shuffles', () => {
    const a = canonicalize({ z: 1, a: 2, m: { y: 1, x: 0 } });
    const b = canonicalize({ a: 2, m: { x: 0, y: 1 }, z: 1 });
    expect(a).toBe(b);
  });

  it('contentHashOf produces same hash for equivalent objects', () => {
    const h1 = contentHashOf({ name: 'aria', age: 30 });
    const h2 = contentHashOf({ age: 30, name: 'aria' });
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);
  });

  it('parseNodeUrl + formatNodeUrl round-trip', () => {
    const url = 'ref://abc123@v1.0';
    const parsed = parseNodeUrl(url);
    expect(parsed.scheme).toBe('ref');
    expect(parsed.version).toBe('v1.0');
    expect(formatNodeUrl(parsed)).toBe(url);
  });
});

describe('GraphStore', () => {
  let store: InMemoryGraphStore;
  beforeEach(() => { store = new InMemoryGraphStore(); });

  it('stores and retrieves nodes by content hash', async () => {
    const body = { domain: 'character', name: 'Aria' };
    const node = {
      contentHash: contentHashOf(body),
      url: { scheme: 'char' as const, path: 'aria', version: 'v1' },
      signedBy: 'user-001',
      body, lineageOut: [], forever: ['user-001'],
      flags: {}, confidence: {}, visibility: 'private' as const,
      createdAt: 1000,
    };
    await store.put(node);
    expect(await store.has(node.contentHash)).toBe(true);
    const fetched = await store.get(node.contentHash);
    expect(fetched?.url.path).toBe('aria');
  });

  it('typed edges + fromIdx/toIdx work both ways', async () => {
    const edge = {
      contentHash: 'edge1', class: 'composes' as const,
      source: 'A', target: 'B', signedBy: 'u', createdAt: 1,
    };
    await store.addEdge(edge);
    const fromA = await store.edgesFrom('A');
    const toB = await store.edgesTo('B');
    expect(fromA).toHaveLength(1);
    expect(toB).toHaveLength(1);
    expect(fromA[0].class).toBe('composes');
  });
});

describe('MerkleTree — ZK-style canon membership', () => {
  it('builds a balanced tree for 8 leaves', () => {
    const leaves = Array.from({ length: 8 }, (_, i) => contentHashOf({ i }));
    const tree = new MerkleTree(leaves);
    expect(tree.root.length).toBe(64);
    expect(tree.levels.length).toBe(4); // 8 → 4 → 2 → 1
  });

  it('builds and verifies an inclusion proof', () => {
    const leaves = Array.from({ length: 7 }, (_, i) => contentHashOf({ canon: i }));
    const tree = new MerkleTree(leaves);
    const proof = tree.proveByIndex(3);
    expect(verifyInclusion(proof, tree.root)).toBe(true);
  });

  it('proof for a non-member fails verification', () => {
    const leaves = Array.from({ length: 5 }, (_, i) => contentHashOf({ x: i }));
    const tree = new MerkleTree(leaves);
    const proof = tree.proveByIndex(2);
    // tamper with the leaf
    const tampered = { ...proof, leaf: contentHashOf({ x: 999 }) };
    expect(verifyInclusion(tampered, tree.root)).toBe(false);
  });

  it('proveByLeaf returns null for missing nodes', () => {
    const tree = new MerkleTree([contentHashOf({ a: 1 })]);
    expect(tree.proveByLeaf('00'.repeat(32))).toBe(null);
  });
});

describe('Reference loop — Brief 090', () => {
  it('NEED → SEARCH → FETCH → CLASSIFY → GROUND → STORE → CITE', async () => {
    const store = new InMemoryGraphStore();
    const composeFor = contentHashOf({ seed: 'aria' });
    const result = await gatherReferences('edo-period kimono pattern', {
      store, signedBy: 'agent-001', limit: 2, composeFor,
      search: async () => ([
        { url: 'https://museum.example/edo-1', title: 'Edo textile A' },
        { url: 'https://museum.example/edo-2', title: 'Edo textile B' },
      ]),
      fetchPage: async (u) => ({ status: 200, bytes: 1024, bodyText: `body of ${u}`, contentType: 'text/html' }),
      classify: async () => ({ license: 'public-domain', attribution: 'museum.example', copyright: 'public-domain' }),
      ground: async () => ({ matchedPrimitives: ['textile://edo-pattern-v1'] }),
    });
    expect(result.refs).toHaveLength(2);
    expect(result.refs[0].url.scheme).toBe('ref');
    expect(result.refs[0].body.license).toBe('public-domain');
    expect(result.refs[0].body.matchedPrimitives[0]).toBe('textile://edo-pattern-v1');
    // composeFor → ref edge written
    const edges = await store.edgesFrom(composeFor);
    expect(edges).toHaveLength(2);
    expect(edges[0].class).toBe('references');
  });

  it('rejects HTTP errors gracefully', async () => {
    const store = new InMemoryGraphStore();
    const result = await gatherReferences('q', {
      store, signedBy: 'agent', limit: 2,
      search: async () => [{ url: 'https://x.example/404' }],
      fetchPage: async () => ({ status: 404, bytes: 0, bodyText: '', contentType: 'text/html' }),
    });
    expect(result.refs).toHaveLength(0);
    expect(result.rejected[0].reason).toContain('404');
  });
});
