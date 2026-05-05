/**
 * Seed Version Control — object model (Phase 2.1).
 *
 * Content-addressable storage for seeds, modeled after git:
 *   - Tree: a snapshot of a seed's content (domain, name, genes).
 *   - Commit: tree + parents + author + timestamp + message.
 *   - Blob: large gene values, not used in v1 since gene values are small JSON.
 *
 * Every object is identified by the SHA-256 hash of its canonical JSON form.
 * Canonical = keys sorted recursively, no whitespace. This guarantees that
 * two equal trees/commits have the same hash on any platform, and that a
 * hash identifies an unambiguous object (no malleability).
 *
 * Why build this instead of using `isomorphic-git`?
 *   - Our "files" are gene maps, not bytes; git's text-line semantics hurt
 *     more than help (diffs on JSON text, merge conflicts on whitespace).
 *   - We want to own the merge policy (three-way gene merge, fitness-aware).
 *   - We can stay pure-JS with no filesystem layout baggage.
 */
import crypto from 'crypto';

// ── Object types ────────────────────────────────────────────────────────

/** Matches the gene shape used by the kernel. Kept loose so the VCS layer
 *  doesn't have to track every gene-type addition in the kernel. */
export interface Gene {
  type: string;
  value: unknown;
}

export interface SeedTree {
  kind: 'tree';
  /** Schema version so we can migrate object format later. Start at 1. */
  version: 1;
  domain: string;
  name: string;
  /** Gene map, NOT sorted here — we sort at hash time to keep the interface ergonomic. */
  genes: Record<string, Gene>;
  /** Optional lineage metadata that travels with snapshots. */
  meta?: {
    generation?: number;
    operation?: string;
  };
}

export interface SeedCommit {
  kind: 'commit';
  version: 1;
  /** Hash of the tree this commit points at. */
  tree: string;
  /** Parent commit hashes. Empty for the initial commit, 1 for normal, 2+ for merges. */
  parents: string[];
  /** Author identity. In v1, a username or 'system'. */
  author: string;
  /** ISO8601 UTC. */
  timestamp: string;
  /** Human-readable summary. Free-form. */
  message: string;
  /** The seed_id this commit belongs to. Enables per-seed ref scoping. */
  seed_id: string;
}

export type VcsObject = SeedTree | SeedCommit;

// ── Canonical JSON ──────────────────────────────────────────────────────

/**
 * Return a JSON string where every object's keys are sorted alphabetically
 * (recursively). Arrays keep their order (gene arrays are ordered data, not sets).
 *
 * We deliberately accept `unknown` and narrow inside because TS can't express
 * "recursive JSON-like" without heavy generics and the runtime check is cheap.
 *
 * Fails loudly on `undefined` / `function` / circular refs so we never write a
 * non-round-trippable object to the store.
 */
export function canonicalJson(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null) return null;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) {
        throw new Error(`canonicalJson: non-finite number (${v})`);
      }
      return v;
    }
    if (typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'undefined' || typeof v === 'function' || typeof v === 'symbol') {
      throw new Error(`canonicalJson: unsupported type ${typeof v}`);
    }
    if (Array.isArray(v)) {
      if (seen.has(v)) throw new Error('canonicalJson: circular reference');
      seen.add(v);
      const out = v.map(walk);
      seen.delete(v);
      return out;
    }
    if (typeof v === 'object') {
      if (seen.has(v as object)) throw new Error('canonicalJson: circular reference');
      seen.add(v as object);
      const obj = v as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      const out: Record<string, unknown> = {};
      for (const k of keys) {
        if (obj[k] === undefined) continue; // match JSON.stringify behavior
        out[k] = walk(obj[k]);
      }
      seen.delete(v as object);
      return out;
    }
    // BigInt and anything else unsupported
    throw new Error(`canonicalJson: unsupported type ${typeof v}`);
  };
  return JSON.stringify(walk(value));
}

/**
 * Hash any JSON-serializable value via canonical SHA-256. Returns lowercase hex.
 * This is the single primitive every object ID derives from, so don't change
 * it casually — a change here invalidates every hash in the store.
 */
export function hashJson(value: unknown): string {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex');
}

/** Hash a tree. Wrapped as a named export for call-site clarity. */
export function hashTree(tree: SeedTree): string {
  return hashJson(tree);
}

/** Hash a commit. Commit hash depends on its tree hash + parents + author/ts/msg. */
export function hashCommit(commit: SeedCommit): string {
  return hashJson(commit);
}

// ── Constructors / normalisers ──────────────────────────────────────────

/**
 * Build a SeedTree from a live seed object. Strips runtime-only fields
 * ($hash, $fitness, $embedding, etc.) so the tree captures the *content*
 * of the seed, not its derived state.
 *
 * Design note: lineage.generation and lineage.operation are preserved as
 * meta because they're authored, not derived — a commit that says "this is
 * gen 3, result of `compose`" is useful provenance.
 */
export function treeFromSeed(seed: {
  $domain: string;
  $name?: string;
  genes?: Record<string, Gene>;
  $lineage?: { generation?: number; operation?: string };
}): SeedTree {
  const tree: SeedTree = {
    kind: 'tree',
    version: 1,
    domain: seed.$domain,
    name: seed.$name ?? '',
    genes: seed.genes ?? {},
  };
  if (seed.$lineage && (seed.$lineage.generation != null || seed.$lineage.operation != null)) {
    tree.meta = {};
    if (seed.$lineage.generation != null) tree.meta.generation = seed.$lineage.generation;
    if (seed.$lineage.operation != null) tree.meta.operation = seed.$lineage.operation;
  }
  return tree;
}

/**
 * Build an unsigned commit from its inputs. The caller hashes and stores it.
 * Timestamp is accepted as an argument (not `new Date()`) so the operation
 * is pure — critical for deterministic tests.
 */
export interface MakeCommitInput {
  tree: string;
  parents: string[];
  author: string;
  timestamp: string;
  message: string;
  seed_id: string;
}

export function makeCommit(input: MakeCommitInput): SeedCommit {
  // Parents are stored in the order given — this matters for merge commits
  // where `parents[0]` is "ours" and subsequent parents are "theirs".
  return {
    kind: 'commit',
    version: 1,
    tree: input.tree,
    parents: [...input.parents],
    author: input.author,
    timestamp: input.timestamp,
    message: input.message,
    seed_id: input.seed_id,
  };
}
