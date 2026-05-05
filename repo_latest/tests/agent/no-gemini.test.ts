/**
 * Phase 11 — No-Gemini guarantee for the agent inference stack.
 *
 * The user's frustration log specifically calls out "Gemini wrapping
 * itself as the GSPL agent" as a recurring failure mode of prior AI
 * assistants. Phase 8 introduced `Phi4InferenceClient`. Phase 10
 * de-Gemini-fied `IntelligenceLayer`. Phase 11 finishes the job by
 * routing `getInferenceClient()` (the singleton the rest of the agent
 * stack consumes) to the Phi-4 client and removing the Gemini fallback
 * from `LocalInferenceClient`.
 *
 * These tests lock in three properties of that change:
 *   1. The default agent inference client is the Phi-4 client — no
 *      Gemini code path can be reached through `getInferenceClient()`.
 *   2. Every fetch issued during a `generate()` call goes to the
 *      configured local inference URL, never to googleapis.com or
 *      api.openai.com.
 *   3. With no local server reachable, `generate()` degrades to KERNEL
 *      (deterministic empty response) rather than silently shipping
 *      the prompt to a third party.
 *
 * If a future regression re-introduces Gemini under any of these names,
 * one of these tests will fail.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  getInferenceClient,
  LocalInferenceClient,
  resetInferenceClient,
} from '../../src/lib/agent/inference.js';
import { Phi4InferenceClient } from '../../src/lib/agent/phi4_inference.js';
import { InferenceTier } from '../../src/lib/agent/types.js';

const ORIGINAL_FETCH = globalThis.fetch;
const ORIGINAL_ENV: Record<string, string | undefined> = {};

const ENV_KEYS = [
  'PARADIGM_INFERENCE_URL',
  'LLAMA_SERVER_URL',
  'PARADIGM_INFERENCE_API_KEY',
  'GEMINI_API_KEY',
];

beforeEach(() => {
  for (const k of ENV_KEYS) ORIGINAL_ENV[k] = process.env[k];
  resetInferenceClient();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (ORIGINAL_ENV[k] === undefined) delete process.env[k];
    else process.env[k] = ORIGINAL_ENV[k];
  }
  globalThis.fetch = ORIGINAL_FETCH;
  resetInferenceClient();
});

describe('Inference singleton — Phi-4 only', () => {
  it('getInferenceClient returns a Phi4InferenceClient instance', () => {
    const client = getInferenceClient();
    expect(client).toBeInstanceOf(Phi4InferenceClient);
  });

  it('LocalInferenceClient export is the Phi-4 class (alias preserved for back-compat)', () => {
    // The old name still resolves so existing call sites compile.
    expect(LocalInferenceClient).toBe(Phi4InferenceClient);
  });

  it('client implements the InferenceClient surface (generate, health, isAvailable, maxAvailableTier)', () => {
    const client = getInferenceClient();
    expect(typeof client.generate).toBe('function');
    expect(typeof client.health).toBe('function');
    expect(typeof client.isAvailable).toBe('function');
    expect(typeof client.maxAvailableTier).toBe('function');
  });
});

describe('No-Gemini guarantee — agent inference stack', () => {
  it('every fetch URL during generate() targets the configured local inference URL', async () => {
    const visited: string[] = [];
    const fakeFetch = vi.fn(async (input: any) => {
      const url = typeof input === 'string' ? input : input.url;
      visited.push(url);
      if (url.endsWith('/v1/models')) {
        return new Response(
          JSON.stringify({ data: [{ id: 'phi-4' }, { id: 'phi-4-mini-instruct' }] }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      if (url.endsWith('/v1/chat/completions')) {
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'ok' } }],
            usage: { total_tokens: 5 },
            model: 'phi-4',
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      }
      return new Response('not found', { status: 404 });
    });
    globalThis.fetch = fakeFetch as any;

    process.env.PARADIGM_INFERENCE_URL = 'http://local-llm:8080';
    process.env.GEMINI_API_KEY = 'this-key-must-never-be-used';

    const client = getInferenceClient();
    await client.generate(
      { prompt: 'hello', maxTokens: 16, temperature: 0 },
      InferenceTier.STANDARD,
    );

    expect(visited.length).toBeGreaterThan(0);
    // All traffic stays on the configured local URL.
    for (const url of visited) {
      expect(url.startsWith('http://local-llm:8080')).toBe(true);
      expect(url).not.toMatch(/googleapis\.com/);
      expect(url).not.toMatch(/generativelanguage/);
      expect(url).not.toMatch(/api\.openai\.com/);
    }
  });

  it('with no local server reachable, generate() degrades to KERNEL (does NOT call Gemini)', async () => {
    // Simulate a totally dead local server. If the old Gemini fallback
    // had survived, this would have caused a googleapis.com hit. Now it
    // must just return empty text at tier KERNEL.
    const visited: string[] = [];
    globalThis.fetch = (async (input: any) => {
      const url = typeof input === 'string' ? input : input.url;
      visited.push(url);
      throw new Error('ECONNREFUSED');
    }) as any;

    process.env.PARADIGM_INFERENCE_URL = 'http://nope:9999';
    process.env.GEMINI_API_KEY = 'this-key-must-never-be-used';

    const client = getInferenceClient();
    const result = await client.generate(
      { prompt: 'hello', maxTokens: 16, temperature: 0 },
      InferenceTier.STANDARD,
    );

    expect(result.tier).toBe(InferenceTier.KERNEL);
    expect(result.text).toBe('');
    // Any fetches that did happen were probes against the configured
    // local URL — never Gemini.
    for (const url of visited) {
      expect(url.startsWith('http://nope:9999')).toBe(true);
    }
  });

  it('source tree contains no live import of @google/genai (only documentation comments)', async () => {
    // Belt-and-braces: if a future change re-adds the dep, this test +
    // the missing entry in package.json will catch it together. We allow
    // the package name to appear in comments (Phase 8/10/11 docs explain
    // why it was removed) but disallow any actual ES `import` statement
    // or `require()` call.
    const repoRoot = path.resolve(__dirname, '../..');
    const targets = [
      path.join(repoRoot, 'src'),
      path.join(repoRoot, 'server.ts'),
    ];
    const offenders: string[] = [];
    for (const t of targets) {
      const stat = await fs.stat(t).catch(() => null);
      if (!stat) continue;
      if (stat.isDirectory()) {
        await walk(t, async (file) => {
          if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file)) return;
          const text = await fs.readFile(file, 'utf-8');
          if (/^[^/\n]*import[^\n]*from\s*['"]@google\/genai['"]/m.test(text)) offenders.push(file);
          if (/require\(['"]@google\/genai['"]\)/.test(text)) offenders.push(file);
        });
      } else {
        const text = await fs.readFile(t, 'utf-8');
        if (/^[^/\n]*import[^\n]*from\s*['"]@google\/genai['"]/m.test(text)) offenders.push(t);
        if (/require\(['"]@google\/genai['"]\)/.test(text)) offenders.push(t);
      }
    }
    expect(offenders).toEqual([]);
  });
});

async function walk(dir: string, visit: (file: string) => Promise<void>): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
      await walk(full, visit);
    } else if (e.isFile()) {
      await visit(full);
    }
  }
}
