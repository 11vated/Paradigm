/**
 * File-backed VCS store (Phase 2.4).
 *
 * Persists VCS objects and refs using the same atomic write pattern as
 * json-store.ts (tmp → fsync → rename). Objects live in a single file keyed
 * by hash; refs live in a separate file indexed by `${seed_id}:${name}`.
 *
 * Why a single flat file for objects (not one-file-per-hash)?
 *   - Seed commits are tiny JSON. One file per hash = thousands of tiny
 *     files, which is slow on Windows/macOS APFS.
 *   - We can migrate to per-hash files or CAS blob storage later without
 *     changing the public interface (ObjectStore).
 *
 * The store is crash-safe: an interrupted write leaves either the previous
 * snapshot or the new one — never a torn mix.
 */
import fs from 'fs';
import path from 'path';
import type { ObjectStore, RefStore, RefRecord } from './stores.js';
import type { VcsObject, SeedCommit, SeedTree } from './objects.js';

const OBJECTS_FILE = 'vcs-objects.json';
const REFS_FILE = 'vcs-refs.json';
const HEADS_FILE = 'vcs-heads.json';

/** Write-to-tmp-then-rename. Same logic as json-store but local so we don't
 *  depend on JsonStore internals (which are private). */
function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}`;
  const fh = fs.openSync(tmp, 'w');
  try {
    fs.writeSync(fh, JSON.stringify(data));
    fs.fsyncSync(fh);
  } finally {
    fs.closeSync(fh);
  }
  fs.renameSync(tmp, filePath);
}

function readJsonOr<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    // Torn write would never parse — we fall back to the last known good
    // (empty) state and move on. Phase 0's atomic writes should prevent
    // this from ever happening in practice.
    return fallback;
  }
}

// ── File-backed ObjectStore ───────────────────────────────────────────

interface ObjectsFileShape {
  /** Insertion-ordered hashes for stable listHashes(). */
  order: string[];
  objects: Record<string, VcsObject>;
}

export class JsonObjectStore implements ObjectStore {
  private data: ObjectsFileShape = { order: [], objects: {} };
  private filePath: string;
  private dirty = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, OBJECTS_FILE);
  }

  init(): void {
    this.data = readJsonOr<ObjectsFileShape>(this.filePath, { order: [], objects: {} });
    // 5s flush matches JsonStore's cadence — keeps hot-path `put` synchronous.
    this.flushTimer = setInterval(() => {
      if (this.dirty) this.flush();
    }, 5000);
  }

  close(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
  }

  flush(): void {
    if (!this.dirty) return;
    atomicWriteJson(this.filePath, this.data);
    this.dirty = false;
  }

  async put(hash: string, obj: VcsObject): Promise<void> {
    if (this.data.objects[hash]) return; // idempotent for content-addressable content
    this.data.objects[hash] = obj;
    this.data.order.push(hash);
    this.dirty = true;
  }

  async get(hash: string): Promise<VcsObject | null> {
    return this.data.objects[hash] ?? null;
  }

  async has(hash: string): Promise<boolean> {
    return hash in this.data.objects;
  }

  async listHashes(): Promise<string[]> {
    return [...this.data.order];
  }

  async getCommit(hash: string): Promise<SeedCommit | null> {
    const obj = this.data.objects[hash];
    if (!obj) return null;
    if (obj.kind !== 'commit') {
      throw new Error(`vcs: expected commit at ${hash}, got ${obj.kind}`);
    }
    return obj;
  }

  async getTree(hash: string): Promise<SeedTree | null> {
    const obj = this.data.objects[hash];
    if (!obj) return null;
    if (obj.kind !== 'tree') {
      throw new Error(`vcs: expected tree at ${hash}, got ${obj.kind}`);
    }
    return obj;
  }
}

// ── File-backed RefStore ─────────────────────────────────────────────

type RefsFileShape = Record<string, RefRecord>; // key = `${seed_id}:${name}`
type HeadsFileShape = Record<string, string>; // seed_id → ref_name

export class JsonRefStore implements RefStore {
  private refs: RefsFileShape = {};
  private heads: HeadsFileShape = {};
  private refsPath: string;
  private headsPath: string;
  private dirty = false;
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor(dataDir: string) {
    this.refsPath = path.join(dataDir, REFS_FILE);
    this.headsPath = path.join(dataDir, HEADS_FILE);
  }

  init(): void {
    this.refs = readJsonOr<RefsFileShape>(this.refsPath, {});
    this.heads = readJsonOr<HeadsFileShape>(this.headsPath, {});
    this.flushTimer = setInterval(() => {
      if (this.dirty) this.flush();
    }, 5000);
  }

  close(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush();
  }

  flush(): void {
    if (!this.dirty) return;
    atomicWriteJson(this.refsPath, this.refs);
    atomicWriteJson(this.headsPath, this.heads);
    this.dirty = false;
  }

  async setRef(seed_id: string, name: string, commit: string, now?: string): Promise<void> {
    this.refs[`${seed_id}:${name}`] = {
      seed_id,
      name,
      commit,
      updated_at: now ?? new Date().toISOString(),
    };
    this.dirty = true;
  }

  async getRef(seed_id: string, name: string): Promise<RefRecord | null> {
    return this.refs[`${seed_id}:${name}`] ?? null;
  }

  async listRefs(seed_id: string): Promise<RefRecord[]> {
    const out = Object.values(this.refs).filter((r) => r.seed_id === seed_id);
    out.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
    return out;
  }

  async deleteRef(seed_id: string, name: string): Promise<boolean> {
    const key = `${seed_id}:${name}`;
    if (!(key in this.refs)) return false;
    delete this.refs[key];
    // Deleting HEAD when we drop the ref it points at prevents dangling heads.
    if (this.heads[seed_id] === name) delete this.heads[seed_id];
    this.dirty = true;
    return true;
  }

  async setHead(seed_id: string, ref_name: string): Promise<void> {
    this.heads[seed_id] = ref_name;
    this.dirty = true;
  }

  async getHead(seed_id: string): Promise<string | null> {
    return this.heads[seed_id] ?? null;
  }
}

// ── Composite initialiser ───────────────────────────────────────────

/**
 * Helper: create and init both stores for a given data directory.
 * Returns them ready to use. Call `close()` on each at shutdown.
 */
export function initFileVcs(dataDir: string): { objects: JsonObjectStore; refs: JsonRefStore } {
  const objects = new JsonObjectStore(dataDir);
  objects.init();
  const refs = new JsonRefStore(dataDir);
  refs.init();
  return { objects, refs };
}
