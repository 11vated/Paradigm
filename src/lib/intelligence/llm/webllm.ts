/**
 * Seed LLM — WebLLM (browser, WebGPU) Implementation
 *
 * The sovereignty-first default for browser environments. Runs a quantized
 * LLM directly on the user's WebGPU device using `@mlc-ai/web-llm`. No
 * server, no API key, no telemetry. Model weights are downloaded once
 * (~2GB for the default 3B model) and cached in the browser's
 * OPFS / Cache API forever after.
 *
 * Default model: `Llama-3.2-3B-Instruct-q4f16_1-MLC` — fits comfortably
 * on consumer GPUs (Apple Silicon, NVIDIA 30/40/50 series, AMD RDNA2+).
 * Falls back to `Phi-3.5-mini-instruct-q4f16_1-MLC` on devices with less
 * VRAM (declared at runtime, not here — see `selectModelForDevice`).
 *
 * IMPORTANT: this module dynamically imports `@mlc-ai/web-llm` only on
 * first use so it does not balloon the main bundle. The package is large
 * and only needed when local browser inference is actually requested.
 */

import type { Seed, GeneratorOutput } from '../../kernel/engines';
import type { SeedLLM, SeedLLMConfig } from './base';
import { rngFromHash } from '../../kernel/rng';

const DEFAULT_MODEL = 'Llama-3.2-3B-Instruct-q4f16_1-MLC';
const FALLBACK_MODEL = 'Phi-3.5-mini-instruct-q4f16_1-MLC';

// Minimal structural typing of the WebLLM engine so this file does not
// require the @mlc-ai/web-llm types at compile time. Real types are
// applied via the dynamic import at runtime.
interface WebLLMEngineLike {
  reload(modelId: string, options?: unknown): Promise<void>;
  chat: {
    completions: {
      create(req: {
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
        stream?: false;
      }): Promise<{ choices: Array<{ message: { content: string } }> }>;
    };
  };
}

export type WebLLMProgressCallback = (report: { progress: number; text: string }) => void;

export class WebLLMSeedLLM implements SeedLLM {
  private readonly modelId: string;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private engine: WebLLMEngineLike | null = null;
  private engineReady: Promise<void> | null = null;
  private readonly progressCb?: WebLLMProgressCallback;

  constructor(
    config: Partial<SeedLLMConfig> & { progressCallback?: WebLLMProgressCallback } = {},
  ) {
    this.modelId = config.model ?? DEFAULT_MODEL;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
    this.progressCb = config.progressCallback;
  }

  /**
   * Detect whether WebGPU is available in the current environment.
   * Synchronous, side-effect-free — safe to call during routing.
   */
  static isAvailable(): boolean {
    if (typeof navigator === 'undefined') return false;
    const gpu = (navigator as Navigator & { gpu?: unknown }).gpu;
    return Boolean(gpu);
  }

  /**
   * Choose a sensible default model for the current device. Right now we
   * use the requested device-memory heuristic; this is intentionally
   * coarse and will be sharpened once we have telemetry on real-world
   * runs across the user base. (Always falls back to the smallest model.)
   */
  static async selectModelForDevice(): Promise<string> {
    try {
      const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
      if (typeof mem === 'number' && mem < 8) return FALLBACK_MODEL;
      return DEFAULT_MODEL;
    } catch {
      return FALLBACK_MODEL;
    }
  }

  async generateSeed(prompt: string): Promise<Seed> {
    await this.ensureEngine();
    const sys =
      'You are a seed generator for the Paradigm generative substrate. ' +
      'Given a user prompt, output a single JSON object with the fields: ' +
      'phrase (string), domain (one of: character, music, sprite, visual2d, ' +
      'narrative, game, friend, world, agent), name (short string), and an ' +
      'optional genes object. Respond with JSON ONLY.';
    const raw = await this.chat([
      { role: 'system', content: sys },
      { role: 'user', content: prompt },
    ]);
    const parsed = extractJson(raw);
    if (!parsed) return fallbackSeed(prompt);

    const phrase = typeof parsed.phrase === 'string' ? parsed.phrase : `seed:${prompt}`;
    const hash = hashPhrase(phrase);
    return {
      phrase,
      hash,
      rng: rngFromHash(hash),
      $domain: typeof parsed.domain === 'string' ? parsed.domain : 'character',
      $name: typeof parsed.name === 'string' ? parsed.name : phrase.slice(0, 50),
      ...(parsed.genes && typeof parsed.genes === 'object' ? { genes: parsed.genes } : {}),
    } as Seed;
  }

  async generateGSPL(description: string, seed: Seed): Promise<string> {
    await this.ensureEngine();
    const domain = (seed as { $domain?: string }).$domain ?? 'character';
    const sys =
      'You are a GSPL author. Output one GSPL program for the given seed. ' +
      'Syntax: seed mySeed "phrase" in <domain> { field: value, ... }\n' +
      `Domain: ${domain}. Phrase: ${seed.phrase}. GSPL program ONLY, no fences.`;
    const raw = await this.chat([
      { role: 'system', content: sys },
      { role: 'user', content: description },
    ]);
    return stripFences(raw).trim() || `seed mySeed "${seed.phrase}" in ${domain} {}`;
  }

  async refineSeed(seed: Seed, feedback: string): Promise<Seed> {
    await this.ensureEngine();
    const raw = await this.chat([
      { role: 'system', content: 'Refine the seed. JSON only, same shape.' },
      { role: 'user', content: JSON.stringify({ seed, feedback }) },
    ]);
    const parsed = extractJson(raw);
    if (!parsed?.phrase) return seed;
    const phrase = String(parsed.phrase);
    const hash = hashPhrase(phrase);
    return { ...seed, phrase, hash, rng: rngFromHash(hash) } as Seed;
  }

  async evaluateOutput(output: GeneratorOutput, criteria: string): Promise<number> {
    await this.ensureEngine();
    const raw = await this.chat([
      { role: 'system', content: 'Return {"score": <0..1>} JSON only.' },
      {
        role: 'user',
        content: JSON.stringify({
          domain: output.domain,
          name: output.name,
          render_hints: output.render_hints,
          criteria,
        }),
      },
    ]);
    const parsed = extractJson(raw);
    const score = typeof parsed?.score === 'number' ? parsed.score : 0.7;
    return Math.max(0, Math.min(1, score));
  }

  async generateVariations(seed: Seed, count: number): Promise<Seed[]> {
    const out: Seed[] = [];
    for (let i = 0; i < count; i++) {
      const varPhrase = `${seed.phrase}_var${i}`;
      const hash = hashPhrase(varPhrase);
      out.push({ ...seed, phrase: varPhrase, hash, rng: rngFromHash(hash) } as Seed);
    }
    return out;
  }

  // ── engine lifecycle ───────────────────────────────────────────────────

  private async ensureEngine(): Promise<void> {
    if (this.engine) return;
    if (!this.engineReady) {
      this.engineReady = this.bootEngine();
    }
    await this.engineReady;
  }

  private async bootEngine(): Promise<void> {
    if (!WebLLMSeedLLM.isAvailable()) {
      throw new Error(
        'WebLLM requires WebGPU. Current environment has no `navigator.gpu`.',
      );
    }
    // Dynamic import to keep web-llm out of the default bundle.
    const mlc = (await import(/* @vite-ignore */ '@mlc-ai/web-llm')) as {
      CreateMLCEngine: (
        modelId: string,
        options?: { initProgressCallback?: WebLLMProgressCallback },
      ) => Promise<WebLLMEngineLike>;
    };
    this.engine = await mlc.CreateMLCEngine(this.modelId, {
      initProgressCallback: this.progressCb,
    });
  }

  private async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.engine) throw new Error('WebLLM engine not initialized');
    const resp = await this.engine.chat.completions.create({
      messages,
      temperature: this.temperature,
      max_tokens: this.maxTokens,
      stream: false,
    });
    return resp.choices[0]?.message?.content ?? '';
  }
}

export function createWebLLMSeedLLM(
  config: Partial<SeedLLMConfig> & { progressCallback?: WebLLMProgressCallback } = {},
): SeedLLM {
  return new WebLLMSeedLLM(config);
}

// ── helpers ──────────────────────────────────────────────────────────────

function extractJson(s: string): Record<string, unknown> | null {
  const stripped = stripFences(s);
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function stripFences(s: string): string {
  return s.replace(/```(?:json|gspl)?/g, '').replace(/```/g, '').trim();
}

function hashPhrase(phrase: string): string {
  let h = 0;
  for (let i = 0; i < phrase.length; i++) {
    h = ((h << 5) - h + phrase.charCodeAt(i)) | 0;
  }
  const hex = Math.abs(h).toString(16).padStart(16, '0');
  return (hex + hex + hex + hex).substring(0, 64);
}

function fallbackSeed(prompt: string): Seed {
  const phrase = `seed:${prompt.toLowerCase().replace(/\s+/g, '_')}`;
  const hash = hashPhrase(phrase);
  return {
    phrase,
    hash,
    rng: rngFromHash(hash),
    $domain: 'character',
    $name: prompt.slice(0, 50),
  } as Seed;
}
