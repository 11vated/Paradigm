/**
 * Paradigm Absolute — Local Inference Client
 *
 * Three-tier model routing with graceful degradation.
 * Connects to llama.cpp server (or compatible OpenAI-format API).
 *
 * Tier 0 (KERNEL):   No model needed — pure deterministic kernel ops
 * Tier 1 (FAST):     SmolLM2 1.7B — entity extraction, simple Q&A
 * Tier 2 (STANDARD): Phi-4-mini 3.8B — standard reasoning
 * Tier 3 (DEEP):     Phi-4 14B — multi-step plans, complex generation
 *
 * Falls back to lower tiers automatically. If no model is available,
 * the agent works in pure kernel mode (Tier 0) — identical to the
 * original deterministic agent behavior.
 */

import { InferenceTier } from './types.js';
import type { InferenceRequest, InferenceResponse, InferenceClient } from './types.js';

// ─── RESPONSE CACHE ─────────────────────────────────────────────────────────

interface CacheEntry {
  response: InferenceResponse;
  timestamp: number;
}

class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize: number = 256, ttlMs: number = 300_000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): InferenceResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return { ...entry.response, cached: true };
  }

  set(key: string, response: InferenceResponse): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, { response, timestamp: Date.now() });
  }

  private cacheKey(request: InferenceRequest, tier: InferenceTier): string {
    return `${tier}:${request.prompt}:${request.maxTokens}:${request.temperature}`;
  }

  getForRequest(request: InferenceRequest, tier: InferenceTier): InferenceResponse | null {
    return this.get(this.cacheKey(request, tier));
  }

  setForRequest(request: InferenceRequest, tier: InferenceTier, response: InferenceResponse): void {
    this.set(this.cacheKey(request, tier), response);
  }
}

// ─── LLAMA.CPP CLIENT ───────────────────────────────────────────────────────

interface LlamaServerConfig {
  url: string;
  timeout: number;
}

const TIER_MODELS: Record<InferenceTier, string> = {
  [InferenceTier.KERNEL]: '',
  [InferenceTier.FAST]: 'smollm2-1.7b',
  [InferenceTier.STANDARD]: 'phi-4-mini-3.8b',
  [InferenceTier.DEEP]: 'phi-4-14b',
};

export class LocalInferenceClient implements InferenceClient {
  private config: LlamaServerConfig;
  private cache: ResponseCache;
  private tierAvailability: Map<InferenceTier, boolean> = new Map();
  private lastHealthCheck: number = 0;
  private healthCheckIntervalMs: number = 30_000;

  constructor(serverUrl?: string, timeout: number = 30_000) {
    const envUrl = typeof process !== 'undefined'
      ? (process.env?.LLAMA_SERVER_URL || process.env?.LLM_INFERENCE_URL || '')
      : '';

    this.config = {
      url: serverUrl || envUrl,
      timeout,
    };
    this.cache = new ResponseCache();

    // Kernel tier is always available
    this.tierAvailability.set(InferenceTier.KERNEL, true);
    // Others default to false until health check
    this.tierAvailability.set(InferenceTier.FAST, false);
    this.tierAvailability.set(InferenceTier.STANDARD, false);
    this.tierAvailability.set(InferenceTier.DEEP, false);
  }

  isAvailable(tier: InferenceTier): boolean {
    if (tier === InferenceTier.KERNEL) return true;
    return this.tierAvailability.get(tier) ?? false;
  }

  maxAvailableTier(): InferenceTier {
    if (this.tierAvailability.get(InferenceTier.DEEP)) return InferenceTier.DEEP;
    if (this.tierAvailability.get(InferenceTier.STANDARD)) return InferenceTier.STANDARD;
    if (this.tierAvailability.get(InferenceTier.FAST)) return InferenceTier.FAST;
    return InferenceTier.KERNEL;
  }

  async generate(request: InferenceRequest, preferredTier: InferenceTier): Promise<InferenceResponse> {
    // Tier 0: no model needed
    if (preferredTier === InferenceTier.KERNEL) {
      return {
        text: '',
        tokensUsed: 0,
        model: 'kernel',
        tier: InferenceTier.KERNEL,
        latencyMs: 0,
        cached: false,
      };
    }

    // Check cache first
    const cached = this.cache.getForRequest(request, preferredTier);
    if (cached) return cached;

    // Refresh health if stale
    if (Date.now() - this.lastHealthCheck > this.healthCheckIntervalMs) {
      await this.health().catch(() => {});
    }

    // Find best available tier (fall back to lower)
    let tier = preferredTier;
    while (tier > InferenceTier.KERNEL && !this.isAvailable(tier)) {
      tier--;
    }

    // If no model available, return empty (kernel-only mode)
    if (tier === InferenceTier.KERNEL) {
      return {
        text: '',
        tokensUsed: 0,
        model: 'kernel',
        tier: InferenceTier.KERNEL,
        latencyMs: 0,
        cached: false,
      };
    }

    const start = Date.now();

    try {
      const response = await this.callLlamaServer(request, tier);
      this.cache.setForRequest(request, tier, response);
      return response;
    } catch (error) {
      // Mark tier as unavailable and retry at lower tier
      this.tierAvailability.set(tier, false);

      if (tier > InferenceTier.FAST) {
        return this.generate(request, tier - 1);
      }

      // All models failed — return empty (kernel-only)
      return {
        text: '',
        tokensUsed: 0,
        model: 'kernel',
        tier: InferenceTier.KERNEL,
        latencyMs: Date.now() - start,
        cached: false,
      };
    }
  }

  async health(): Promise<{ available: boolean; tiers: Record<InferenceTier, boolean> }> {
    this.lastHealthCheck = Date.now();

    if (!this.config.url) {
      return {
        available: false,
        tiers: {
          [InferenceTier.KERNEL]: true,
          [InferenceTier.FAST]: false,
          [InferenceTier.STANDARD]: false,
          [InferenceTier.DEEP]: false,
        },
      };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${this.config.url}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();

        // llama.cpp /health returns { status: "ok" } or model info
        // If server is up, at least FAST tier is available
        this.tierAvailability.set(InferenceTier.FAST, true);

        // Check if specific models are loaded
        if (data.models && Array.isArray(data.models)) {
          for (const model of data.models) {
            const name = (model.id || model.model || '').toLowerCase();
            if (name.includes('14b') || name.includes('phi-4-14') || name.includes('deep')) {
              this.tierAvailability.set(InferenceTier.DEEP, true);
            }
            if (name.includes('3.8b') || name.includes('phi-4-mini') || name.includes('standard')) {
              this.tierAvailability.set(InferenceTier.STANDARD, true);
            }
            if (name.includes('1.7b') || name.includes('smol') || name.includes('fast')) {
              this.tierAvailability.set(InferenceTier.FAST, true);
            }
          }
        } else {
          // Single-model server: mark as STANDARD (most common setup)
          this.tierAvailability.set(InferenceTier.STANDARD, true);
        }
      }
    } catch {
      // Server unreachable — all model tiers unavailable
      this.tierAvailability.set(InferenceTier.FAST, false);
      this.tierAvailability.set(InferenceTier.STANDARD, false);
      this.tierAvailability.set(InferenceTier.DEEP, false);
    }

    const tiers = {
      [InferenceTier.KERNEL]: true,
      [InferenceTier.FAST]: this.tierAvailability.get(InferenceTier.FAST) ?? false,
      [InferenceTier.STANDARD]: this.tierAvailability.get(InferenceTier.STANDARD) ?? false,
      [InferenceTier.DEEP]: this.tierAvailability.get(InferenceTier.DEEP) ?? false,
    };

    return {
      available: tiers[InferenceTier.FAST] || tiers[InferenceTier.STANDARD] || tiers[InferenceTier.DEEP],
      tiers,
    };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async callLlamaServer(request: InferenceRequest, tier: InferenceTier): Promise<InferenceResponse> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      // Use OpenAI-compatible /v1/chat/completions format (llama.cpp supports this)
      const messages: { role: string; content: string }[] = [];

      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }
      messages.push({ role: 'user', content: request.prompt });

      const body: any = {
        messages,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        stream: false,
      };

      if (request.stopSequences?.length) {
        body.stop = request.stopSequences;
      }

      if (request.jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const res = await fetch(`${this.config.url}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        // Try fallback to /generate (older llama.cpp or custom server)
        return this.callGenerateEndpoint(request, tier, start);
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      const tokensUsed = data.usage?.total_tokens ?? 0;

      return {
        text,
        tokensUsed,
        model: TIER_MODELS[tier] || 'unknown',
        tier,
        latencyMs: Date.now() - start,
        cached: false,
      };
    } catch (error) {
      clearTimeout(timeout);
      // Try fallback endpoint before giving up
      return this.callGenerateEndpoint(request, tier, start);
    }
  }

  private async callGenerateEndpoint(request: InferenceRequest, tier: InferenceTier, start: number): Promise<InferenceResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const prompt = request.systemPrompt
        ? `${request.systemPrompt}\n\nUser: ${request.prompt}\nAssistant:`
        : request.prompt;

      const res = await fetch(`${this.config.url}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          max_tokens: request.maxTokens,
          temperature: request.temperature,
          stop: request.stopSequences,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const text = data.response ?? data.content ?? data.text ?? '';

      return {
        text,
        tokensUsed: data.tokens_used ?? 0,
        model: TIER_MODELS[tier] || 'unknown',
        tier,
        latencyMs: Date.now() - start,
        cached: false,
      };
    } catch {
      clearTimeout(timeout);
      throw new Error(`Inference failed at tier ${tier}`);
    }
  }
}

// ─── SINGLETON ──────────────────────────────────────────────────────────────

let _client: LocalInferenceClient | null = null;

export function getInferenceClient(): LocalInferenceClient {
  if (!_client) {
    _client = new LocalInferenceClient();
  }
  return _client;
}
