/**
 * Seed LLM — Anthropic (Claude) Implementation
 *
 * Provides real LLM integration with the Anthropic Messages API.
 * Implements the SeedLLM interface with Claude 3.5+ models.
 *
 * Note: this client is provider-agnostic at the interface level — it
 * speaks the Anthropic Messages format, but downstream domain helpers
 * (Seed / GSPL routing) live in `base.ts`.
 */

import type { Seed, GeneratorOutput } from '../../kernel/engines';
import type { SeedLLM, SeedLLMConfig } from './base';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AnthropicSeedLLM implements SeedLLM {
  private config: SeedLLMConfig;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: Partial<SeedLLMConfig> = {}) {
    this.config = {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 2048,
      ...config,
    };

    const apiKey = this.config.apiKey ?? (typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined);
    if (!apiKey) {
      throw new Error('Anthropic API key required. Set apiKey in config or ANTHROPIC_API_KEY env variable.');
    }
    this.apiKey = apiKey;
    this.baseUrl = this.config.baseUrl ?? 'https://api.anthropic.com/v1';
  }

  async generateSeed(prompt: string): Promise<Seed> {
    const text = await this.callAPI(
      'You are a seed generator for the Paradigm genetic operating system. Output ONLY valid minified JSON with fields {phrase, hash, domain, name}. No commentary.',
      [{ role: 'user', content: `Generate a seed for: ${prompt}` }],
    );

    const fallback = (): Seed => {
      const phrase = `seed:${prompt.toLowerCase().replace(/\s+/g, '_')}`;
      const hash = this.simpleHash64(phrase);
      return { phrase, hash, rng: this.createRNG(hash), $domain: 'character', $name: prompt.slice(0, 50) } as Seed;
    };

    try {
      const parsed = JSON.parse(this.extractJson(text));
      const hash = parsed.hash ?? this.simpleHash64(parsed.phrase ?? prompt);
      return {
        phrase: parsed.phrase ?? `seed:${prompt.toLowerCase().replace(/\s+/g, '_')}`,
        hash,
        rng: this.createRNG(hash),
        $domain: parsed.domain ?? 'character',
        $name: parsed.name ?? prompt.slice(0, 50),
        ...parsed,
      } as Seed;
    } catch {
      return fallback();
    }
  }

  async generateGSPL(description: string, seed: Seed): Promise<string> {
    return this.callAPI(
      'You are a GSPL (Genetic Seed Programming Language) expert. Output ONLY valid GSPL source code, no markdown fences, no commentary.',
      [{ role: 'user', content: `Write GSPL to: ${description}\nDomain: ${seed.$domain ?? 'character'}\nPhrase: ${seed.phrase}` }],
    );
  }

  async refineSeed(seed: Seed, feedback: string): Promise<Seed> {
    const text = await this.callAPI(
      'You refine a genetic seed. Output ONLY a JSON object representing the refined seed.',
      [{ role: 'user', content: `Refine this seed:\nFEEDBACK: ${feedback}\nSEED: ${JSON.stringify(seed)}` }],
    );
    try {
      const refined = JSON.parse(this.extractJson(text));
      return { ...seed, ...refined, hash: refined.hash ?? this.simpleHash64(JSON.stringify(refined)) } as Seed;
    } catch {
      return seed;
    }
  }

  async evaluateOutput(output: GeneratorOutput, criteria: string): Promise<number> {
    const text = await this.callAPI(
      'You evaluate generated content quality on a 0–1 scale. Output ONLY the numeric score.',
      [{ role: 'user', content: `Criteria: ${criteria}\nOutput: ${JSON.stringify(output)}` }],
    );
    const score = parseFloat(text.trim());
    return Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0.5;
  }

  async generateVariations(seed: Seed, count: number): Promise<Seed[]> {
    const text = await this.callAPI(
      'You generate variations of a genetic seed. Output ONLY a JSON array of objects.',
      [{ role: 'user', content: `Generate ${count} variations of: ${JSON.stringify(seed)}` }],
    );
    try {
      const arr = JSON.parse(this.extractJson(text));
      if (Array.isArray(arr)) {
        return arr.map((v: any) => ({
          ...seed,
          ...v,
          hash: v.hash ?? this.simpleHash64(JSON.stringify(v)),
        })) as Seed[];
      }
    } catch { /* fall through */ }
    return Array.from({ length: count }, (_, i) => ({
      ...seed,
      phrase: `${seed.phrase}_var_${i}`,
      hash: this.simpleHash64(`${seed.phrase}_var_${i}`),
    })) as Seed[];
  }

  private async callAPI(system: string, messages: AnthropicMessage[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system,
        messages,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Anthropic API error: ${(err as any).error?.message ?? res.statusText}`);
    }
    const data = await res.json();
    const block = data.content?.[0];
    return block?.type === 'text' ? block.text : '';
  }

  private extractJson(text: string): string {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced && fenced[1]) return fenced[1].trim();
    return text.trim();
  }

  private simpleHash64(phrase: string): string {
    let hash = 0;
    for (let i = 0; i < phrase.length; i++) hash = ((hash << 5) - hash + phrase.charCodeAt(i)) | 0;
    const hex = Math.abs(hash).toString(16).padStart(16, '0');
    return (hex + hex + hex + hex).substring(0, 64);
  }

  private createRNG(seed: string) {
    let state = 0;
    for (let i = 0; i < seed.length; i++) state = ((state << 5) - state + seed.charCodeAt(i)) | 0;
    return {
      next: () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
      },
    };
  }
}

export function createAnthropicSeedLLM(config: Partial<SeedLLMConfig> = {}): SeedLLM {
  return new AnthropicSeedLLM(config);
}
