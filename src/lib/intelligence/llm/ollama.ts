/**
 * Seed LLM — Ollama (local) Implementation
 *
 * Sovereignty-first default for any environment where the user runs the
 * Ollama daemon locally (default: http://localhost:11434).
 *
 * No API keys. No external calls. Models live on the user's machine and
 * inference runs on the user's CPU/GPU.
 *
 * Default model: `llama3.2:3b` — small enough to fit on most machines
 * (~2GB), large enough to handle GSPL synthesis with good few-shot
 * prompting. Users may override via `OLLAMA_MODEL` env var or config.
 *
 * Companion install instructions live in `docs/sovereign-llm/README.md`.
 */

import type { Seed, GeneratorOutput } from '../../kernel/engines';
import type { SeedLLM, SeedLLMConfig } from './base';
import { rngFromHash } from '../../kernel/rng';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_MODEL = 'llama3.2:3b';

interface OllamaResponse {
  model: string;
  created_at: string;
  message: { role: string; content: string };
  done: boolean;
}

/**
 * Local-first Seed LLM client speaking the Ollama HTTP API.
 *
 * Talks to the local Ollama daemon over plain HTTP. No streaming for now —
 * we collect the full response per call. Streaming is a follow-up.
 */
export class OllamaSeedLLM implements SeedLLM {
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly temperature: number;
  private readonly maxTokens: number;

  constructor(config: Partial<SeedLLMConfig> = {}) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.baseUrl = (config.baseUrl ?? DEFAULT_OLLAMA_URL).replace(/\/$/, '');
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
  }

  /**
   * Detect whether the Ollama daemon is reachable.
   * Cheap fetch against /api/tags with a short timeout.
   */
  static async isAvailable(baseUrl = DEFAULT_OLLAMA_URL): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 750);
      const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
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
    const sys =
      'You are a seed generator for the Paradigm generative substrate. ' +
      'Given a user prompt, output a single JSON object with the fields: ' +
      'phrase (string), domain (one of: character, music, sprite, visual2d, ' +
      'narrative, game, friend, world, agent), name (short string), and an ' +
      'optional genes object with domain-appropriate fields. Respond with ' +
      'JSON ONLY — no prose, no markdown.';

    const raw = await this.chat([
      { role: 'system', content: sys },
      { role: 'user', content: prompt },
    ]);

    const parsed = extractJson(raw);
    if (!parsed) return fallbackSeed(prompt);

    const phrase: string = typeof parsed.phrase === 'string' ? parsed.phrase : `seed:${prompt}`;
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
    const sys =
      'You are a GSPL (Generative Seed Programming Language) author. ' +
      'Given a description and a seed, output a single GSPL program. ' +
      'GSPL syntax example:\n' +
      'seed mySeed "phrase here" in <domain> {\n' +
      '  field: value,\n' +
      '  ...\n' +
      '}\n\n' +
      `Target domain: ${domain}.\nSeed phrase: ${seed.phrase}.\n` +
      'Respond with the GSPL program ONLY — no explanation, no fences.';

    const raw = await this.chat([
      { role: 'system', content: sys },
      { role: 'user', content: description },
    ]);

    return stripFences(raw).trim() || fallbackGspl(seed, domain);
  }

  async refineSeed(seed: Seed, feedback: string): Promise<Seed> {
    const sys =
      'You refine seeds. Given a current seed (JSON) and feedback, ' +
      'output an improved seed JSON with the same shape. JSON only.';

    const raw = await this.chat([
      { role: 'system', content: sys },
      { role: 'user', content: JSON.stringify({ seed, feedback }) },
    ]);
    const parsed = extractJson(raw);
    if (!parsed?.phrase) return seed;

    const phrase = String(parsed.phrase);
    const hash = hashPhrase(phrase);
    return { ...seed, phrase, hash, rng: rngFromHash(hash) } as Seed;
  }

  async evaluateOutput(output: GeneratorOutput, criteria: string): Promise<number> {
    const sys =
      'You are a generative quality evaluator. Given a generator output ' +
      'description and a criteria string, return a JSON object {"score": <float 0..1>}. ' +
      'JSON only.';

    const raw = await this.chat([
      { role: 'system', content: sys },
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
    const variations: Seed[] = [];
    for (let i = 0; i < count; i++) {
      const varPhrase = `${seed.phrase}_var${i}`;
      const hash = hashPhrase(varPhrase);
      variations.push({ ...seed, phrase: varPhrase, hash, rng: rngFromHash(hash) } as Seed);
    }
    return variations;
  }

  // ── private ────────────────────────────────────────────────────────────

  private async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
    const url = `${this.baseUrl}/api/chat`;
    const body = JSON.stringify({
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature: this.temperature,
        num_predict: this.maxTokens,
      },
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) {
      throw new Error(`Ollama responded ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as OllamaResponse;
    return data.message?.content ?? '';
  }
}

export function createOllamaSeedLLM(config: Partial<SeedLLMConfig> = {}): SeedLLM {
  return new OllamaSeedLLM(config);
}

// ── helpers (shared with other local providers) ──────────────────────────

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

function fallbackGspl(seed: Seed, domain: string): string {
  return `seed mySeed "${seed.phrase}" in ${domain} {}`;
}
