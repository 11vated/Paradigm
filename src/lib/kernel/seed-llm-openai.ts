/**
 * Seed LLM — OpenAI Implementation
 *
 * Provides real LLM integration with OpenAI API
 * Implements the SeedLLM interface with GPT-4/GPT-3.5 models
 */

import type { Seed, GeneratorOutput } from './engines';
import type { SeedLLM, SeedLLMConfig } from './seed-llm';

/**
 * OpenAI-specific LLM implementation
 */
export class OpenAISeedLLM implements SeedLLM {
  private config: SeedLLMConfig;
  private apiKey: string;
  private baseUrl: string = 'https://api.openai.com/v1';

  constructor(config: Partial<SeedLLMConfig> = {}) {
    this.config = {
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      maxTokens: 2048,
      ...config,
    };

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key required. Set apiKey in config or OPENAI_API_KEY env variable.');
    }
    this.apiKey = this.config.apiKey;
  }

  async generateSeed(prompt: string): Promise<Seed> {
    const response = await this.callAPI([
      { role: 'system', content: 'You are a seed generator for the Paradigm genetic operating system. Generate a seed JSON object with phrase, hash, domain, and other relevant fields based on the user prompt.' },
      { role: 'user', content: `Generate a seed for: ${prompt}` },
    ]);

    try {
      const seed = JSON.parse(response);
      return {
        phrase: seed.phrase || `seed:${prompt.toLowerCase().replace(/\s+/g, '_')}`,
        hash: seed.hash || this.simpleHash64(seed.phrase || prompt),
        rng: this.createRNG(seed.hash || prompt),
        $domain: seed.domain || 'character',
        $name: seed.name || prompt.slice(0, 50),
        ...seed,
      } as Seed;
    } catch (e) {
      // Fallback: create deterministic seed from prompt
      const phrase = `seed:${prompt.toLowerCase().replace(/\s+/g, '_')}`;
      const hash = this.simpleHash64(phrase);
      return {
        phrase,
        hash,
        rng: this.createRNG(hash),
        $domain: 'character',
        $name: prompt.slice(0, 50),
      } as Seed;
    }
  }

  async generateGSPL(description: string, seed: Seed): Promise<string> {
    const response = await this.callAPI([
      { role: 'system', content: 'You are a GSPL (Genetic Seed Programming Language) expert. Generate valid GSPL code to create and manipulate seeds based on the user description.' },
      { role: 'user', content: `Write GSPL code to: ${description}\n\nSeed domain: ${seed.$domain || 'character'}\nSeed phrase: ${seed.phrase}` },
    ]);

    return response;
  }

  async refineSeed(seed: Seed, feedback: string): Promise<Seed> {
    const response = await this.callAPI([
      { role: 'system', content: 'You are refining a genetic seed based on feedback. Return the refined seed as JSON.' },
      { role: 'user', content: `Refine this seed based on feedback: ${feedback}\n\nSeed: ${JSON.stringify(seed, null, 2)}` },
    ]);

    try {
      const refined = JSON.parse(response);
      return {
        ...seed,
        ...refined,
        hash: refined.hash || this.simpleHash64(JSON.stringify(refined)),
      } as Seed;
    } catch (e) {
      return seed; // Return original if parsing fails
    }
  }

  async evaluateOutput(output: GeneratorOutput, criteria: string): Promise<number> {
    const response = await this.callAPI([
      { role: 'system', content: 'You evaluate generated content quality on a scale of 0 to 1. Return only the numeric score.' },
      { role: 'user', content: `Evaluate this output for: ${criteria}\n\nOutput: ${JSON.stringify(output, null, 2)}` },
    ]);

    const score = parseFloat(response);
    return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
  }

  async generateVariations(seed: Seed, count: number): Promise<Seed[]> {
    const response = await this.callAPI([
      { role: 'system', content: 'You generate variations of a genetic seed. Return an array of seed JSON objects.' },
      { role: 'user', content: `Generate ${count} variations of this seed:\n${JSON.stringify(seed, null, 2)}` },
    ]);

    try {
      const variations = JSON.parse(response);
      if (Array.isArray(variations)) {
        return variations.map((v: any) => ({
          ...seed,
          ...v,
          hash: v.hash || this.simpleHash64(JSON.stringify(v)),
        })) as Seed[];
      }
    } catch (e) {
      // Fallback: return clones with slight modifications
    }

    return Array(count).fill(null).map((_, i) => ({
      ...seed,
      phrase: `${seed.phrase}_var_${i}`,
      hash: this.simpleHash64(`${seed.phrase}_var_${i}`),
    })) as Seed[];
  }

  private async callAPI(messages: { role: string; content: string }[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private simpleHash64(phrase: string): string {
    let hash = 0;
    for (let i = 0; i < phrase.length; i++) {
      hash = ((hash << 5) - hash + phrase.charCodeAt(i)) | 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(16, '0');
    return (hex + hex + hex + hex).substring(0, 64);
  }

  private createRNG(seed: string) {
    let state = 0;
    for (let i = 0; i < seed.length; i++) {
      state = ((state << 5) - state + seed.charCodeAt(i)) | 0;
    }

    return {
      next: () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
      }
    };
  }
}

/**
 * Create a real OpenAI LLM instance
 */
export function createRealSeedLLM(config: Partial<SeedLLMConfig> = {}): SeedLLM {
  return new OpenAISeedLLM({
    provider: 'openai',
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    maxTokens: 2048,
    ...config,
  });
}
