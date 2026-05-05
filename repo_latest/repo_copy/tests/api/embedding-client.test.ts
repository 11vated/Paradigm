/**
 * Tests for the SBERT embedding client (Phase 1.4).
 *
 * We mock `globalThis.fetch` so the tests don't require a running sidecar.
 * The render function (`renderSeedForEmbedding`) is exercised directly —
 * it's pure, deterministic, and changes here invalidate every stored
 * embedding downstream, so we pin its behavior strictly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  embedText,
  embedBatch,
  embedSeed,
  renderSeedForEmbedding,
  EmbeddingClientError,
} from '../../src/lib/intelligence/embedding-client.js';

const originalFetch = globalThis.fetch;

function mockFetch(handler: (url: string, init: any) => Response | Promise<Response>) {
  globalThis.fetch = vi.fn(async (url: any, init: any) => handler(String(url), init)) as any;
}

describe('renderSeedForEmbedding', () => {
  it('produces the same output regardless of gene key order', () => {
    const a = renderSeedForEmbedding({
      $domain: 'audio', $name: 'x',
      genes: { foo: { type: 'scalar', value: 1 }, bar: { type: 'scalar', value: 2 } },
    });
    const b = renderSeedForEmbedding({
      $domain: 'audio', $name: 'x',
      genes: { bar: { type: 'scalar', value: 2 }, foo: { type: 'scalar', value: 1 } },
    });
    expect(a).toBe(b);
  });

  it('includes domain, name, generation, and gene string', () => {
    const s = renderSeedForEmbedding({
      $domain: 'visual',
      $name: 'Aurora',
      $lineage: { generation: 3 },
      genes: { hue: { type: 'scalar', value: 0.7 } },
    });
    expect(s).toContain('Domain: visual');
    expect(s).toContain('Name: Aurora');
    expect(s).toContain('Generation: 3');
    expect(s).toContain('hue (scalar): 0.7');
  });

  it('tolerates missing fields gracefully', () => {
    const s = renderSeedForEmbedding({});
    expect(s).toContain('Domain: unknown');
    expect(s).toContain('Name: Untitled');
    expect(s).toContain('Generation: 0');
  });
});

describe('embedText', () => {
  beforeEach(() => {
    process.env.SBERT_URL = 'http://sbert-test:8000';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SBERT_URL;
  });

  it('returns a single vector from a single text', async () => {
    mockFetch(() =>
      new Response(JSON.stringify({ vectors: [[0.1, 0.2, 0.3]], dim: 3, model: 'm' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    const v = await embedText('hello');
    expect(v).toEqual([0.1, 0.2, 0.3]);
  });

  it('throws on empty input', async () => {
    await expect(embedText('')).rejects.toBeInstanceOf(EmbeddingClientError);
  });

  it('throws when SBERT_URL unset and no override', async () => {
    delete process.env.SBERT_URL;
    await expect(embedText('hello')).rejects.toBeInstanceOf(EmbeddingClientError);
  });

  it('throws on non-2xx', async () => {
    mockFetch(() => new Response('bad', { status: 500 }));
    await expect(embedText('hello')).rejects.toMatchObject({
      status: 500,
    });
  });

  it('throws on malformed payload', async () => {
    mockFetch(() => new Response(JSON.stringify({ oops: true }), { status: 200 }));
    await expect(embedText('hello')).rejects.toBeInstanceOf(EmbeddingClientError);
  });

  it('uses sbertUrl option over env', async () => {
    delete process.env.SBERT_URL;
    const seen: string[] = [];
    mockFetch((url) => {
      seen.push(url);
      return new Response(
        JSON.stringify({ vectors: [[1]], dim: 1, model: 'm' }),
        { status: 200 },
      );
    });
    await embedText('hi', { sbertUrl: 'http://override:9000' });
    expect(seen[0]).toBe('http://override:9000/embed');
  });
});

describe('embedBatch', () => {
  beforeEach(() => {
    process.env.SBERT_URL = 'http://sbert-test:8000';
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SBERT_URL;
  });

  it('returns one vector per text, order preserved', async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({
          vectors: [[1, 0], [0, 1], [0.5, 0.5]],
          dim: 2,
          model: 'm',
        }),
        { status: 200 },
      ),
    );
    const v = await embedBatch(['a', 'b', 'c']);
    expect(v).toHaveLength(3);
    expect(v[1]).toEqual([0, 1]);
  });

  it('throws if response vector count mismatches input', async () => {
    mockFetch(() =>
      new Response(
        JSON.stringify({ vectors: [[1, 0]], dim: 2, model: 'm' }),
        { status: 200 },
      ),
    );
    await expect(embedBatch(['a', 'b'])).rejects.toBeInstanceOf(EmbeddingClientError);
  });

  it('rejects empty batches', async () => {
    await expect(embedBatch([])).rejects.toBeInstanceOf(EmbeddingClientError);
  });
});

describe('embedSeed', () => {
  beforeEach(() => {
    process.env.SBERT_URL = 'http://sbert-test:8000';
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SBERT_URL;
  });

  it('renders then embeds', async () => {
    let sentBody: any;
    mockFetch((_url, init) => {
      sentBody = JSON.parse(init.body as string);
      return new Response(
        JSON.stringify({ vectors: [[0.42]], dim: 1, model: 'm' }),
        { status: 200 },
      );
    });
    const v = await embedSeed({
      $domain: 'audio',
      $name: 'wave',
      genes: { amp: { type: 'scalar', value: 0.5 } },
    });
    expect(v).toEqual([0.42]);
    expect(typeof sentBody.text).toBe('string');
    expect(sentBody.text).toContain('Domain: audio');
  });
});
