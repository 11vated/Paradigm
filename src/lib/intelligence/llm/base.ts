/**
 * Seed LLM — AI interface for generative design
 *
 * Provides natural language interaction with the Paradigm
 * generative system through a language model.
 */

import type { Seed, GeneratorOutput } from '../../kernel/engines';
import { rngFromHash } from '../../kernel/rng';
import { executeGspl } from '../../kernel/gspl-interpreter';
import { growSeed } from '../../kernel/engines';
import { OpenAISeedLLM } from './openai';
import { AnthropicSeedLLM } from './anthropic';

/**
 * Seed LLM interface
 */
export interface SeedLLM {
  /** Generate seed from prompt */
  generateSeed(prompt: string): Promise<Seed>;

  /** Generate GSPL program from description */
  generateGSPL(description: string, seed: Seed): Promise<string>;

  /** Refine existing seed based on feedback */
  refineSeed(seed: Seed, feedback: string): Promise<Seed>;

  /** Evaluate generative quality (0-1 score) */
  evaluateOutput(output: GeneratorOutput, criteria: string): Promise<number>;

  /** Batch generate seed variations */
  generateVariations(seed: Seed, count: number): Promise<Seed[]>;
}

/**
 * Seed LLM configuration
 */
export interface SeedLLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'mock';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Mock Seed LLM for testing (no API required)
 */
export class MockSeedLLM implements SeedLLM {
  private config: SeedLLMConfig;

  constructor(config: Partial<SeedLLMConfig> = {}) {
    this.config = {
      provider: 'mock',
      model: 'mock-v1',
      temperature: 0.7,
      maxTokens: 2048,
      ...config,
    };
  }

  async generateSeed(prompt: string): Promise<Seed> {
    const phrase = `seed:${prompt.toLowerCase().replace(/\s+/g, '_')}`;
    const hash = this.simpleHash64(phrase);

    return {
      phrase,
      hash,
      rng: rngFromHash(hash),
      $domain: 'character',
      $name: prompt.slice(0, 50),
    } as Seed;
  }

  private simpleHash64(phrase: string): string {
    let hash = 0;
    for (let i = 0; i < phrase.length; i++) {
      hash = ((hash << 5) - hash + phrase.charCodeAt(i)) | 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(16, '0');
    return (hex + hex + hex + hex).substring(0, 64);
  }

  async generateGSPL(description: string, seed: Seed): Promise<string> {
    const domain = (seed as any).$domain || 'character';

    if (domain === 'character') {
      return `seed mySeed "${seed.phrase}" in character {
  size: 1.75,
  style: "cyberpunk",
  strength: 0.8
}`;
    }

    if (domain === 'music') {
      return `seed mySeed "${seed.phrase}" in music {
  tempo: 120,
  key: "C",
  genre: "electronic"
}`;
    }

    if (domain === 'sprite') {
      return `seed mySeed "${seed.phrase}" in sprite {
  width: 32,
  height: 32,
  style: "pixel_art"
}`;
    }

    return `seed mySeed "${seed.phrase}" in ${domain} {}`;
  }

  async refineSeed(seed: Seed, feedback: string): Promise<Seed> {
    const newPhrase = `${seed.phrase}_refined_${feedback.slice(0, 10)}`;
    const newHash = this.simpleHash64(newPhrase);

    return {
      ...seed,
      phrase: newPhrase,
      hash: newHash,
      rng: rngFromHash(newHash),
    } as Seed;
  }

  async evaluateOutput(output: GeneratorOutput, criteria: string): Promise<number> {
    const rng = rngFromHash(`${output.seed_hash ?? output.name ?? output.domain}:${criteria}`);
    return 0.7 + rng.nextF64() * 0.25;
  }

  async generateVariations(seed: Seed, count: number): Promise<Seed[]> {
    const variations: Seed[] = [];
    for (let i = 0; i < count; i++) {
      const varPhrase = `${seed.phrase}_var${i}`;
      const varHash = this.simpleHash64(varPhrase);
      variations.push({
        ...seed,
        phrase: varPhrase,
        hash: varHash,
        rng: rngFromHash(varHash),
      } as Seed);
    }
    return variations;
  }
}

/**
 * Create a Seed LLM instance.
 *
 * Routing:
 *   - explicit provider in config takes priority
 *   - else if OPENAI_API_KEY is set → OpenAI
 *   - else if ANTHROPIC_API_KEY is set → Anthropic
 *   - else fall back to MockSeedLLM (with a warning)
 */
export function createSeedLLM(config: Partial<SeedLLMConfig> = {}): SeedLLM {
  const envOpenAI = typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined;
  const envAnthropic = typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined;

  const explicit = config.provider;
  let provider: SeedLLMConfig['provider'];
  if (explicit) {
    provider = explicit;
  } else if (envOpenAI) {
    provider = 'openai';
  } else if (envAnthropic) {
    provider = 'anthropic';
  } else {
    provider = 'mock';
    // eslint-disable-next-line no-console
    console.warn('[paradigm/llm] No OPENAI_API_KEY or ANTHROPIC_API_KEY found — falling back to MockSeedLLM. Set a provider key for real responses.');
  }

  switch (provider) {
    case 'openai':
      return new OpenAISeedLLM({
        provider: 'openai',
        model: config.model ?? 'gpt-4o-mini',
        apiKey: config.apiKey ?? envOpenAI,
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 2048,
        baseUrl: config.baseUrl,
      });
    case 'anthropic':
      return new AnthropicSeedLLM({
        provider: 'anthropic',
        model: config.model ?? 'claude-3-5-sonnet-20241022',
        apiKey: config.apiKey ?? envAnthropic,
        temperature: config.temperature ?? 0.7,
        maxTokens: config.maxTokens ?? 2048,
        baseUrl: config.baseUrl,
      });
    case 'ollama':
      throw new Error("Seed LLM provider 'ollama' not yet implemented");
    case 'mock':
    default:
      return new MockSeedLLM({ provider: 'mock', model: 'mock-v1', ...config });
  }
}

/**
 * Generate artifact from natural language prompt
 */
export async function generateFromPrompt(
  llm: SeedLLM,
  prompt: string
): Promise<{ seed: Seed; output: GeneratorOutput; gspl: string }> {
  const seed = await llm.generateSeed(prompt);
  const gspl = await llm.generateGSPL(prompt, seed);
  const output = await executeGspl(gspl, String(seed.phrase));
  return { seed, output, gspl };
}
