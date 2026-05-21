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
import { OllamaSeedLLM } from './ollama';
import { LlamaCppSeedLLM } from './llamacpp';
import { WebLLMSeedLLM } from './webllm';

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
  provider: 'webllm' | 'ollama' | 'llamacpp' | 'openai' | 'anthropic' | 'mock';
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
 * Sovereignty-first routing:
 *   - explicit `config.provider` always wins
 *   - browser + WebGPU → WebLLM (zero install, runs locally)
 *   - OLLAMA_HOST env  → Ollama
 *   - LLAMACPP_URL env → llama.cpp / LM Studio compatible endpoint
 *   - otherwise → MockSeedLLM (test mode, no warnings)
 *
 * Commercial APIs (OpenAI, Anthropic) are opt-in only — they will NEVER
 * be selected automatically, even if their API key env vars are set.
 * Pass `provider: 'openai' | 'anthropic'` explicitly to use them.
 *
 * For true runtime auto-detection that probes localhost services, use
 * `selectSovereignProvider()` instead.
 */
export function createSeedLLM(config: Partial<SeedLLMConfig> = {}): SeedLLM {
  const explicit = config.provider;

  // Explicit provider wins — no auto-detect, no warnings.
  if (explicit) {
    return constructProvider(explicit, config);
  }

  // No provider specified — pick the best sovereign-local default for
  // the current environment. Server-side / Node / Bun → Ollama or llama.cpp
  // (sync availability decision deferred to the caller via constructProvider;
  // construction never makes a network call). Browser → WebLLM (if WebGPU).
  // If nothing sovereign is configured, return MockSeedLLM — the test path.

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  if (isBrowser && WebLLMSeedLLM.isAvailable()) {
    return new WebLLMSeedLLM({
      provider: 'webllm',
      model: config.model ?? 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      temperature: config.temperature,
      maxTokens: config.maxTokens,
    });
  }

  // Server-side default: Ollama if reachable env hint is set, else llama.cpp,
  // else mock. We don't make blocking network calls here — callers who
  // want runtime auto-detection should use `selectSovereignProvider()` below.
  if (typeof process !== 'undefined' && process.env?.OLLAMA_HOST) {
    return new OllamaSeedLLM({ provider: 'ollama', model: config.model, baseUrl: process.env.OLLAMA_HOST, temperature: config.temperature, maxTokens: config.maxTokens });
  }
  if (typeof process !== 'undefined' && process.env?.LLAMACPP_URL) {
    return new LlamaCppSeedLLM({ provider: 'llamacpp', model: config.model, baseUrl: process.env.LLAMACPP_URL, temperature: config.temperature, maxTokens: config.maxTokens });
  }

  // No sovereign-local available — quiet mock fallback. Operators may
  // opt into commercial APIs explicitly via config.provider = 'openai' | 'anthropic'.
  return new MockSeedLLM({ provider: 'mock', model: 'mock-v1', ...config });
}

function constructProvider(p: SeedLLMConfig['provider'], config: Partial<SeedLLMConfig>): SeedLLM {
  switch (p) {
    case 'webllm':
      return new WebLLMSeedLLM({ ...config, provider: 'webllm', model: config.model ?? 'Llama-3.2-3B-Instruct-q4f16_1-MLC' });
    case 'ollama':
      return new OllamaSeedLLM({ ...config, provider: 'ollama' });
    case 'llamacpp':
      return new LlamaCppSeedLLM({ ...config, provider: 'llamacpp' });
    case 'openai':
      return new OpenAISeedLLM({ ...config, provider: 'openai', model: config.model ?? 'gpt-4o-mini', apiKey: config.apiKey ?? (typeof process !== 'undefined' ? process.env?.OPENAI_API_KEY : undefined) });
    case 'anthropic':
      return new AnthropicSeedLLM({ ...config, provider: 'anthropic', model: config.model ?? 'claude-3-5-sonnet-20241022', apiKey: config.apiKey ?? (typeof process !== 'undefined' ? process.env?.ANTHROPIC_API_KEY : undefined) });
    case 'mock':
    default:
      return new MockSeedLLM({ ...config, provider: 'mock', model: config.model ?? 'mock-v1' });
  }
}

/**
 * Probe localhost services at runtime and pick the best sovereign-local
 * provider available right now. Use this from server bootstrap or studio
 * UI; do NOT use from hot paths (it makes network calls).
 */
export async function selectSovereignProvider(config: Partial<SeedLLMConfig> = {}): Promise<SeedLLM> {
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser && WebLLMSeedLLM.isAvailable()) {
    return new WebLLMSeedLLM({ provider: 'webllm', ...config });
  }
  if (await OllamaSeedLLM.isAvailable()) {
    return new OllamaSeedLLM({ provider: 'ollama', ...config });
  }
  if (await LlamaCppSeedLLM.isAvailable()) {
    return new LlamaCppSeedLLM({ provider: 'llamacpp', ...config });
  }
  return new MockSeedLLM({ provider: 'mock', model: 'mock-v1', ...config });
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
