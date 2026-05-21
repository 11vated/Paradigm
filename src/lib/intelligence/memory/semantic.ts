/**
 * Semantic Memory — Layer 3
 *
 * Per-workspace, durable, shared conventions and lore.
 *
 * Stores:
 *   - workspace-level style guides ("we always use D minor for sadness")
 *   - named-entity registry ("Aria refers to seed 0x9a...")
 *   - learned adjective vectors (extensions to the static lexicon)
 *   - canon graph (which characters belong to which world)
 *
 * Backing store: a single JSON file per workspace, loaded lazily.
 * Designed to be small (KB–MB range). Heavier vector data goes through
 * the SBERT sidecar / pgvector when configured; otherwise an in-memory
 * cosine index is used as a default.
 *
 * Determinism: the JSON file is the source of truth and the agent
 * reads it deterministically. Wall-clock fields (createdAt /
 * updatedAt) route through `kernelNow()`.
 */

import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';
import { kernelNow } from '../../kernel/clock';
import type { MemoryEntry, MemoryLayer, MemoryQuery } from './types';

interface SemanticFile {
  version: 1;
  entries: MemoryEntry[];
}

export class SemanticMemory implements MemoryLayer {
  readonly name = 'semantic' as const;
  private store = new Map<string, MemoryEntry>();
  private loaded = false;
  private dirty = false;
  private saveTimer?: ReturnType<typeof setTimeout>;

  constructor(private readonly path: string) {}

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await fs.readFile(this.path, 'utf8');
      const parsed = JSON.parse(raw) as SemanticFile;
      if (parsed.version !== 1) {
        throw new Error(`Unknown semantic memory version: ${parsed.version}`);
      }
      // Rebuild Float32Array embeddings if present
      for (const entry of parsed.entries) {
        if (entry.embedding && !(entry.embedding instanceof Float32Array)) {
          entry.embedding = new Float32Array(entry.embedding as unknown as number[]);
        }
        this.store.set(entry.key, entry);
      }
    } catch (err) {
      const e = err as NodeJS.ErrnoException;
      if (e.code !== 'ENOENT') throw err;
      // Fresh start — file doesn't exist yet
    }
    this.loaded = true;
  }

  async get(key: string): Promise<MemoryEntry | undefined> {
    await this.ensureLoaded();
    return this.store.get(key);
  }

  async query(q: MemoryQuery): Promise<MemoryEntry[]> {
    await this.ensureLoaded();
    const limit = q.limit ?? 16;
    const candidates: MemoryEntry[] = [];
    for (const entry of this.store.values()) {
      if (q.topic && entry.topic !== q.topic) continue;
      if (q.source && entry.source !== q.source) continue;
      if (q.text) {
        const hay = `${entry.key} ${JSON.stringify(entry.value)}`.toLowerCase();
        if (!hay.includes(q.text.toLowerCase())) continue;
      }
      candidates.push(entry);
    }

    if (q.embedding) {
      const ranked = candidates
        .filter((e) => e.embedding)
        .map((e) => ({ e, score: cosine(q.embedding!, e.embedding!) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((r) => r.e);
      return ranked.length > 0 ? ranked : candidates.slice(0, limit);
    }
    return candidates.slice(0, limit);
  }

  async put(input: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): Promise<void> {
    await this.ensureLoaded();
    const now = kernelNow();
    const existing = this.store.get(input.key);
    const entry: MemoryEntry = {
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.store.set(input.key, entry);
    this.scheduleSave();
  }

  async remove(key: string): Promise<boolean> {
    await this.ensureLoaded();
    const ok = this.store.delete(key);
    if (ok) this.scheduleSave();
    return ok;
  }

  async *all(): AsyncIterable<MemoryEntry> {
    await this.ensureLoaded();
    for (const entry of this.store.values()) yield entry;
  }

  /** Flush pending writes immediately (e.g. on shutdown) */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }
    if (this.dirty) await this.save();
  }

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      void this.save();
    }, 250);
  }

  private async save(): Promise<void> {
    const payload: SemanticFile = {
      version: 1,
      entries: [...this.store.values()].map((e) => ({
        ...e,
        embedding: e.embedding ? (Array.from(e.embedding) as unknown as Float32Array) : undefined,
      })),
    };
    await fs.mkdir(dirname(this.path), { recursive: true });
    await fs.writeFile(this.path, JSON.stringify(payload, null, 2));
    this.dirty = false;
  }
}

function cosine(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
