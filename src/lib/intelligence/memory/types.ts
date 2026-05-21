/**
 * Sovereign Agent — 4-Layer Memory System
 *
 * Source: PAradigm-reference/intelligence/memory-system.md
 *
 *   Layer 1  Working    per-conversation, volatile (in-memory)
 *   Layer 2  Episodic   per-user, encrypted (sovereignty key), private
 *   Layer 3  Semantic   per-workspace, shared conventions / lore
 *   Layer 4  World      global curated knowledge (Reality Libraries)
 *
 * All layers share one read/write interface but differ in scope,
 * lifetime, privacy, and backing store.
 */

export type MemoryLayerName = 'working' | 'episodic' | 'semantic' | 'world';

export interface MemoryEntry {
  /** Stable identifier within the layer */
  key: string;
  /** Serializable payload */
  value: unknown;
  /** Topic / namespace tag (e.g. 'character', 'world', 'preference') */
  topic: string;
  /** Optional embedding for semantic retrieval (Layer 3 / 4) */
  embedding?: Float32Array;
  /** Provenance — who/what wrote this */
  source: string;
  /** Deterministic timestamp from kernel/clock */
  createdAt: number;
  /** Updated at, also from kernel/clock */
  updatedAt: number;
  /** Sovereignty signature, if signed */
  signature?: { sigHex: string; pubKeyHex: string };
}

export interface MemoryQuery {
  library?: string;
  key?: string;
  topic?: string;
  /** Substring / phrase match on serialized value */
  text?: string;
  /** Vector similarity if embedding store is available */
  embedding?: Float32Array;
  /** Max results */
  limit?: number;
  /** Source filter */
  source?: string;
}

export interface MemoryLayer {
  readonly name: MemoryLayerName;
  /** Read */
  get(key: string): Promise<MemoryEntry | undefined>;
  /** Vector / text search */
  query(q: MemoryQuery): Promise<MemoryEntry[]>;
  /** Write */
  put(entry: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): Promise<void>;
  /** Delete */
  remove(key: string): Promise<boolean>;
  /** Iterate all (mainly for debugging / export) */
  all(): AsyncIterable<MemoryEntry>;
}

/** The orchestrator picks the right layer per operation */
export interface MemoryOrchestrator {
  /** Quick recall by key, searches working → episodic → semantic */
  recall(key: string): Promise<MemoryEntry | undefined>;
  /** Search across all layers, ranked */
  search(q: MemoryQuery): Promise<MemoryEntry[]>;
  /** Write to a specific layer (rare — usually write goes to working then bubbles) */
  writeTo(layer: MemoryLayerName, entry: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): Promise<void>;
  /** Bubble an entry from working to a deeper layer (long-term retention) */
  promote(key: string, target: 'episodic' | 'semantic'): Promise<void>;
  /** Inject ephemeral context (Stage 0) */
  prime(context: Record<string, unknown>): void;
  /** Direct access for layer-specific operations */
  layer(name: MemoryLayerName): MemoryLayer;
}

/** Local embedder contract — Transformers.js, llama.cpp embeddings, or any future provider. */
export interface Embedder {
  readonly model: string;
  readonly dim: number;
  ready(): Promise<void>;
  embed(text: string): Promise<Float32Array>;
  embedBatch(texts: string[]): Promise<Float32Array[]>;
}
