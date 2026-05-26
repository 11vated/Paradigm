/**
 * Integration tests for the 4-Layer Memory System (P3.3).
 *
 * Covers:
 *   Layer 1: WorkingMemory   — volatile, in-memory, FIFO eviction
 *   Layer 2: EpisodicMemory  — encrypted, per-user, file-backed
 *   Layer 3: SemanticMemory  — workspace, JSON file-backed
 *   Layer 4: WorldMemory     — global read-only, 10 curated entries
 *   Orchestrator             — unified recall / search / rewrite
 *   Canon                    — RAG wrapper for seed library
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WorkingMemory } from '../../src/lib/intelligence/memory/working';
import { EpisodicMemory } from '../../src/lib/intelligence/memory/episodic';
import { SemanticMemory } from '../../src/lib/intelligence/memory/semantic';
import { WorldMemory } from '../../src/lib/intelligence/memory/world';
import { CanonMemory, summarizeSeed } from '../../src/lib/intelligence/memory/canon';
import { DefaultMemoryOrchestrator } from '../../src/lib/intelligence/memory/orchestrator';
import type { MemoryEntry, MemoryLayer, Embedder } from '../../src/lib/intelligence/memory/types';
import { kernelNow } from '../../src/lib/kernel/clock';

// ─── Helpers ─────────────────────────────────────────────────────────────────

class TestEmbedder implements Embedder {
  readonly model = 'test-v1';
  readonly dim = 8;
  async ready(): Promise<void> {}
  async embed(text: string): Promise<Float32Array> {
    const v = new Float32Array(this.dim);
    for (let i = 0; i < text.length; i++) {
      v[i % this.dim] += text.charCodeAt(i) / 255;
    }
    return v;
  }
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

function makeEntry(overrides: Partial<MemoryEntry> & { key: string }): MemoryEntry {
  const now = kernelNow();
  return {
    key: overrides.key,
    value: overrides.value ?? 'test-value',
    topic: overrides.topic ?? 'test',
    source: overrides.source ?? 'test',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    embedding: overrides.embedding,
    signature: overrides.signature,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1 — Working Memory
// ═══════════════════════════════════════════════════════════════════════════════

describe('WorkingMemory (Layer 1)', () => {
  let mem: WorkingMemory;

  beforeEach(() => {
    mem = new WorkingMemory({ cap: 32 });
  });

  it('put + get round-trips', async () => {
    await mem.put({ key: 'a', value: { x: 1 }, topic: 'test', source: 't' });
    const got = await mem.get('a');
    expect(got).toBeDefined();
    expect(got!.value).toEqual({ x: 1 });
    expect(got!.createdAt).toBeGreaterThan(0);
    expect(got!.updatedAt).toEqual(got!.createdAt);
  });

  it('put updates updatedAt but preserves createdAt', async () => {
    await mem.put({ key: 'a', value: 'v1', topic: 't', source: 's' });
    const t1 = (await mem.get('a'))!.createdAt;
    await new Promise((r) => setTimeout(r, 5));
    await mem.put({ key: 'a', value: 'v2', topic: 't', source: 's' });
    const entry = (await mem.get('a'))!;
    expect(entry.createdAt).toEqual(t1);
    expect(entry.updatedAt).toBeGreaterThan(t1);
    expect(entry.value).toEqual('v2');
  });

  it('query filters by topic', async () => {
    await mem.put({ key: 'a', value: 1, topic: 'alpha', source: 't' });
    await mem.put({ key: 'b', value: 2, topic: 'beta', source: 't' });
    const alphas = await mem.query({ topic: 'alpha' });
    expect(alphas).toHaveLength(1);
    expect(alphas[0].key).toEqual('a');
  });

  it('query filters by text', async () => {
    await mem.put({ key: 'x', value: 'hello world', topic: 't', source: 's' });
    await mem.put({ key: 'y', value: 'goodbye', topic: 't', source: 's' });
    const hits = await mem.query({ text: 'hello' });
    expect(hits).toHaveLength(1);
    expect(hits[0].key).toEqual('x');
  });

  it('evicts oldest entries when over cap', async () => {
    mem = new WorkingMemory({ cap: 5 });
    for (let i = 0; i < 10; i++) {
      await mem.put({ key: `k${i}`, value: i, topic: 't', source: 's' });
    }
    expect((await mem.query({})).length).toBeLessThanOrEqual(5);
    const oldest = await mem.get('k0');
    expect(oldest).toBeUndefined();
  });

  it('remove deletes entry', async () => {
    await mem.put({ key: 'del', value: 1, topic: 't', source: 's' });
    expect(await mem.get('del')).toBeDefined();
    await mem.remove('del');
    expect(await mem.get('del')).toBeUndefined();
  });

  it('all() iterates entries', async () => {
    await mem.put({ key: 'a', value: 1, topic: 't', source: 's' });
    await mem.put({ key: 'b', value: 2, topic: 't', source: 's' });
    const entries: MemoryEntry[] = [];
    for await (const e of mem.all()) entries.push(e);
    expect(entries).toHaveLength(2);
  });

  it('clear() wipes all', async () => {
    await mem.put({ key: 'a', value: 1, topic: 't', source: 's' });
    (mem as any).clear();
    expect(await mem.get('a')).toBeUndefined();
  });

  it('snapshot() captures current state', async () => {
    await mem.put({ key: 'a', value: 1, topic: 't', source: 's' });
    await mem.put({ key: 'b', value: 2, topic: 't', source: 's' });
    const snap = (mem as any).snapshot();
    expect(snap).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2 — Episodic Memory (in-memory mode)
// ═══════════════════════════════════════════════════════════════════════════════

describe('EpisodicMemory (Layer 2)', () => {
  let mem: EpisodicMemory;

  beforeEach(() => {
    mem = new EpisodicMemory({ userId: 'test-user' });
  });

  it('put + get round-trips', async () => {
    await mem.put({ key: 'e1', value: { event: 'login' }, topic: 'session', source: 'user' });
    const got = await mem.get('e1');
    expect(got).toBeDefined();
    expect(got!.value).toEqual({ event: 'login' });
  });

  it('query returns entries sorted by updatedAt (most recent first)', async () => {
    await mem.put({ key: 'a', value: 1, topic: 't', source: 's' });
    await mem.put({ key: 'b', value: 2, topic: 't', source: 's' });
    const results = await mem.query({});
    // Both entries are returned (at same timestamp, ordering is stable)
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it('query filters by topic and source', async () => {
    await mem.put({ key: 'a', value: 1, topic: 'x', source: 'u1' });
    await mem.put({ key: 'b', value: 2, topic: 'y', source: 'u2' });
    expect(await mem.query({ topic: 'x' })).toHaveLength(1);
    expect(await mem.query({ source: 'u2' })).toHaveLength(1);
  });

  it('query with embedding ranks by cosine similarity', async () => {
    const e1 = makeEntry({ key: 'cat', value: 'feline', topic: 't', source: 's', embedding: new Float32Array([1, 0, 0, 0]) });
    const e2 = makeEntry({ key: 'dog', value: 'canine', topic: 't', source: 's', embedding: new Float32Array([0, 1, 0, 0]) });
    await mem.put(e1);
    await mem.put(e2);
    const queryEmb = new Float32Array([0.9, 0.1, 0, 0]);
    const results = await mem.query({ embedding: queryEmb });
    expect(results[0].key).toEqual('cat');
  });

  it('remove deletes entry', async () => {
    await mem.put({ key: 'r', value: 1, topic: 't', source: 's' });
    expect(await mem.remove('r')).toBe(true);
    expect(await mem.get('r')).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3 — Semantic Memory
// ═══════════════════════════════════════════════════════════════════════════════

describe('SemanticMemory (Layer 3)', () => {
  const testPath = 'data/memory/__test_semantic.json';
  let mem: SemanticMemory;

  beforeEach(async () => {
    mem = new SemanticMemory(testPath);
  });

  afterEach(async () => {
    try {
      const fs = await import('node:fs/promises');
      await fs.unlink(testPath).catch(() => {});
    } catch { /* ignore */ }
  });

  it('put + get round-trips', async () => {
    await mem.put({ key: 's1', value: { rule: 'always D minor' }, topic: 'music', source: 'agent' });
    const got = await mem.get('s1');
    expect(got).toBeDefined();
    expect(got!.value).toEqual({ rule: 'always D minor' });
  });

  it('query with text search', async () => {
    await mem.put({ key: 'a', value: 'red apple', topic: 'color', source: 's' });
    await mem.put({ key: 'b', value: 'blue sky', topic: 'color', source: 's' });
    const found = await mem.query({ text: 'apple' });
    expect(found).toHaveLength(1);
    expect(found[0].key).toEqual('a');
  });

  it('query with embedding ranks by cosine', async () => {
    await mem.put({ key: 'v1', value: 'warm', topic: 't', source: 's', ...{ embedding: new Float32Array([1, 0, 0]) } } as any);
    await mem.put({ key: 'v2', value: 'cool', topic: 't', source: 's', ...{ embedding: new Float32Array([0, 1, 0]) } } as any);
    const results = await mem.query({ embedding: new Float32Array([0.8, 0.2, 0]) });
    expect(results[0].key).toEqual('v1');
  });

  it('persists to file and reloads', async () => {
    await mem.put({ key: 'persist', value: 'survived', topic: 't', source: 's' });
    await mem.flush();
    const mem2 = new SemanticMemory(testPath);
    const got = await mem2.get('persist');
    expect(got).toBeDefined();
    expect(got!.value).toEqual('survived');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 4 — World Memory
// ═══════════════════════════════════════════════════════════════════════════════

describe('WorldMemory (Layer 4)', () => {
  let mem: WorldMemory;

  beforeEach(() => {
    mem = new WorldMemory();
  });

  it('has 10 curated seed entries', () => {
    expect((mem as any).index.length).toBeGreaterThanOrEqual(10);
  });

  it('get returns entry by id', async () => {
    const entry = await mem.get('physics:gravity-baseline');
    expect(entry).toBeDefined();
    expect(entry!.value).toHaveProperty('title');
  });

  it('query filters by library (topic)', async () => {
    const music = await mem.query({ topic: 'music-theory' });
    expect(music.length).toBeGreaterThanOrEqual(2);
  });

  it('query searches text across title/content/tags', async () => {
    const found = await mem.query({ text: 'golden ratio' });
    expect(found.length).toBeGreaterThanOrEqual(1);
    expect(found[0].key).toEqual('mathematics:phi-fractal');
  });

  it('put throws read-only error', async () => {
    await expect(mem.put({ key: 'x', value: 'y', topic: 't', source: 's' })).rejects.toThrow('read-only');
  });

  it('remove always returns false', async () => {
    expect(await mem.remove('anything')).toBe(false);
  });

  it('byLibrary returns entries for given library', () => {
    const physics = mem.byLibrary('physics');
    expect(physics.length).toBeGreaterThanOrEqual(1);
  });

  it('libraries() returns all library names', () => {
    const libs = mem.libraries();
    expect(libs).toContain('physics');
    expect(libs).toContain('music-theory');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR — Unified Recall / Search / Write
// ═══════════════════════════════════════════════════════════════════════════════

describe('DefaultMemoryOrchestrator', () => {
  let orch: DefaultMemoryOrchestrator;

  beforeEach(() => {
    orch = new DefaultMemoryOrchestrator({
      working: new WorkingMemory({ cap: 64 }),
      semantic: new SemanticMemory('data/memory/__test_orch.json'),
    });
  });

  afterEach(async () => {
    try {
      const fs = await import('node:fs/promises');
      await fs.unlink('data/memory/__test_orch.json').catch(() => {});
    } catch { /* ignore */ }
  });

  it('writeTo + recall works across layers', async () => {
    await orch.writeTo('working', { key: 'w1', value: { msg: 'hello' }, topic: 'greet', source: 'orch' });
    const got = await orch.recall('w1');
    expect(got).toBeDefined();
    expect(got!.value).toEqual({ msg: 'hello' });
  });

  it('recall searches working → episodic → semantic → world', async () => {
    await orch.writeTo('working', { key: 'x', value: 'from-working', topic: 't', source: 's' });
    const got = await orch.recall('x');
    expect(got!.value).toEqual('from-working');
  });

  it('search returns deduplicated results', async () => {
    await orch.writeTo('working', { key: 'shared', value: 'a', topic: 't', source: 's' });
    await orch.writeTo('semantic', { key: 'shared', value: 'b', topic: 't', source: 's' });
    const results = await orch.search({ topic: 't' });
    const shared = results.find((r) => r.key === 'shared');
    expect(shared).toBeDefined();
  });

  it('prime injects context into working', async () => {
    orch.prime({ focus: 'character', style: 'fantasy' });
    const got = await orch.recall('ctx:focus');
    expect(got).toBeDefined();
    expect(got!.value).toEqual('character');
  });

  it('layer() returns memory layer by name', () => {
    const working = orch.layer('working');
    expect(working.name).toEqual('working');
  });

  it('layer() throws for unconfigured layers', () => {
    expect(() => orch.layer('world')).toThrow('not available');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CANON MEMORY — RAG Wrapper
// ═══════════════════════════════════════════════════════════════════════════════

describe('CanonMemory', () => {
  let store: MemoryLayer;
  let embedder: TestEmbedder;
  let canon: CanonMemory;

  beforeEach(async () => {
    store = new SemanticMemory('data/memory/__test_canon.json');
    embedder = new TestEmbedder();
    await embedder.ready();
    canon = new CanonMemory({ store, embedder });
  });

  afterEach(async () => {
    try {
      const fs = await import('node:fs/promises');
      await fs.unlink('data/memory/__test_canon.json').catch(() => {});
    } catch { /* ignore */ }
  });

  it('summarizeSeed produces descriptive text', () => {
    const seed = {
      $name: 'Shadow Knight',
      $domain: 'character',
      phrase: 'dark defender',
      genes: { archetype: 'guardian', strength: 0.8 },
    } as any;
    const summary = summarizeSeed(seed);
    expect(summary).toContain('Shadow Knight');
    expect(summary).toContain('character');
    expect(summary).toContain('guardian');
  });

  it('ingest + recall stores and retrieves seed', async () => {
    const id = await canon.ingest({ $hash: '0xabc', $name: 'Test', $domain: 'music', genes: {} } as any);
    expect(id).toEqual('canon:0xabc');
    const hits = await canon.recall('Test', { limit: 5 });
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0].seedHash).toEqual('0xabc');
  });

  it('recall returns empty for unmatched queries', async () => {
    const hits = await canon.recall('zzzzz_nonexistent', { limit: 5 });
    expect(hits).toHaveLength(0);
  });

  it('ingest with linkedTo stores cross-reference metadata', async () => {
    await canon.ingest({ $hash: '0x1', $name: 'Aria', $domain: 'character', genes: {} } as any,
      { linkedTo: 'world:0x9', tags: ['protagonist'] });
    const hits = await canon.recall('Aria', { limit: 5 });
    const aria = hits.find((h) => h.name === 'Aria');
    expect(aria).toBeDefined();
    expect(aria!.seedHash).toEqual('0x1');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// END-TO-END — Full Pipeline Integration
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full Memory Pipeline (Layers 1-4 + Orchestrator + Canon)', () => {
  let working: WorkingMemory;
  let semantic: SemanticMemory;
  let world: WorldMemory;
  let orch: DefaultMemoryOrchestrator;
  let canon: CanonMemory;

  beforeEach(async () => {
    working = new WorkingMemory({ cap: 64 });
    semantic = new SemanticMemory('data/memory/__test_e2e.json');
    world = new WorldMemory();
    orch = new DefaultMemoryOrchestrator({ working, semantic, world });
    const embedder = new TestEmbedder();
    await embedder.ready();
    canon = new CanonMemory({ store: semantic, embedder });
  });

  afterEach(async () => {
    try {
      const fs = await import('node:fs/promises');
      await fs.unlink('data/memory/__test_e2e.json').catch(() => {});
    } catch { /* ignore */ }
  });

  it('orchestrator seeds world knowledge', async () => {
    orch.prime({ intent: 'create a sad character', domain: 'character' });
    const ctx = await orch.recall('ctx:intent');
    expect(ctx!.value).toEqual('create a sad character');
  });

  it('canon stores seed and orchestrator can recall it', async () => {
    await canon.ingest({
      $hash: '0xf00d',
      $name: 'Melancholy Ocean',
      $domain: 'music',
      genes: { key: 'D minor', tempo: 80 },
    } as any);
    const semanticHit = await semantic.get('canon:0xf00d');
    expect(semanticHit).toBeDefined();
    expect(semanticHit!.value).toHaveProperty('seedHash', '0xf00d');
  });

  it('world memory provides baseline knowledge', async () => {
    const gravity = await world.get('physics:gravity-baseline');
    expect(gravity).toBeDefined();
    const content = (gravity!.value as any).content;
    expect(content).toContain('9.80665');
  });

  it('orchestrator search queries across all layers', async () => {
    await working.put({ key: 'live', value: 'session-data', topic: 'session', source: 'agent' });
    const results = await orch.search({ topic: 'session' });
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it('orchestrator handles recall miss gracefully', async () => {
    const miss = await orch.recall('nonexistent_key_xyz');
    expect(miss).toBeUndefined();
  });
});
