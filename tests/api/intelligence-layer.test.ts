/**
 * Phase 10 — IntelligenceLayer facade tests.
 *
 * The class facade is preserved from the prior Gemini-backed impl so
 * existing call sites in server.ts and rag.ts keep working. These tests
 * lock down four properties of the rewrite:
 *   1. No Gemini network calls. We intercept global fetch and assert the
 *      class never reaches generativelanguage.googleapis.com.
 *   2. SBERT path: when SBERT_URL is set and the sidecar responds, the
 *      vector comes from SBERT and lastSource === 'sbert'.
 *   3. Fallback path: when SBERT_URL is unset OR the sidecar errors,
 *      we get a deterministic L2-normalized 384-dim pseudo-embedding
 *      and lastSource === 'fallback'. Same input → byte-identical
 *      vector across calls.
 *   4. Pure-math methods (cosineSimilarity, findSimilarSeeds) still
 *      behave as their prior contract specified.
 *
 * The deleted methods (generateSeed/mutateSeed/breedSeeds) had no
 * callers in the tree at the time of removal — verified separately
 * via grep — so there's nothing to test there.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { IntelligenceLayer } from '../../src/lib/intelligence/index.js';

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_SBERT_URL = process.env.SBERT_URL;

function installFakeFetch(handler: (url: string, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(async (input: any, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.url;
    return handler(url, init);
  }) as any;
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}

function restoreEnv() {
  if (ORIGINAL_SBERT_URL === undefined) delete process.env.SBERT_URL;
  else process.env.SBERT_URL = ORIGINAL_SBERT_URL;
}

beforeEach(() => {
  IntelligenceLayer.lastSource = 'unknown';
});

afterEach(() => {
  restoreFetch();
  restoreEnv();
});

// ─── No-Gemini guarantee ───────────────────────────────────────────────────

describe('IntelligenceLayer — no Gemini', () => {
  it('never contacts generativelanguage.googleapis.com', async () => {
    const visited: string[] = [];
    installFakeFetch(async (url) => {
      visited.push(url);
      // Pretend SBERT responds.
      return new Response(
        JSON.stringify({ vectors: [new Array(384).fill(0.01)], dim: 384, model: 'minilm' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    process.env.SBERT_URL = 'http://localhost:8000';

    await IntelligenceLayer.generateEmbedding({ $hash: 'abc', $domain: 'character', genes: {} });
    await IntelligenceLayer.generateTextEmbedding('hello world');

    expect(visited.length).toBeGreaterThan(0);
    expect(visited.every((u) => !u.includes('generativelanguage.googleapis.com'))).toBe(true);
    expect(visited.every((u) => !u.includes('googleapis.com'))).toBe(true);
  });

  it('exposes no generateSeed / mutateSeed / breedSeeds methods', () => {
    expect((IntelligenceLayer as any).generateSeed).toBeUndefined();
    expect((IntelligenceLayer as any).mutateSeed).toBeUndefined();
    expect((IntelligenceLayer as any).breedSeeds).toBeUndefined();
  });
});

// ─── SBERT path ────────────────────────────────────────────────────────────

describe('IntelligenceLayer — SBERT path', () => {
  it('routes generateEmbedding through SBERT when SBERT_URL is set', async () => {
    const expected = new Array(384).fill(0).map((_, i) => Math.sin(i));
    installFakeFetch(async (url) => {
      expect(url).toMatch(/\/embed$/);
      return new Response(
        JSON.stringify({ vectors: [expected], dim: 384, model: 'minilm' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    process.env.SBERT_URL = 'http://sidecar:8000';

    const vec = await IntelligenceLayer.generateEmbedding({
      $hash: 'h1',
      $domain: 'character',
      $name: 'Hero',
      genes: { strength: { type: 'scalar', value: 0.5 } },
    });
    expect(vec).toEqual(expected);
    expect(IntelligenceLayer.lastSource).toBe('sbert');
  });

  it('routes generateTextEmbedding through SBERT', async () => {
    const expected = new Array(384).fill(0.5);
    installFakeFetch(async () =>
      new Response(JSON.stringify({ vectors: [expected], dim: 384, model: 'minilm' }), {
        status: 200,
      }),
    );
    process.env.SBERT_URL = 'http://sidecar:8000';
    const vec = await IntelligenceLayer.generateTextEmbedding('a query');
    expect(vec).toEqual(expected);
    expect(IntelligenceLayer.lastSource).toBe('sbert');
  });
});

// ─── Fallback path ─────────────────────────────────────────────────────────

describe('IntelligenceLayer — fallback path', () => {
  it('falls back to pseudo-embedding when SBERT_URL is unset', async () => {
    delete process.env.SBERT_URL;
    const vec = await IntelligenceLayer.generateEmbedding({
      $hash: 'deterministic-key',
      $domain: 'x',
      genes: {},
    });
    expect(vec).toHaveLength(384);
    expect(IntelligenceLayer.lastSource).toBe('fallback');
  });

  it('falls back to pseudo-embedding when SBERT errors', async () => {
    installFakeFetch(async () => new Response('boom', { status: 500 }));
    process.env.SBERT_URL = 'http://sidecar:8000';
    const vec = await IntelligenceLayer.generateEmbedding({
      $hash: 'k',
      $domain: 'x',
      genes: {},
    });
    expect(vec).toHaveLength(384);
    expect(IntelligenceLayer.lastSource).toBe('fallback');
  });

  it('pseudo-embedding is deterministic across calls', async () => {
    delete process.env.SBERT_URL;
    const a = await IntelligenceLayer.generateEmbedding({ $hash: 'same', genes: {} });
    const b = await IntelligenceLayer.generateEmbedding({ $hash: 'same', genes: {} });
    expect(a).toEqual(b);
  });

  it('pseudo-embedding is L2-normalized', async () => {
    delete process.env.SBERT_URL;
    const vec = await IntelligenceLayer.generateEmbedding({ $hash: 'k', genes: {} });
    let normSq = 0;
    for (const v of vec) normSq += v * v;
    expect(Math.sqrt(normSq)).toBeCloseTo(1, 5);
  });

  it('different inputs produce different pseudo-embeddings', async () => {
    delete process.env.SBERT_URL;
    const a = await IntelligenceLayer.generateEmbedding({ $hash: 'one', genes: {} });
    const b = await IntelligenceLayer.generateEmbedding({ $hash: 'two', genes: {} });
    expect(a).not.toEqual(b);
  });

  it('generateTextEmbedding handles empty string without crashing', async () => {
    delete process.env.SBERT_URL;
    const vec = await IntelligenceLayer.generateTextEmbedding('');
    expect(vec).toHaveLength(384);
    expect(IntelligenceLayer.lastSource).toBe('fallback');
  });
});

// ─── Pure math ─────────────────────────────────────────────────────────────

describe('IntelligenceLayer — cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    const v = [1, 0, 0];
    expect(IntelligenceLayer.cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(IntelligenceLayer.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it('returns -1 for opposite vectors', () => {
    expect(IntelligenceLayer.cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1, 5);
  });

  it('returns 0 for empty / mismatched / null inputs', () => {
    expect(IntelligenceLayer.cosineSimilarity([], [])).toBe(0);
    expect(IntelligenceLayer.cosineSimilarity([1, 2], [1])).toBe(0);
    expect(IntelligenceLayer.cosineSimilarity(null as any, [1])).toBe(0);
  });

  it('returns 0 when either vector has zero norm', () => {
    expect(IntelligenceLayer.cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('IntelligenceLayer — findSimilarSeeds', () => {
  const target = { id: 't', $embedding: [1, 0, 0] };
  const corpus = [
    { id: 'a', $embedding: [0.9, 0.1, 0] }, // closest
    { id: 'b', $embedding: [0, 1, 0] }, // orthogonal
    { id: 'c', $embedding: [-1, 0, 0] }, // opposite
    { id: 't', $embedding: [1, 0, 0] }, // self — must be excluded
    { id: 'no-emb' }, // missing embedding — must be excluded
  ];

  it('returns top-K sorted by similarity descending', () => {
    const out = IntelligenceLayer.findSimilarSeeds(target, corpus, 3);
    expect(out.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('excludes the target seed from results', () => {
    const out = IntelligenceLayer.findSimilarSeeds(target, corpus, 5);
    expect(out.find((s) => s.id === 't')).toBeUndefined();
  });

  it('attaches _similarityScore to each result', () => {
    const out = IntelligenceLayer.findSimilarSeeds(target, corpus, 1);
    expect(typeof out[0]._similarityScore).toBe('number');
    expect(out[0]._similarityScore).toBeCloseTo(0.9 / Math.sqrt(0.81 + 0.01), 3);
  });

  it('returns [] when target has no embedding', () => {
    expect(IntelligenceLayer.findSimilarSeeds({ id: 'x' }, corpus, 5)).toEqual([]);
  });
});
