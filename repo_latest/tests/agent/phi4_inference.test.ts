/**
 * Phase 8 — Phi4InferenceClient tests.
 *
 * Uses an injected `fetch` to simulate the OpenAI-compatible server.
 * No network, no Gemini, no llama.cpp required — if these go green, the
 * tier routing, caching, health, strict-tier, and fallback behavior are
 * correct against any server that speaks the OpenAI chat/completions API.
 */
import { describe, it, expect, vi } from 'vitest';
import { Phi4InferenceClient } from '../../src/lib/agent/phi4_inference.js';
import { InferenceTier } from '../../src/lib/agent/types.js';

// ─── Fake-fetch helpers ────────────────────────────────────────────────────

interface ServerConfig {
  /** Model ids the `/v1/models` endpoint will advertise. */
  models: string[];
  /** Replies to chat completions. Keyed by model id → response text. */
  replies?: Record<string, string>;
  /** If set, /v1/models returns this HTTP status. */
  modelsStatus?: number;
  /** If set, /v1/chat/completions returns this HTTP status. */
  chatStatus?: number;
  /** Hook to observe / customize each chat call. */
  onChat?: (body: any) => void;
}

function fakeFetch(config: ServerConfig): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : (input as URL | Request).toString();
    if (url.endsWith('/v1/models')) {
      const status = config.modelsStatus ?? 200;
      const body = status === 200 ? JSON.stringify({ data: config.models.map((id) => ({ id })) }) : '';
      return new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
    }
    if (url.endsWith('/v1/chat/completions')) {
      const status = config.chatStatus ?? 200;
      const body = JSON.parse((init?.body as string) ?? '{}');
      config.onChat?.(body);
      if (status !== 200) {
        return new Response(`err-${status}`, { status });
      }
      const text = config.replies?.[body.model] ?? `echo:${body.messages.at(-1)?.content ?? ''}`;
      const payload = {
        model: body.model,
        choices: [{ message: { role: 'assistant', content: text } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      };
      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response('not found', { status: 404 });
  }) as unknown as typeof fetch;
}

// ─── Tier availability & health ────────────────────────────────────────────

describe('Phi4InferenceClient — tier availability', () => {
  it('reports all non-kernel tiers unavailable before health()', () => {
    const c = new Phi4InferenceClient({ fetchImpl: fakeFetch({ models: [] }) });
    expect(c.isAvailable(InferenceTier.KERNEL)).toBe(true);
    expect(c.isAvailable(InferenceTier.FAST)).toBe(false);
    expect(c.isAvailable(InferenceTier.STANDARD)).toBe(false);
    expect(c.isAvailable(InferenceTier.DEEP)).toBe(false);
    expect(c.maxAvailableTier()).toBe(InferenceTier.KERNEL);
  });

  it('detects tiers based on loaded models after health()', async () => {
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({ models: ['phi-4-mini-instruct', 'phi-4'] }),
    });
    await c.health();
    expect(c.isAvailable(InferenceTier.STANDARD)).toBe(true);
    expect(c.isAvailable(InferenceTier.DEEP)).toBe(true);
    expect(c.isAvailable(InferenceTier.FAST)).toBe(false); // no phi-3.5-mini
  });

  it('does case-insensitive model matching', async () => {
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({ models: ['Phi-4-Mini-INSTRUCT'] }),
    });
    await c.health();
    expect(c.isAvailable(InferenceTier.STANDARD)).toBe(true);
  });

  it('marks the server unreachable when /v1/models returns 500', async () => {
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({ models: ['phi-4'], modelsStatus: 500 }),
    });
    const h = await c.health();
    expect(h.available).toBe(false);
  });

  it('marks the server unreachable when fetch throws', async () => {
    const throwingFetch = (async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch;
    const c = new Phi4InferenceClient({ fetchImpl: throwingFetch });
    const h = await c.health();
    expect(h.available).toBe(false);
    expect(c.maxAvailableTier()).toBe(InferenceTier.KERNEL);
  });

  it('respects custom tier models', async () => {
    const c = new Phi4InferenceClient({
      tierModels: { [InferenceTier.FAST]: 'qwen-2.5-1.5b' },
      fetchImpl: fakeFetch({ models: ['qwen-2.5-1.5b'] }),
    });
    await c.health();
    expect(c.isAvailable(InferenceTier.FAST)).toBe(true);
    expect(c.configuredModel(InferenceTier.FAST)).toBe('qwen-2.5-1.5b');
  });
});

// ─── Kernel tier + strict tier ─────────────────────────────────────────────

describe('Phi4InferenceClient — kernel tier and strictTier', () => {
  it('returns an empty kernel response for KERNEL requests', async () => {
    const c = new Phi4InferenceClient({ fetchImpl: fakeFetch({ models: [] }) });
    const r = await c.generate(
      { prompt: 'anything', maxTokens: 10, temperature: 0 },
      InferenceTier.KERNEL,
    );
    expect(r.tier).toBe(InferenceTier.KERNEL);
    expect(r.text).toBe('');
    expect(r.model).toBe('kernel');
  });

  it('returns kernel when no non-kernel tier is available', async () => {
    const c = new Phi4InferenceClient({ fetchImpl: fakeFetch({ models: [] }) });
    const r = await c.generate(
      { prompt: 'hi', maxTokens: 10, temperature: 0 },
      InferenceTier.STANDARD,
    );
    expect(r.tier).toBe(InferenceTier.KERNEL);
  });

  it('strictTier: throws when the requested tier is unavailable', async () => {
    const c = new Phi4InferenceClient({
      strictTier: true,
      fetchImpl: fakeFetch({ models: ['phi-3.5-mini-instruct'] }),
    });
    await c.health();
    await expect(
      c.generate({ prompt: 'hi', maxTokens: 5, temperature: 0 }, InferenceTier.DEEP),
    ).rejects.toThrow(/strictTier/);
  });
});

// ─── Routing & fallback ────────────────────────────────────────────────────

describe('Phi4InferenceClient — tier routing', () => {
  it('uses the exact requested tier when available', async () => {
    const chatCalls: any[] = [];
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({
        models: ['phi-4-mini-instruct', 'phi-4'],
        onChat: (body) => chatCalls.push(body),
      }),
    });
    await c.health();
    const r = await c.generate(
      { prompt: 'what', maxTokens: 5, temperature: 0 },
      InferenceTier.STANDARD,
    );
    expect(r.tier).toBe(InferenceTier.STANDARD);
    expect(r.model).toBe('phi-4-mini-instruct');
    expect(chatCalls[0].model).toBe('phi-4-mini-instruct');
  });

  it('falls back to the next available tier when preferred is missing', async () => {
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({ models: ['phi-3.5-mini-instruct'] }),
    });
    await c.health();
    const r = await c.generate(
      { prompt: 'hi', maxTokens: 5, temperature: 0 },
      InferenceTier.DEEP,
    );
    expect(r.tier).toBe(InferenceTier.FAST);
    expect(r.model).toBe('phi-3.5-mini-instruct');
  });

  it('returns kernel when chat completions keeps failing and strictTier is false', async () => {
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({ models: ['phi-4'], chatStatus: 503 }),
    });
    await c.health();
    const r = await c.generate(
      { prompt: 'hi', maxTokens: 5, temperature: 0 },
      InferenceTier.DEEP,
    );
    expect(r.tier).toBe(InferenceTier.KERNEL);
  });
});

// ─── Response shape ────────────────────────────────────────────────────────

describe('Phi4InferenceClient — response shape', () => {
  it('populates text, tokensUsed, and latencyMs', async () => {
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({
        models: ['phi-4'],
        replies: { 'phi-4': 'hello world' },
      }),
    });
    await c.health();
    const r = await c.generate(
      { prompt: 'prompt', maxTokens: 10, temperature: 0 },
      InferenceTier.DEEP,
    );
    expect(r.text).toBe('hello world');
    expect(r.tokensUsed).toBe(30);
    expect(typeof r.latencyMs).toBe('number');
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    expect(r.cached).toBe(false);
  });

  it('forwards system prompt into chat messages', async () => {
    const seen: any[] = [];
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({
        models: ['phi-4'],
        onChat: (body) => seen.push(body),
      }),
    });
    await c.health();
    await c.generate(
      { prompt: 'u', systemPrompt: 's', maxTokens: 5, temperature: 0 },
      InferenceTier.DEEP,
    );
    expect(seen[0].messages).toEqual([
      { role: 'system', content: 's' },
      { role: 'user', content: 'u' },
    ]);
  });

  it('forwards stop sequences and json mode', async () => {
    const seen: any[] = [];
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({
        models: ['phi-4'],
        onChat: (body) => seen.push(body),
      }),
    });
    await c.health();
    await c.generate(
      { prompt: 'u', maxTokens: 5, temperature: 0, stopSequences: ['\n\n'], jsonMode: true },
      InferenceTier.DEEP,
    );
    expect(seen[0].stop).toEqual(['\n\n']);
    expect(seen[0].response_format).toEqual({ type: 'json_object' });
  });
});

// ─── Caching ───────────────────────────────────────────────────────────────

describe('Phi4InferenceClient — caching', () => {
  it('returns cached response for identical requests', async () => {
    let chatCalls = 0;
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({
        models: ['phi-4'],
        onChat: () => { chatCalls++; },
      }),
    });
    await c.health();
    const req = { prompt: 'x', maxTokens: 5, temperature: 0 };
    const r1 = await c.generate(req, InferenceTier.DEEP);
    const r2 = await c.generate(req, InferenceTier.DEEP);
    expect(r1.cached).toBe(false);
    expect(r2.cached).toBe(true);
    expect(chatCalls).toBe(1);
    expect(c.cacheSize()).toBe(1);
  });

  it('different prompts produce distinct cache entries', async () => {
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({ models: ['phi-4'] }),
    });
    await c.health();
    await c.generate({ prompt: 'a', maxTokens: 5, temperature: 0 }, InferenceTier.DEEP);
    await c.generate({ prompt: 'b', maxTokens: 5, temperature: 0 }, InferenceTier.DEEP);
    expect(c.cacheSize()).toBe(2);
  });

  it('system prompt difference invalidates cache (collision-resistant)', async () => {
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({ models: ['phi-4'] }),
    });
    await c.health();
    await c.generate(
      { prompt: 'hi', systemPrompt: 'be terse', maxTokens: 5, temperature: 0 },
      InferenceTier.DEEP,
    );
    await c.generate(
      { prompt: 'hi', systemPrompt: 'be verbose', maxTokens: 5, temperature: 0 },
      InferenceTier.DEEP,
    );
    expect(c.cacheSize()).toBe(2);
  });

  it('clearCache empties the cache', async () => {
    const c = new Phi4InferenceClient({
      fetchImpl: fakeFetch({ models: ['phi-4'] }),
    });
    await c.health();
    await c.generate({ prompt: 'x', maxTokens: 5, temperature: 0 }, InferenceTier.DEEP);
    expect(c.cacheSize()).toBe(1);
    c.clearCache();
    expect(c.cacheSize()).toBe(0);
  });
});

// ─── Auth headers ──────────────────────────────────────────────────────────

describe('Phi4InferenceClient — auth headers', () => {
  it('adds bearer token to requests when apiKey is set', async () => {
    const seenAuth: (string | undefined)[] = [];
    const customFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string> | undefined;
      seenAuth.push(headers?.Authorization);
      if (String(input).endsWith('/v1/models')) {
        return new Response(JSON.stringify({ data: [{ id: 'phi-4' }] }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'ok' } }],
          usage: { total_tokens: 5 },
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const c = new Phi4InferenceClient({ apiKey: 'sk-test', fetchImpl: customFetch });
    await c.health();
    await c.generate({ prompt: 'x', maxTokens: 5, temperature: 0 }, InferenceTier.DEEP);
    expect(seenAuth.every((h) => h === 'Bearer sk-test')).toBe(true);
  });

  it('omits Authorization when no apiKey is configured', async () => {
    const seenAuth: (string | undefined)[] = [];
    const customFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string> | undefined;
      seenAuth.push(headers?.Authorization);
      return new Response(JSON.stringify({ data: [{ id: 'phi-4' }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const c = new Phi4InferenceClient({ fetchImpl: customFetch });
    await c.health();
    expect(seenAuth.every((h) => h === undefined)).toBe(true);
  });
});

// ─── No-Gemini guarantee ───────────────────────────────────────────────────

describe('Phi4InferenceClient — no hidden fallbacks', () => {
  it('never contacts any URL outside the configured baseUrl', async () => {
    const visited: string[] = [];
    const recordingFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : (input as URL | Request).toString();
      visited.push(url);
      if (url.endsWith('/v1/models')) {
        return new Response(JSON.stringify({ data: [{ id: 'phi-4' }] }), { status: 200 });
      }
      if (url.endsWith('/v1/chat/completions')) {
        // Simulate a server failure to exercise fallback code paths.
        return new Response('bad gateway', { status: 502 });
      }
      return new Response('', { status: 404 });
    }) as unknown as typeof fetch;
    const c = new Phi4InferenceClient({ baseUrl: 'http://local-only:9999', fetchImpl: recordingFetch });
    await c.health();
    await c.generate({ prompt: 'x', maxTokens: 5, temperature: 0 }, InferenceTier.DEEP);
    // Every URL hit must have started with the configured base.
    for (const u of visited) expect(u.startsWith('http://local-only:9999')).toBe(true);
    // And none may contain Google/OpenAI hosted domains.
    for (const u of visited) {
      expect(u).not.toMatch(/generativelanguage\.googleapis\.com/);
      expect(u).not.toMatch(/api\.openai\.com/);
    }
  });
});
