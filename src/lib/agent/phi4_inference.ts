/**
 * Phase 8 — Real Phi-4 inference client.
 *
 * A Phi-4-first `InferenceClient` implementation that speaks the
 * OpenAI-compatible chat/completions protocol supported by:
 *   - llama.cpp's llama-server
 *   - Ollama's /v1/chat/completions
 *   - LM Studio local server
 *   - Any OpenAI-compatible endpoint (vLLM, TGI, etc.)
 *
 * Unlike the existing `LocalInferenceClient`, this client:
 *   - Has **no Gemini fallback**. The user explicitly doesn't want the
 *     agent to be a Gemini wrapper. If no local tier is available, we
 *     degrade to KERNEL (tier 0) rather than silently phoning home.
 *   - Uses **content-hashed cache keys** (SHA-256 of the full request),
 *     avoiding the hash-collision risk of concatenating a truncated prompt.
 *   - Accepts a **configurable per-tier model registry** so users pointing
 *     FAST at Phi-3.5-mini or DEEP at a local Qwen don't have to fork.
 *   - Treats **tier routing** as explicit policy: if the preferred tier is
 *     unavailable and `strictTier: true`, we fail rather than silently
 *     downgrade — useful when callers want a gas-price style guarantee.
 *   - Surfaces **real telemetry** (latency, tokensUsed, actual model id)
 *     so the swarm can log it and make cost decisions upstream.
 *
 * Appendix D-6 choice: Phi-4 family for all non-KERNEL tiers. The tier-to-
 * model mapping defaults are:
 *   - FAST:     phi-3.5-mini-instruct (lightest Phi available on most rigs)
 *   - STANDARD: phi-4-mini-instruct
 *   - DEEP:     phi-4 (14B)
 * Users can override via PARADIGM_TIER_* env vars or the constructor.
 */

import crypto from 'crypto';
import { InferenceTier } from './types.js';
import type { InferenceRequest, InferenceResponse, InferenceClient } from './types.js';

// ─── Config ─────────────────────────────────────────────────────────────────

export interface Phi4ClientOptions {
  /**
   * Base URL of the OpenAI-compatible endpoint. Falls through env vars then
   * `http://localhost:8080` (llama.cpp default).
   */
  baseUrl?: string;
  /**
   * Optional bearer token for hosted endpoints (Together, Fireworks, etc).
   */
  apiKey?: string;
  /**
   * Per-tier model id override. Unset tiers use the defaults.
   */
  tierModels?: Partial<Record<InferenceTier, string>>;
  /**
   * Per-request timeout in ms. Separate from health check timeout.
   */
  requestTimeoutMs?: number;
  /**
   * Max age of a cached health check before we re-probe.
   */
  healthCacheMs?: number;
  /**
   * Cache size (entries) for identical-request dedup.
   */
  cacheSize?: number;
  /**
   * TTL for cached inference responses.
   */
  cacheTtlMs?: number;
  /**
   * If true, tier downgrades are disabled — requesting a tier that isn't
   * available throws instead of silently degrading. Default false.
   */
  strictTier?: boolean;
  /**
   * Injected fetch — lets tests substitute a fake server without spinning
   * up a real HTTP listener. Defaults to global fetch.
   */
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIER_MODELS: Record<InferenceTier, string> = {
  [InferenceTier.KERNEL]: '',
  [InferenceTier.FAST]: 'phi-3.5-mini-instruct',
  [InferenceTier.STANDARD]: 'phi-4-mini-instruct',
  [InferenceTier.DEEP]: 'phi-4',
};

function envTierModelOverride(tier: InferenceTier): string | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  const key =
    tier === InferenceTier.FAST
      ? 'PARADIGM_TIER_FAST_MODEL'
      : tier === InferenceTier.STANDARD
        ? 'PARADIGM_TIER_STANDARD_MODEL'
        : tier === InferenceTier.DEEP
          ? 'PARADIGM_TIER_DEEP_MODEL'
          : null;
  return key ? process.env[key] : undefined;
}

// ─── Cache ──────────────────────────────────────────────────────────────────

interface CacheEntry {
  response: InferenceResponse;
  expiresAt: number;
}

class ContentHashCache {
  private map = new Map<string, CacheEntry>();
  constructor(
    private readonly maxSize: number,
    private readonly ttlMs: number,
  ) {}

  static key(req: InferenceRequest, tier: InferenceTier): string {
    // Full-content hash: the old `tier:prompt:maxTokens:temp` scheme collided
    // on long prompts truncated at the same prefix. SHA-256 is overkill for
    // a cache key but it's fast enough and eliminates false hits.
    const h = crypto.createHash('sha256');
    h.update(String(tier));
    h.update('\x00');
    h.update(req.prompt);
    h.update('\x00');
    h.update(req.systemPrompt ?? '');
    h.update('\x00');
    h.update(String(req.maxTokens));
    h.update('\x00');
    h.update(String(req.temperature));
    h.update('\x00');
    h.update((req.stopSequences ?? []).join('|'));
    h.update('\x00');
    h.update(req.jsonMode ? '1' : '0');
    return h.digest('hex');
  }

  get(key: string): InferenceResponse | null {
    const entry = this.map.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }
    // Refresh LRU position
    this.map.delete(key);
    this.map.set(key, entry);
    return { ...entry.response, cached: true };
  }

  set(key: string, response: InferenceResponse): void {
    if (this.map.size >= this.maxSize) {
      // Evict oldest (first) entry.
      const first = this.map.keys().next().value;
      if (first !== undefined) this.map.delete(first);
    }
    this.map.set(key, { response, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

// ─── Server discovery ──────────────────────────────────────────────────────

/**
 * Which inference servers are loaded + what tier they satisfy. Populated by
 * `health()`. Cached for `healthCacheMs` to avoid spamming the server.
 */
interface ServerState {
  reachable: boolean;
  modelsById: Set<string>;
  lastProbedAt: number;
}

// ─── Client ─────────────────────────────────────────────────────────────────

export class Phi4InferenceClient implements InferenceClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly tierModels: Record<InferenceTier, string>;
  private readonly requestTimeoutMs: number;
  private readonly healthCacheMs: number;
  private readonly strictTier: boolean;
  private readonly fetchImpl: typeof fetch;
  private readonly cache: ContentHashCache;
  private server: ServerState = { reachable: false, modelsById: new Set(), lastProbedAt: 0 };

  constructor(opts: Phi4ClientOptions = {}) {
    this.baseUrl = (
      opts.baseUrl ??
      process.env?.PARADIGM_INFERENCE_URL ??
      process.env?.LLAMA_SERVER_URL ??
      'http://localhost:8080'
    ).replace(/\/+$/, '');
    this.apiKey = opts.apiKey ?? process.env?.PARADIGM_INFERENCE_API_KEY;
    this.tierModels = {
      [InferenceTier.KERNEL]: '',
      [InferenceTier.FAST]:
        opts.tierModels?.[InferenceTier.FAST] ??
        envTierModelOverride(InferenceTier.FAST) ??
        DEFAULT_TIER_MODELS[InferenceTier.FAST],
      [InferenceTier.STANDARD]:
        opts.tierModels?.[InferenceTier.STANDARD] ??
        envTierModelOverride(InferenceTier.STANDARD) ??
        DEFAULT_TIER_MODELS[InferenceTier.STANDARD],
      [InferenceTier.DEEP]:
        opts.tierModels?.[InferenceTier.DEEP] ??
        envTierModelOverride(InferenceTier.DEEP) ??
        DEFAULT_TIER_MODELS[InferenceTier.DEEP],
    };
    this.requestTimeoutMs = opts.requestTimeoutMs ?? 45_000;
    this.healthCacheMs = opts.healthCacheMs ?? 30_000;
    this.strictTier = opts.strictTier ?? false;
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.cache = new ContentHashCache(opts.cacheSize ?? 256, opts.cacheTtlMs ?? 300_000);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  isAvailable(tier: InferenceTier): boolean {
    if (tier === InferenceTier.KERNEL) return true;
    if (!this.server.reachable) return false;
    const model = this.tierModels[tier];
    if (!model) return false;
    // Case-insensitive match — llama.cpp model ids sometimes use mixed case.
    const lowered = model.toLowerCase();
    for (const loaded of this.server.modelsById) {
      if (loaded.toLowerCase().includes(lowered) || lowered.includes(loaded.toLowerCase())) return true;
    }
    return false;
  }

  maxAvailableTier(): InferenceTier {
    if (this.isAvailable(InferenceTier.DEEP)) return InferenceTier.DEEP;
    if (this.isAvailable(InferenceTier.STANDARD)) return InferenceTier.STANDARD;
    if (this.isAvailable(InferenceTier.FAST)) return InferenceTier.FAST;
    return InferenceTier.KERNEL;
  }

  async generate(request: InferenceRequest, preferredTier: InferenceTier): Promise<InferenceResponse> {
    if (preferredTier === InferenceTier.KERNEL) return this.kernelResponse();

    // Ensure health state is fresh.
    if (Date.now() - this.server.lastProbedAt > this.healthCacheMs) {
      await this.health().catch(() => {});
    }

    // Pick the actual tier we'll serve. If strict and unavailable, fail loud.
    let tier = preferredTier;
    if (!this.isAvailable(tier)) {
      if (this.strictTier) {
        throw new Error(`Tier ${preferredTier} unavailable and strictTier=true (no silent downgrade)`);
      }
      while (tier > InferenceTier.KERNEL && !this.isAvailable(tier)) tier--;
    }
    if (tier === InferenceTier.KERNEL) return this.kernelResponse();

    const cacheKey = ContentHashCache.key(request, tier);
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const start = Date.now();
    try {
      const response = await this.callChatCompletions(request, tier, start);
      this.cache.set(cacheKey, response);
      return response;
    } catch (err) {
      // Try one tier below — same pattern as LocalInferenceClient, but we
      // never reach outside the local/configured endpoint.
      if (tier > InferenceTier.FAST && !this.strictTier) {
        return this.generate(request, (tier - 1) as InferenceTier);
      }
      // Terminal failure: return a kernel-tier empty so the caller can
      // detect no-model by `response.tier === KERNEL`.
      return {
        text: '',
        tokensUsed: 0,
        model: 'kernel-fallback',
        tier: InferenceTier.KERNEL,
        latencyMs: Date.now() - start,
        cached: false,
      };
    }
  }

  async health(): Promise<{ available: boolean; tiers: Record<InferenceTier, boolean> }> {
    this.server.lastProbedAt = Date.now();
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5_000);
      const res = await this.fetchImpl(`${this.baseUrl}/v1/models`, {
        method: 'GET',
        headers: this.buildHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        this.server = { reachable: false, modelsById: new Set(), lastProbedAt: Date.now() };
      } else {
        const data: any = await res.json().catch(() => ({}));
        const ids = new Set<string>();
        // OpenAI-style: { data: [{ id: string, ... }, ...] }
        if (Array.isArray(data?.data)) {
          for (const m of data.data) if (m?.id) ids.add(String(m.id));
        }
        // llama.cpp /health-style fallback
        if (Array.isArray(data?.models)) {
          for (const m of data.models) {
            if (m?.id) ids.add(String(m.id));
            if (m?.name) ids.add(String(m.name));
          }
        }
        this.server = { reachable: true, modelsById: ids, lastProbedAt: Date.now() };
      }
    } catch {
      this.server = { reachable: false, modelsById: new Set(), lastProbedAt: Date.now() };
    }

    return {
      available: this.maxAvailableTier() > InferenceTier.KERNEL,
      tiers: {
        [InferenceTier.KERNEL]: true,
        [InferenceTier.FAST]: this.isAvailable(InferenceTier.FAST),
        [InferenceTier.STANDARD]: this.isAvailable(InferenceTier.STANDARD),
        [InferenceTier.DEEP]: this.isAvailable(InferenceTier.DEEP),
      },
    };
  }

  /** Expose loaded model list for diagnostics/testing. */
  loadedModels(): string[] {
    return Array.from(this.server.modelsById);
  }

  /** Expose configured tier→model map for diagnostics/testing. */
  configuredModel(tier: InferenceTier): string {
    return this.tierModels[tier];
  }

  /** Clear the response cache. Useful between test runs. */
  clearCache(): void {
    this.cache.clear();
  }

  /** Number of cached responses currently held. */
  cacheSize(): number {
    return this.cache.size;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return headers;
  }

  private kernelResponse(): InferenceResponse {
    return {
      text: '',
      tokensUsed: 0,
      model: 'kernel',
      tier: InferenceTier.KERNEL,
      latencyMs: 0,
      cached: false,
    };
  }

  private async callChatCompletions(
    request: InferenceRequest,
    tier: InferenceTier,
    start: number,
  ): Promise<InferenceResponse> {
    const model = this.tierModels[tier];
    if (!model) throw new Error(`No model configured for tier ${tier}`);

    const messages: { role: string; content: string }[] = [];
    if (request.systemPrompt) messages.push({ role: 'system', content: request.systemPrompt });
    messages.push({ role: 'user', content: request.prompt });

    const body: any = {
      model,
      messages,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: false,
    };
    if (request.stopSequences?.length) body.stop = request.stopSequences;
    if (request.jsonMode) body.response_format = { type: 'json_object' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      const res = await this.fetchImpl(`${this.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        throw new Error(`Inference HTTP ${res.status}: ${errBody.slice(0, 200)}`);
      }
      const data: any = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      const tokensUsed =
        data?.usage?.total_tokens ??
        (data?.usage?.prompt_tokens ?? 0) + (data?.usage?.completion_tokens ?? 0);
      const actualModel = data?.model ?? model;
      return {
        text,
        tokensUsed,
        model: actualModel,
        tier,
        latencyMs: Date.now() - start,
        cached: false,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

// ─── Singleton + factory ────────────────────────────────────────────────────

let _phi4Client: Phi4InferenceClient | null = null;

/**
 * Shared client for convenience callers. Tests should pass explicit options
 * to the constructor instead of using this singleton to keep state scoped.
 */
export function getPhi4Client(): Phi4InferenceClient {
  if (!_phi4Client) _phi4Client = new Phi4InferenceClient();
  return _phi4Client;
}

/** For tests: drop the singleton so the next `getPhi4Client()` re-reads env. */
export function resetPhi4Client(): void {
  _phi4Client = null;
}
