/**
 * FriendStore — persistent registry of FriendSeeds + their lineage.
 *
 * Phase 1 (4/n): JSON-backed file store with in-memory cache. Matches
 * the shape of the existing seed-store interface so it can later swap
 * for a Postgres backend by following the `src/lib/data-store/`
 * pattern.
 *
 * Storage layout (atomic write):
 *   data/friends/friends.json   — array of FriendSeedData
 *   data/friends/index.json     — { byId, byParent } indexes (regenerated on load)
 *
 * Concurrency: the store serializes writes through a promise chain.
 * Reads are O(1) from the in-memory map.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { FriendSeedData } from './types';

export interface LineageNode {
  id: string;
  name: string;
  generation: number;
  operator: 'genesis' | 'breed' | 'mutate';
  parents: string[];
  children: string[];
}

export interface FriendStoreStats {
  count: number;
  genesisCount: number;
  bredCount: number;
  mutatedCount: number;
  maxGeneration: number;
}

export class FriendStore {
  private byId = new Map<string, FriendSeedData>();
  private childrenOf = new Map<string, Set<string>>(); // parent id → child ids
  private filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();
  private loaded = false;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, 'friends.json');
  }

  // ─── lifecycle ─────────────────────────────────────────────────────────

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const friends = JSON.parse(raw) as FriendSeedData[];
      for (const f of friends) this.indexFriend(f);
      this.loaded = true;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // First run — start empty.
        await fs.mkdir(path.dirname(this.filePath), { recursive: true });
        this.loaded = true;
      } else {
        throw err;
      }
    }
  }

  private indexFriend(f: FriendSeedData): void {
    this.byId.set(f.id, f);
    const parents = f.derivation?.parents ?? [];
    for (const parentId of parents) {
      if (!this.childrenOf.has(parentId)) this.childrenOf.set(parentId, new Set());
      this.childrenOf.get(parentId)!.add(f.id);
    }
  }

  private async persist(): Promise<void> {
    // Atomic write: write to tmp, rename. Last-write-wins under concurrency.
    const all = Array.from(this.byId.values());
    const tmp = this.filePath + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(all, null, 2), 'utf8');
    await fs.rename(tmp, this.filePath);
  }

  private enqueueWrite(): Promise<void> {
    this.writeQueue = this.writeQueue.then(() => this.persist()).catch((err) => {
      // Don't let a single failure poison the queue; log to caller via rejection.
      console.error('FriendStore persist failed:', err);
      throw err;
    });
    return this.writeQueue;
  }

  // ─── reads ─────────────────────────────────────────────────────────────

  get(id: string): FriendSeedData | null {
    return this.byId.get(id) ?? null;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  list(opts?: { offset?: number; limit?: number; operator?: 'genesis' | 'breed' | 'mutate' }): FriendSeedData[] {
    const { offset = 0, limit = 100, operator } = opts ?? {};
    let all = Array.from(this.byId.values());
    if (operator) {
      all = all.filter((f) => f.derivation?.operator === operator);
    }
    // Sort by bornAt descending (newest first), stable by id.
    all.sort((a, b) => {
      if (a.bornAt !== b.bornAt) return b.bornAt.localeCompare(a.bornAt);
      return a.id.localeCompare(b.id);
    });
    return all.slice(offset, offset + limit);
  }

  count(): number {
    return this.byId.size;
  }

  stats(): FriendStoreStats {
    let g = 0, b = 0, m = 0, maxGen = 0;
    for (const f of this.byId.values()) {
      const op = f.derivation?.operator ?? 'genesis';
      if (op === 'genesis') g++;
      else if (op === 'breed') b++;
      else if (op === 'mutate') m++;
      maxGen = Math.max(maxGen, f.derivation?.generation ?? 0);
    }
    return { count: this.byId.size, genesisCount: g, bredCount: b, mutatedCount: m, maxGeneration: maxGen };
  }

  /**
   * Return ancestors (BFS up the parent chain) and descendants (BFS
   * down the children chain) for a Friend.
   */
  lineage(id: string, maxDepth = 6): { ancestors: LineageNode[]; descendants: LineageNode[] } | null {
    if (!this.byId.has(id)) return null;
    const ancestors = this.walkUp(id, maxDepth);
    const descendants = this.walkDown(id, maxDepth);
    return { ancestors, descendants };
  }

  private toLineageNode(f: FriendSeedData): LineageNode {
    return {
      id: f.id,
      name: f.name,
      generation: f.derivation?.generation ?? 0,
      operator: f.derivation?.operator ?? 'genesis',
      parents: f.derivation?.parents ?? [],
      children: Array.from(this.childrenOf.get(f.id) ?? []),
    };
  }

  private walkUp(startId: string, maxDepth: number): LineageNode[] {
    const seen = new Set<string>([startId]);
    const out: LineageNode[] = [];
    const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;
      const f = this.byId.get(id);
      if (!f) continue;
      for (const p of f.derivation?.parents ?? []) {
        if (seen.has(p)) continue;
        seen.add(p);
        const pf = this.byId.get(p);
        if (pf) {
          out.push(this.toLineageNode(pf));
          queue.push({ id: p, depth: depth + 1 });
        }
      }
    }
    return out;
  }

  private walkDown(startId: string, maxDepth: number): LineageNode[] {
    const seen = new Set<string>([startId]);
    const out: LineageNode[] = [];
    const queue: { id: string; depth: number }[] = [{ id: startId, depth: 0 }];
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;
      for (const c of this.childrenOf.get(id) ?? []) {
        if (seen.has(c)) continue;
        seen.add(c);
        const cf = this.byId.get(c);
        if (cf) {
          out.push(this.toLineageNode(cf));
          queue.push({ id: c, depth: depth + 1 });
        }
      }
    }
    return out;
  }

  // ─── writes ────────────────────────────────────────────────────────────

  async add(f: FriendSeedData): Promise<FriendSeedData> {
    if (this.byId.has(f.id)) {
      // Idempotent — same id = same seed (because id is deterministic from genes).
      return this.byId.get(f.id)!;
    }
    this.indexFriend(f);
    await this.enqueueWrite();
    return f;
  }

  async remove(id: string): Promise<boolean> {
    const f = this.byId.get(id);
    if (!f) return false;
    this.byId.delete(id);
    for (const p of f.derivation?.parents ?? []) {
      this.childrenOf.get(p)?.delete(id);
    }
    this.childrenOf.delete(id);
    await this.enqueueWrite();
    return true;
  }

  async clear(): Promise<void> {
    this.byId.clear();
    this.childrenOf.clear();
    await this.enqueueWrite();
  }

  async flush(): Promise<void> {
    await this.writeQueue;
  }
}

// ─── singleton ──────────────────────────────────────────────────────────

let _instance: FriendStore | null = null;

export function getFriendStore(dataDir = 'data/friends'): FriendStore {
  if (!_instance) _instance = new FriendStore(dataDir);
  return _instance;
}

/** Reset for tests. */
export function __resetFriendStoreForTests(): void {
  _instance = null;
}
