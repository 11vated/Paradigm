/**
 * Canon Memory — local-embedding RAG tests
 *
 * Uses an in-memory MemoryLayer + a deterministic FakeEmbedder to keep
 * tests fast and hermetic. The real LocalEmbedder is tested separately
 * (network-conditional) and not exercised here.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { CanonMemory, summarizeSeed } from '../../src/lib/intelligence/memory/canon';
import type { MemoryEntry, MemoryLayer, MemoryQuery, Embedder } from '../../src/lib/intelligence/memory/types';

/** Tiny in-memory MemoryLayer. */
function makeLayer(): MemoryLayer & { entries: Map<string, MemoryEntry> } {
  const entries = new Map<string, MemoryEntry>();
  return {
    entries,
    async put(e) { entries.set(e.key, e); },
    async get(key) { return entries.get(key); },
    async remove(key) { entries.delete(key); },
    async query(q: MemoryQuery) {
      const out: MemoryEntry[] = [];
      for (const e of entries.values()) {
        if (q.topic && e.topic !== q.topic) continue;
        out.push(e);
      }
      return q.limit ? out.slice(0, q.limit) : out;
    },
    async close() {},
  };
}

/** Deterministic word-set embedder: each word → a stable dimension. */
const VOCAB = ['melancholy','ocean','bright','sun','dark','night','sad','quiet','blue','warm','cold','character','misc'];
class FakeEmbedder implements Embedder {
  readonly model = 'fake-test';
  readonly dim = VOCAB.length;
  async ready() {}
  async embed(text: string): Promise<Float32Array> {
    const v = new Float32Array(this.dim);
    const lower = text.toLowerCase();
    for (let i = 0; i < VOCAB.length; i++) {
      if (lower.includes(VOCAB[i])) v[i] = 1;
    }
    let n = 0; for (const x of v) n += x * x;
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < v.length; i++) v[i] /= n;
    return v;
  }
  async embedBatch(texts: string[]): Promise<Float32Array[]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

describe('Canon Memory (RAG)', () => {
  let canon: CanonMemory;
  let layer: ReturnType<typeof makeLayer>;

  beforeEach(() => {
    layer = makeLayer();
    canon = new CanonMemory({ store: layer, embedder: new FakeEmbedder() });
  });

  it('summarizeSeed produces a compact text representation', () => {
    const s = { $name: 'Aria', $domain: 'character', $hash: 'h1', phrase: 'melancholy ocean',
                genes: { mood: 'sad', warmth: 0.3, tags: ['blue', 'quiet'] } } as never;
    const summary = summarizeSeed(s);
    expect(summary).toContain('Aria');
    expect(summary).toContain('domain:character');
    expect(summary).toContain('mood:sad');
    expect(summary).toContain('warmth:0.30');
    expect(summary).toContain('tags:blue,quiet');
  });

  it('ingests a seed and persists embedding + value', async () => {
    const seed = { $name: 'Aria', $domain: 'character', $hash: 'h1', phrase: 'sad',
                   genes: { mood: 'melancholy' } } as never;
    const id = await canon.ingest(seed);
    expect(id).toBe('canon:h1');
    const entry = layer.entries.get('canon:h1')!;
    expect(entry.embedding).toBeInstanceOf(Float32Array);
    expect(entry.embedding!.length).toBe(13);
    expect((entry.value as { name: string }).name).toBe('Aria');
  });

  it('ingestBatch handles N seeds in one pass', async () => {
    const seeds = [
      { $name: 'Aria', $domain: 'character', $hash: 'h1', genes: { mood: 'sad' } },
      { $name: 'Kai', $domain: 'character', $hash: 'h2', genes: { mood: 'bright' } },
      { $name: 'Nyx', $domain: 'character', $hash: 'h3', genes: { mood: 'dark' } },
    ] as never[];
    const ids = await canon.ingestBatch(seeds);
    expect(ids).toEqual(['canon:h1', 'canon:h2', 'canon:h3']);
    expect(layer.entries.size).toBe(3);
  });

  it('recall returns hits ranked by similarity', async () => {
    const seeds = [
      { $name: 'Aria', $domain: 'character', $hash: 'h1', genes: { mood: 'melancholy ocean' } },
      { $name: 'Kai', $domain: 'character', $hash: 'h2', genes: { mood: 'bright sun' } },
      { $name: 'Nyx', $domain: 'character', $hash: 'h3', genes: { mood: 'dark night' } },
    ] as never[];
    await canon.ingestBatch(seeds);
    const hits = await canon.recall('melancholy ocean', { minSimilarity: 0 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].name).toBe('Aria'); // highest cosine for that summary
    // scores monotonically decreasing
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score).toBeGreaterThanOrEqual(hits[i].score);
    }
  });

  it('recall respects limit + minSimilarity', async () => {
    const seeds = Array.from({ length: 10 }, (_, i) => ({
      $name: `S${i}`, $domain: 'misc', $hash: `h${i}`, genes: { i },
    })) as never[];
    await canon.ingestBatch(seeds);
    const top3 = await canon.recall('anything', { limit: 3, minSimilarity: 0 });
    expect(top3.length).toBeLessThanOrEqual(3);
    const strict = await canon.recall('completely-unmatched-query-xyz', { minSimilarity: 0.99 });
    expect(strict.length).toBe(0);
  });

  it('forget removes a seed from canon', async () => {
    await canon.ingest({ $name: 'A', $domain: 'd', $hash: 'h1' } as never);
    expect(layer.entries.size).toBe(1);
    await canon.forget('h1');
    expect(layer.entries.size).toBe(0);
  });
});
