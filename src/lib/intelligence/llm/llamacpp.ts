/**
 * Seed LLM — llama.cpp / LM Studio (OpenAI-compatible local server)
 *
 * Talks to any OpenAI-compatible HTTP endpoint that runs locally — most
 * commonly `llama-server` from llama.cpp, LM Studio, or `vllm` in
 * standalone mode. No API key is required (these servers do not check
 * one) but the field is still accepted for compatibility.
 *
 * Default base URL: http://localhost:8080/v1
 * Default model:    "local-model"  (most servers ignore model on inference)
 */

import type { Seed, GeneratorOutput } from '../../kernel/engines';
import type { SeedLLM, SeedLLMConfig } from './base';
import { rngFromHash } from '../../kernel/rng';

const DEFAULT_URL = 'http://localhost:8080/v1';
const DEFAULT_MODEL = 'local-model';

export class LlamaCppSeedLLM implements SeedLLM {
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config: Partial<SeedLLMConfig> = {}) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.baseUrl = (config.baseUrl ?? DEFAULT_URL).replace(/\/$/, '');
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
  }

  static async isAvailable(baseUrl = DEFAULT_URL): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 750);
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateSeed(prompt: string): Promise<Seed> {
    const raw = await this.chat([
      {
        role: 'system',
        content:
          'You are a seed generator for the Paradigm generative substrate. ' +
          'Output a single JSON object with: phrase, domain, name, and an optional ' +
          'genes object. JSON only.',
      },
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
    const domain = (seed as { $domain?: string }).$domain ?? 'character';
    const raw = await this.chat([
      {
        role: 'system',
        content:
          'You are a GSPL author. Output one GSPL program: ' +
          'seed mySeed "phrase" in <domain> { field: value, ... }. No fences.',
      },
      {
        role: 'user',
        content: `Domain: ${domain}\nPhrase: ${seed.phrase}\nDescription: ${description}`,
      },
    ]);
    return stripFences(raw).trim() || `seed mySeed "${seed.phrase}" in ${domain} {}`;
  }

  async refineSeed(seed: Seed, feedback: string): Promise<Seed> {
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

  private async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        stream: false,
      }),
    });
    if (!res.ok) {
      throw new Error(`llama.cpp endpoint responded ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? '';
  }
}

export function createLlamaCppSeedLLM(config: Partial<SeedLLMConfig> = {}): SeedLLM {
  return new LlamaCppSeedLLM(config);
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
