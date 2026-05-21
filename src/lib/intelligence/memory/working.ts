/**
 * Working Memory — Layer 1
 *
 * Per-conversation, volatile, in-process. Holds everything Stage 0
 * (live context) wants the agent to know during a single session:
 *   - the current focus seed
 *   - last few user utterances
 *   - sub-agent scratch notes
 *   - intermediate gene specs while Stage 2 is resolving
 *
 * Lifetime: until the agent process exits or the conversation is closed.
 * Zero persistence by design — keeps short-term thinking lightweight.
 */

import { kernelNow } from '../../kernel/clock';
import type { MemoryEntry, MemoryLayer, MemoryQuery } from './types';

export class WorkingMemory implements MemoryLayer {
  readonly name = 'working' as const;
  private store = new Map<string, MemoryEntry>();
  private readonly cap: number;

  constructor(opts: { cap?: number } = {}) {
    this.cap = opts.cap ?? 512;
  }

  async get(key: string): Promise<MemoryEntry | undefined> {
    return this.store.get(key);
  }

  async query(q: MemoryQuery): Promise<MemoryEntry[]> {
    const limit = q.limit ?? 16;
    const out: MemoryEntry[] = [];
    for (const entry of this.store.values()) {
      if (q.topic && entry.topic !== q.topic) continue;
      if (q.source && entry.source !== q.source) continue;
      if (q.text) {
        const hay = `${entry.key} ${JSON.stringify(entry.value)}`.toLowerCase();
        if (!hay.includes(q.text.toLowerCase())) continue;
      }
      out.push(entry);
      if (out.length >= limit) break;
    }
    return out;
  }

  async put(input: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): Promise<void> {
    const now = kernelNow();
    const existing = this.store.get(input.key);
    const entry: MemoryEntry = {
      ...input,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.store.set(input.key, entry);
    this.maybeEvict();
  }

  async remove(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async *all(): AsyncIterable<MemoryEntry> {
    for (const entry of this.store.values()) yield entry;
  }

  /** Simple FIFO-by-update eviction when over cap */
  private maybeEvict(): void {
    if (this.store.size <= this.cap) return;
    const sorted = [...this.store.entries()].sort(
      (a, b) => a[1].updatedAt - b[1].updatedAt,
    );
    const toDelete = sorted.slice(0, this.store.size - this.cap);
    for (const [key] of toDelete) this.store.delete(key);
  }

  /** Snapshot for promotion to a deeper layer */
  snapshot(): MemoryEntry[] {
    return [...this.store.values()];
  }

  /** Clear (e.g. on conversation close) */
  clear(): void {
    this.store.clear();
  }
}
