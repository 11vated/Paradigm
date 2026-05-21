/**
 * Stage 6 archive — pins:
 *   - writes to L2 (episodic) when supplied
 *   - writes to L3 (semantic) when supplied
 *   - writes to canon when supplied
 *   - skipCanon respected
 *   - idempotent — same seed twice updates rather than dupes
 *   - works with AssembledOutput as well as ValidatedSeed
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { archive } from '../../src/lib/intelligence/agent/stages/stage-6-archive';
import type { MemoryEntry, MemoryLayer, MemoryQuery, Embedder } from '../../src/lib/intelligence/memory/types';
import { CanonMemory } from '../../src/lib/intelligence/memory/canon';

function makeLayer() {
  const map = new Map<string, MemoryEntry>();
  const layer: MemoryLayer & { entries: Map<string, MemoryEntry> } = {
    entries: map,
    async put(e) { map.set(e.key, e); },
    async get(k) { return map.get(k); },
    async remove(k) { map.delete(k); },
    async query(q: MemoryQuery) {
      const out: MemoryEntry[] = [];
      for (const e of map.values()) {
        if (q.topic && e.topic !== q.topic) continue;
        out.push(e);
      }
      return q.limit ? out.slice(0, q.limit) : out;
    },
    async close() {},
  };
  return layer;
}

class FakeEmbedder implements Embedder {
  readonly model = 'fake';
  readonly dim = 4;
  async ready() {}
  async embed(text: string) {
    const v = new Float32Array(this.dim);
    for (let i = 0; i < text.length; i++) v[i % this.dim] += 1;
    return v;
  }
  async embedBatch(texts: string[]) { return Promise.all(texts.map((t) => this.embed(t))); }
}

const seed = { $hash: 'h1', $domain: 'character', $name: 'Aria', genes: { mood: 'sad' } } as never;
const validated = { seed, passed: true, oracle: { overall: 0.8, axes: {}, notes: [], conformsTo: 'character' } } as never;
const assembled = { seed, planHash: 'p1' } as never;

describe('Stage 6 archive', () => {
  let episodic: ReturnType<typeof makeLayer>;
  let semantic: ReturnType<typeof makeLayer>;
  let canonStore: ReturnType<typeof makeLayer>;
  let canon: CanonMemory;

  beforeEach(() => {
    episodic = makeLayer();
    semantic = makeLayer();
    canonStore = makeLayer();
    canon = new CanonMemory({ store: canonStore, embedder: new FakeEmbedder() });
  });

  it('writes to all three when all are supplied', async () => {
    const r = await archive(validated, { episodic, semantic, canon });
    expect(r.wroteEpisodic).toBe(true);
    expect(r.wroteSemantic).toBe(true);
    expect(r.wroteCanon).toBe(true);
    expect(episodic.entries.size).toBe(1);
    expect(semantic.entries.has('seed:h1')).toBe(true);
    expect(canonStore.entries.has('canon:h1')).toBe(true);
  });

  it('skips canon when skipCanon=true', async () => {
    const r = await archive(validated, { episodic, semantic, canon, skipCanon: true });
    expect(r.wroteCanon).toBe(false);
    expect(canonStore.entries.size).toBe(0);
  });

  it('captures oracle score in the episodic event', async () => {
    await archive(validated, { episodic });
    const e = Array.from(episodic.entries.values())[0];
    expect((e.value as { oracleScore: number }).oracleScore).toBe(0.8);
  });

  it('works with AssembledOutput too (no oracle field)', async () => {
    const r = await archive(assembled, { semantic });
    expect(r.wroteSemantic).toBe(true);
    expect(semantic.entries.has('seed:h1')).toBe(true);
  });

  it('idempotent — semantic upsert keeps a single entry', async () => {
    await archive(validated, { semantic });
    await archive(validated, { semantic });
    expect(semantic.entries.size).toBe(1);
  });

  it('returns receipt with seedHash + timestamp', async () => {
    const r = await archive(validated, { episodic });
    expect(r.seedHash).toBe('h1');
    expect(typeof r.timestamp).toBe('number');
  });
});
