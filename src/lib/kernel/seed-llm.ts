/**
 * Seed LLM — AI interface for generative design
 *
 * Provides natural language interaction with the Paradigm
 * generative system through a language model.
 */

import type { Seed, GeneratorOutput } from '../engines';
import { rngFromHash } from './rng';
import { executeGspl } from './gspl-interpreter';
import { growSeed } from '../engines';

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
    return 0.7 + Math.random() * 0.25;
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
 * Create a Seed LLM instance
 */
export function createSeedLLM(config: Partial<SeedLLMConfig> = {}): SeedLLM {
  const fullConfig: SeedLLMConfig = {
    provider: 'mock',
    model: 'mock-v1',
    temperature: 0.7,
    maxTokens: 2048,
    ...config,
  };

  if (fullConfig.provider === 'mock') {
    return new MockSeedLLM(fullConfig);
  }

  throw new Error(`Seed LLM provider '${fullConfig.provider}' not yet implemented`);
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
  const output = await executeGspl(gspl, seed.phrase);
  return { seed, output, gspl };
}
