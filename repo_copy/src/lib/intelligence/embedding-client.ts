/**
 * SBERT embedding client (Phase 1.4 / Appendix D D-5).
 *
 * Replaces the Gemini embedding path in IntelligenceLayer with a call to the
 * self-hosted SBERT sidecar. Rationale: embeddings are in the critical path
 * for seed creation + similarity search, and we don't want a vendor outage
 * (or quota) to break the core product. The sidecar speaks a dead-simple
 * JSON contract: POST /embed { text: string | string[] } → { vectors, dim }.
 *
 * Vectors come back L2-normalized, so cosine similarity = dot product, and
 * pgvector's `<=>` (cosine distance) returns `1 - dot` as expected.
 *
 * The client is deliberately small — no retries, no pools. The HTTP stack
 * below (undici via node:fetch) already does keep-alive and connection
 * reuse. Retries belong at the caller layer so the caller can decide
 * whether a miss is fatal or fallback-able.
 */

export interface EmbedOptions {
  /** Max ms to wait before aborting. Default 10s — SBERT warm inference is <100ms. */
  timeoutMs?: number;
  /** Override SBERT_URL for tests. */
  sbertUrl?: string;
}

export interface EmbedResponse {
  vectors: number[][];
  dim: number;
  model: string;
}

export class EmbeddingClientError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'EmbeddingClientError';
  }
}

function resolveUrl(override?: string): string {
  const url = override ?? process.env.SBERT_URL;
  if (!url) {
    throw new EmbeddingClientError(
      'SBERT_URL is not set — cannot embed. Set SBERT_URL or pass sbertUrl option.',
    );
  }
  return url.replace(/\/$/, '');
}

/**
 * Low-level call. Prefer `embedText` / `embedBatch` at call sites.
 */
async function postEmbed(
  body: { text: string | string[] },
  opts: EmbedOptions,
): Promise<EmbedResponse> {
  const url = resolveUrl(opts.sbertUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 10_000);
  try {
    const res = await fetch(`${url}/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Surface the sidecar's detail payload if present. SBERT returns
      // 400 for empty/oversized batches; keeping the message propagates
      // that signal up to the caller.
      const text = await res.text().catch(() => '');
      throw new EmbeddingClientError(
        `sbert /embed returned ${res.status}: ${text}`,
        undefined,
        res.status,
      );
    }
    const parsed = (await res.json()) as EmbedResponse;
    if (!parsed || !Array.isArray(parsed.vectors)) {
      throw new EmbeddingClientError('sbert /embed returned malformed payload');
    }
    return parsed;
  } catch (err: any) {
    if (err instanceof EmbeddingClientError) throw err;
    if (err?.name === 'AbortError') {
      throw new EmbeddingClientError(
        `sbert /embed timed out after ${opts.timeoutMs ?? 10_000}ms`,
        err,
      );
    }
    throw new EmbeddingClientError(`sbert /embed failed: ${err?.message ?? err}`, err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Embed a single text into a single 384-dim (default MiniLM) vector.
 */
export async function embedText(
  text: string,
  opts: EmbedOptions = {},
): Promise<number[]> {
  if (typeof text !== 'string' || text.length === 0) {
    throw new EmbeddingClientError('embedText: text must be a non-empty string');
  }
  const { vectors } = await postEmbed({ text }, opts);
  if (vectors.length !== 1) {
    throw new EmbeddingClientError(`embedText: expected 1 vector, got ${vectors.length}`);
  }
  return vectors[0];
}

/**
 * Embed a batch of texts. Preserves order (vectors[i] corresponds to texts[i]).
 * The sidecar enforces its own MAX_BATCH; callers with larger batches should
 * chunk themselves.
 */
export async function embedBatch(
  texts: string[],
  opts: EmbedOptions = {},
): Promise<number[][]> {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new EmbeddingClientError('embedBatch: texts must be a non-empty array');
  }
  const { vectors } = await postEmbed({ text: texts }, opts);
  if (vectors.length !== texts.length) {
    throw new EmbeddingClientError(
      `embedBatch: expected ${texts.length} vectors, got ${vectors.length}`,
    );
  }
  return vectors;
}

/**
 * Deterministic textual rendering of a seed for embedding input. Kept
 * separate from `embedText` so the render can be tested in isolation and
 * reused for hashing/caching keys. IMPORTANT: any change here invalidates
 * cached embeddings — bump `embed_version` in pgvector when doing so.
 */
export function renderSeedForEmbedding(seed: {
  $domain?: string;
  $name?: string;
  $lineage?: { generation?: number };
  genes?: Record<string, { type?: string; value?: unknown }>;
}): string {
  const lines: string[] = [];
  lines.push(`Domain: ${seed.$domain ?? 'unknown'}`);
  lines.push(`Name: ${seed.$name ?? 'Untitled'}`);
  lines.push(`Generation: ${seed.$lineage?.generation ?? 0}`);
  const genes = seed.genes ?? {};
  const sortedKeys = Object.keys(genes).sort();
  // Deterministic key ordering matters: if we render { a, b } sometimes and
  // { b, a } other times, we get different embeddings for the same seed.
  const geneStr = sortedKeys
    .map((k) => {
      const g = genes[k];
      return `${k} (${g?.type ?? 'unknown'}): ${JSON.stringify(g?.value ?? null)}`;
    })
    .join(', ');
  lines.push(`Genes: ${geneStr}`);
  return lines.join('\n');
}

/**
 * Embed a full seed object. Thin convenience over renderSeedForEmbedding +
 * embedText. Returned vector is L2-normalized (SBERT contract).
 */
export async function embedSeed(
  seed: Parameters<typeof renderSeedForEmbedding>[0],
  opts: EmbedOptions = {},
): Promise<number[]> {
  return embedText(renderSeedForEmbedding(seed), opts);
}
