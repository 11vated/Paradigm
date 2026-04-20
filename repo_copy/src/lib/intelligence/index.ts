/**
 * Phase 10 — IntelligenceLayer (deterministic, kernel-backed).
 *
 * Replaces the prior implementation, which routed every embedding,
 * generation, mutation, and breeding call through @google/genai (Gemini).
 * That violated the project's locked architectural decisions:
 *   - Appendix D-3: SBERT + pgvector for embeddings, day one (no vendor)
 *   - Appendix D-7: Phi-4 for generative inference (no Gemini fallback)
 *   - Determinism axiom: same seed in → same result out, every time
 *
 * The class facade is preserved so existing call sites in `server.ts` and
 * `src/lib/agent/rag.ts` keep working without churn. Internally:
 *
 *   generateEmbedding(seed)       → embedSeed() against SBERT sidecar,
 *                                    falling back to a deterministic
 *                                    pseudo-embedding if SBERT_URL is unset
 *                                    or the sidecar is unreachable.
 *   generateTextEmbedding(text)   → embedText() with the same fallback.
 *   cosineSimilarity(a, b)        → pure math (was already pure here).
 *   findSimilarSeeds(target, all) → pure math, no Gemini.
 *   generateSeed/Mutate/Breed     → REMOVED. The kernel's gene_system
 *                                    + composition engine are the source
 *                                    of truth for these. If a future
 *                                    feature wants LLM-assisted gene
 *                                    proposal, route it through the
 *                                    Phi-4 InferenceClient (Phase 8),
 *                                    not Gemini.
 *
 * The pseudo-embedding fallback is intentionally L2-normalized and
 * deterministic so that:
 *   - cosine similarity stays well-defined,
 *   - dev/test environments without SBERT still produce repeatable
 *     similarity rankings,
 *   - the SBERT-vs-fallback boundary is observable via `lastSource`.
 */

import { embedSeed, embedText, EmbeddingClientError } from './embedding-client.js';

// 384 matches MiniLM (the SBERT sidecar default). If we ever switch the
// sidecar to a 768-dim model the fallback width should be re-pinned to
// avoid mixing widths in the same pgvector table.
const FALLBACK_DIM = 384;

type EmbeddingSource = 'sbert' | 'fallback' | 'unknown';

export class IntelligenceLayer {
  /** Source of the most recent embedding call — useful for tests/observability. */
  static lastSource: EmbeddingSource = 'unknown';

  /**
   * Embed a full seed. Real SBERT first, deterministic pseudo-embedding
   * second. Never throws — embeddings are non-critical and a missing
   * sidecar must not break seed creation.
   */
  static async generateEmbedding(seed: any): Promise<number[]> {
    if (process.env.SBERT_URL) {
      try {
        const vec = await embedSeed(seed);
        IntelligenceLayer.lastSource = 'sbert';
        return vec;
      } catch (err) {
        // Surface the reason at debug level but don't propagate.
        // Tests that need to assert the failure path inject SBERT_URL
        // themselves.
        if (err instanceof EmbeddingClientError) {
          // Expected when the sidecar is offline / 5xx.
        }
      }
    }
    IntelligenceLayer.lastSource = 'fallback';
    return IntelligenceLayer._pseudoEmbed(seed.$hash || seed.id || JSON.stringify(seed.genes ?? {}));
  }

  /**
   * Embed an arbitrary text string. Same SBERT-first-then-fallback policy.
   */
  static async generateTextEmbedding(text: string): Promise<number[]> {
    if (typeof text !== 'string' || text.length === 0) {
      // Don't crash callers; return a zero-information vector.
      IntelligenceLayer.lastSource = 'fallback';
      return IntelligenceLayer._pseudoEmbed('');
    }
    if (process.env.SBERT_URL) {
      try {
        const vec = await embedText(text);
        IntelligenceLayer.lastSource = 'sbert';
        return vec;
      } catch {
        // Fall through.
      }
    }
    IntelligenceLayer.lastSource = 'fallback';
    return IntelligenceLayer._pseudoEmbed(text);
  }

  /**
   * Cosine similarity. Pure math; preserved verbatim from the prior impl
   * because callers already depend on its zero-on-degenerate-input
   * behavior.
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Top-K nearest seeds by stored `$embedding`. Excludes the target seed.
   * Returns each result with `_similarityScore` attached (UI consumes this).
   */
  static findSimilarSeeds(targetSeed: any, allSeeds: any[], k: number = 5): any[] {
    if (!targetSeed?.$embedding || !Array.isArray(allSeeds)) return [];
    const scored = allSeeds
      .filter((s) => s && s.id !== targetSeed.id && Array.isArray(s.$embedding))
      .map((s) => ({
        seed: s,
        similarity: IntelligenceLayer.cosineSimilarity(targetSeed.$embedding, s.$embedding),
      }));
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, k).map((s) => ({ ...s.seed, _similarityScore: s.similarity }));
  }

  /**
   * Deterministic fallback embedding. L2-normalized, fixed width. Same
   * input string → same vector across processes. Used when SBERT is
   * unreachable so similarity rankings still make sense in dev/test.
   *
   * Note: this is *not* semantically meaningful — two semantically
   * similar texts will have unrelated pseudo-embeddings. It exists only
   * to keep the math defined and reproducible. Production deployments
   * must run SBERT.
   */
  private static _pseudoEmbed(input: string): number[] {
    const dim = FALLBACK_DIM;
    const vec = new Array(dim).fill(0);
    let s = 0;
    for (let i = 0; i < input.length; i++) {
      // Same hash kernel as the prior impl so existing pseudo-embeddings
      // stay byte-identical post-refactor.
      s = (s * 31 + input.charCodeAt(i)) % 1000000007;
    }
    let cur = s;
    for (let i = 0; i < dim; i++) {
      cur = (cur * 1103515245 + 12345) % 2147483648;
      vec[i] = (cur / 2147483648) * 2 - 1;
    }
    let norm = 0;
    for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < dim; i++) vec[i] /= norm;
    return vec;
  }
}
