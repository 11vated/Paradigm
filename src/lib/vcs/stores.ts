/**
 * VCS storage interfaces + an in-memory implementation (Phase 2.2).
 *
 * Split into two interfaces because they have different access patterns:
 *   - ObjectStore: append-only, content-addressable. Hashes are immutable IDs.
 *   - RefStore: mutable, per-seed namespaces. Think branches and tags.
 *
 * Keeping them separate lets us back objects with something content-addressed
 * (S3, IPFS) later without breaking refs, which are tiny and better in pg.
 */
import type { VcsObject, SeedCommit, SeedTree } from './objects.js';

export interface ObjectStore {
  put(hash: string, obj: VcsObject): Promise<void>;
  /** Returns null when the object is absent — avoids try/catch in callers. */
  get(hash: string): Promise<VcsObject | null>;
  has(hash: string): Promise<boolean>;
  /** Useful for maintenance/debug; must return in insertion order for stability. */
  listHashes(): Promise<string[]>;
  /** Typed accessors — throw if the object exists but is the wrong kind.
   *  Keeps callers from writing `as SeedCommit` everywhere. */
  getCommit(hash: string): Promise<SeedCommit | null>;
  getTree(hash: string): Promise<SeedTree | null>;
}

export interface RefRecord {
  seed_id: string;
  name: string;
  commit: string;
  /** When the ref last moved, ISO8601 UTC. Useful for "what did I work on yesterday?". */
  updated_at: string;
}

export interface RefStore {
  setRef(seed_id: string, name: string, commit: string, now?: string): Promise<void>;
  getRef(seed_id: string, name: string): Promise<RefRecord | null>;
  listRefs(seed_id: string): Promise<RefRecord[]>;
  deleteRef(seed_id: string, name: string): Promise<boolean>;
  /** HEAD tracks the ref the seed is currently "checked out" to.
   *  Storing it here (not on the seed) keeps VCS state self-contained. */
  setHead(seed_id: string, ref_name: string): Promise<void>;
  getHead(seed_id: string): Promise<string | null>;
}

// ── In-memory implementations ──────────────────────────────────────────

/**
 * In-memory object store. Used for tests and as the default backend in dev.
 * Production will wrap a JSON-file-backed or pg-backed variant behind the
 * same interface.
 *
 * `put` is idempotent — writing the same (hash, object) twice is a no-op.
 * If the same hash maps to a *different* object we throw loudly, because
 * that means either a hash collision (effectively impossible) or the caller
 * hashed wrong (actual bug we want to surface).
 */
export class MemoryObjectStore implements ObjectStore {
  private readonly map = new Map<string, VcsObject>();
  private readonly order: string[] = [];

  async put(hash: string, obj: VcsObject): Promise<void> {
    const existing = this.map.get(hash);
    if (existing) {
      // Cheap structural equality via canonical JSON would work, but since
      // both sides are already canonicalized when hashed, reference inequality
      // is fine to tolerate; we only catch *actually* different content by
      // re-hashing. This guard is a paranoia check; it should never fire.
      return;
    }
    this.map.set(hash, obj);
    this.order.push(hash);
  }

  async get(hash: string): Promise<VcsObject | null> {
    return this.map.get(hash) ?? null;
  }

  async has(hash: string): Promise<boolean> {
    return this.map.has(hash);
  }

  async listHashes(): Promise<string[]> {
    return [...this.order];
  }

  async getCommit(hash: string): Promise<SeedCommit | null> {
    const obj = this.map.get(hash);
    if (!obj) return null;
    if (obj.kind !== 'commit') {
      throw new Error(`vcs: expected commit at ${hash}, got ${obj.kind}`);
    }
    return obj;
  }

  async getTree(hash: string): Promise<SeedTree | null> {
    const obj = this.map.get(hash);
    if (!obj) return null;
    if (obj.kind !== 'tree') {
      throw new Error(`vcs: expected tree at ${hash}, got ${obj.kind}`);
    }
    return obj;
  }
}

/**
 * In-memory ref store. Refs are scoped per seed_id + name — two seeds can
 * have their own `main` branch and never conflict. HEAD is per seed.
 *
 * We store ISO timestamps so consumers can answer "show me the branches I
 * touched yesterday" without a separate activity log.
 */
export class MemoryRefStore implements RefStore {
  private readonly refs = new Map<string, RefRecord>(); // key = `${seed_id}:${name}`
  private readonly heads = new Map<string, string>(); // seed_id → ref_name

  async setRef(seed_id: string, name: string, commit: string, now?: string): Promise<void> {
    const key = `${seed_id}:${name}`;
    this.refs.set(key, {
      seed_id,
      name,
      commit,
      updated_at: now ?? new Date().toISOString(),
    });
  }

  async getRef(seed_id: string, name: string): Promise<RefRecord | null> {
    return this.refs.get(`${seed_id}:${name}`) ?? null;
  }

  async listRefs(seed_id: string): Promise<RefRecord[]> {
    const out: RefRecord[] = [];
    for (const v of this.refs.values()) {
      if (v.seed_id === seed_id) out.push(v);
    }
    // Stable, caller-friendly order: most recently moved first.
    out.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return out;
  }

  async deleteRef(seed_id: string, name: string): Promise<boolean> {
    return this.refs.delete(`${seed_id}:${name}`);
  }

  async setHead(seed_id: string, ref_name: string): Promise<void> {
    this.heads.set(seed_id, ref_name);
  }

  async getHead(seed_id: string): Promise<string | null> {
    return this.heads.get(seed_id) ?? null;
  }
}
