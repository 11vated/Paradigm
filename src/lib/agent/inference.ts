/**
 * Paradigm Absolute — Local Inference Client (Phase 11).
 *
 * Three-tier model routing with graceful degradation. Talks to a local
 * llama.cpp / Ollama / LM Studio server over the OpenAI-compatible
 * /v1/chat/completions protocol.
 *
 *   Tier 0 (KERNEL):   No model needed — deterministic kernel ops only
 *   Tier 1 (FAST):     Phi-3.5-mini (or compatible) — entity extraction
 *   Tier 2 (STANDARD): Phi-4-mini — standard reasoning
 *   Tier 3 (DEEP):     Phi-4 — multi-step plans, complex generation
 *
 * Phase 11 change: the prior implementation called out to Gemini (via
 * @google/genai) whenever the local server was unreachable. This violated
 * the user's documented frustration with "Gemini wrapping itself as the
 * GSPL agent" and the locked Appendix D-7 decision (Phi-4 tiers, no
 * vendor fallback). The Gemini path is removed entirely. When the local
 * server is unavailable, we degrade to KERNEL — the deterministic
 * baseline — instead of silently shipping prompts to a third party.
 *
 * The new `Phi4InferenceClient` (Phase 8) is the implementation behind
 * `LocalInferenceClient`. We keep `LocalInferenceClient` as a re-export
 * alias so existing call sites in `agent/index.ts` and `agent/reasoning.ts`
 * continue to work without churn. Both names point at the same singleton.
 */

import { Phi4InferenceClient, getPhi4Client, resetPhi4Client } from './phi4_inference.js';

// Public API: keep the old name pointing at the new implementation. Every
// method on Phi4InferenceClient satisfies the InferenceClient interface,
// so callers that typed against `LocalInferenceClient` keep compiling.
export { Phi4InferenceClient as LocalInferenceClient };

export function getInferenceClient(): Phi4InferenceClient {
  return getPhi4Client();
}

export function resetInferenceClient(): void {
  resetPhi4Client();
}
