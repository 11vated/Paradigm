/**
 * Canon Memory — RAG over the user's seed library.
 *
 * Stores every seed the user creates as a memory entry with an
 * embedded summary text. Supports semantic recall:
 *
 *   - "characters like Aria"             → cosine-search over canon
 *   - "melancholy ocean vibes"           → embed query, return top-K
 *   - "what music did I make for Aria?"  → filter by linked-seed + topic
 *
 * Wraps an existing MemoryLayer (typically a SemanticMemory file or
 * the future EpisodicMemory encrypted store) plus an Embedder. Both
 * are pluggable for sovereignty (swap embedder, swap store).
 */

import { kernelNow } from '../../kernel/clock';
import type { Seed } from '../../kernel/engines';
import type { Embedder, MemoryEntry, MemoryLayer } from './types';

export interface CanonMemoryOptions {
  /** Backing MemoryLayer where canon entries are persisted. */
  store: MemoryLayer;
  /** Embedder used to vectorize seeds + queries. */
  embedder: Embedder;
  /** Topic tag for canon entries (default 'canon:seed'). */
  topic?: string;
  /** Source tag for canon entries (default 'canon'). */
  source?: string;
}

export interface CanonRecallOptions {
  /** Max results returned. Default 8. */
  limit?: number;
  /** Filter by linked-seed hash. */
  linkedTo?: string;
  /** Hard cutoff on cosine similarity (0-1). Default 0.25. */
  minSimilarity?: number;
}

export interface CanonHit {
  readonly seedHash: string;
  readonly name: string;
  readonly domain: string;
  readonly summary: string;
  readonly score: number;
  readonly entry: MemoryEntry;
}

/** Summarize a seed into a short text string suitable for embedding. */
export function summarizeSeed(seed: Seed): string {
  const parts: string[] = [];
  if (seed.$name) parts.push(seed.$name);
  if (seed.$domain) parts.push(`domain:${seed.$domain}`);
  if (seed.phrase) parts.push(`phrase:${seed.phrase}`);
  // Pull adjective-like flat genes
  const genes = (seed.genes ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(genes)) {
    if (typeof v === 'string' && v.length < 40) parts.push(`${k}:${v}`);
    else if (typeof v === 'number') parts.push(`${k}:${v.toFixed(2)}`);
    else if (Array.isArray(v) && v.every((x) => typeof x === 'string') && v.length < 8) {
      parts.push(`${k}:${(v as string[]).join(',')}`);
    }
  }
  return parts.join(' ');
}

export class CanonMemory {
  readonly store: MemoryLayer;
  readonly embedder: Embedder;
  readonly topic: string;
  readonly source: string;

  constructor(opts: CanonMemoryOptions) {
    this.store = opts.store;
    this.embedder = opts.embedder;
    this.topic = opts.topic ?? 'canon:seed';
    this.source = opts.source ?? 'canon';
  }

  /** Embed and persist a seed into the canon. Returns the entry id. */
  async ingest(seed: Seed, extra?: { linkedTo?: string; tags?: string[] }): Promise<string> {
    const hash = seed.$hash ?? `unhashed:${seed.$name ?? 'unnamed'}`;
    const summary = summarizeSeed(seed);
    const embedding = await this.embedder.embed(summary);
    const entry: MemoryEntry = {
      key: `canon:${hash}`,
      topic: this.topic,
      source: this.source,
      createdAt: kernelNow(),
      updatedAt: kernelNow(),
      value: {
        seedHash: hash,
        name: seed.$name ?? '',
        domain: seed.$domain ?? '',
        summary,
        linkedTo: extra?.linkedTo,
        tags: extra?.tags ?? [],
      },
      embedding,
    };
    await this.store.put(entry);
    return entry.key;
  }

  /** Embed several seeds in one batch. Returns ids in input order. */
  async ingestBatch(seeds: Seed[]): Promise<string[]> {
    const summaries = seeds.map(summarizeSeed);
    const vectors = await this.embedder.embedBatch(summaries);
    const ids: string[] = [];
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      const hash = seed.$hash ?? `unhashed:${seed.$name ?? i}`;
      const entry: MemoryEntry = {
        key: `canon:${hash}`,
        topic: this.topic,
        source: this.source,
        createdAt: kernelNow(),
      updatedAt: kernelNow(),
        value: {
          seedHash: hash,
          name: seed.$name ?? '',
          domain: seed.$domain ?? '',
          summary: summaries[i],
        },
        embedding: vectors[i],
      };
      await this.store.put(entry);
      ids.push(entry.key);
    }
    return ids;
  }

  /** Semantic recall: embed the query and rank canon entries by cosine. */
  async recall(query: string, opts: CanonRecallOptions = {}): Promise<CanonHit[]> {
    const limit = opts.limit ?? 8;
    const minSim = opts.minSimilarity ?? 0.25;
    const qVec = await this.embedder.embed(query);
    const results = await this.store.query({
      topic: this.topic,
      embedding: qVec,
      limit: limit * 3, // overshoot then filter
    });
    const hits: CanonHit[] = [];
    for (const e of results) {
      if (!e.embedding) continue;
      const sim = cosineSim(qVec, e.embedding);
      if (sim < minSim) continue;
      const v = e.value as { seedHash: string; name: string; domain: string; summary: string; linkedTo?: string };
      if (opts.linkedTo && v.linkedTo !== opts.linkedTo) continue;
      hits.push({
        seedHash: v.seedHash,
        name: v.name,
        domain: v.domain,
        summary: v.summary,
        score: sim,
        entry: e,
      });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }

  /** Forget a specific seed from canon. */
  async forget(seedHash: string): Promise<void> {
    await this.store.remove?.(`canon:${seedHash}`);
  }
}

function cosineSim(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
