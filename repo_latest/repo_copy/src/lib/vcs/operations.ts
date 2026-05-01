/**
 * Seed VCS — high-level operations (Phase 2.3).
 *
 * Composes the object/ref stores with the object model to expose:
 *   - commit()            — snapshot a seed onto a branch
 *   - log()               — walk parent chain
 *   - diffTrees()         — gene-level diff
 *   - mergeCommits()      — three-way merge with conflict surface
 *   - checkout() / branch() / ensureRef()
 *
 * All operations are async because stores may be remote. Pure helpers
 * (diffGenes, findMergeBase) are sync.
 *
 * Merge policy:
 *   - Three-way merge against the latest common ancestor (LCA).
 *   - If one side changed a gene and the other didn't, take the changed side.
 *   - If both sides changed a gene differently, that's a conflict — we
 *     report it in the MergeResult rather than auto-resolving. The caller
 *     decides (agent swarm, user, or a resolver strategy).
 */
import type { ObjectStore, RefStore } from './stores.js';
import type { Gene, SeedCommit, SeedTree } from './objects.js';
import {
  treeFromSeed, hashTree, hashCommit, makeCommit, canonicalJson,
} from './objects.js';

// ── commit ────────────────────────────────────────────────────────────

export interface CommitOptions {
  seed: {
    id: string;
    $domain: string;
    $name?: string;
    genes?: Record<string, Gene>;
    $lineage?: { generation?: number; operation?: string };
  };
  branch: string;
  author: string;
  message: string;
  /** ISO timestamp. Injectable for deterministic tests. */
  timestamp?: string;
  /** Extra parent commits (e.g. for merges). Primary parent comes from the branch tip. */
  extraParents?: string[];
}

export interface CommitResult {
  commit: string;
  tree: string;
  /** True if this commit introduced new content; false if the tree was identical to HEAD. */
  treeChanged: boolean;
}

export async function commit(
  objStore: ObjectStore,
  refStore: RefStore,
  opts: CommitOptions,
): Promise<CommitResult> {
  const tree = treeFromSeed(opts.seed);
  const treeHash = hashTree(tree);
  await objStore.put(treeHash, tree);

  // Resolve the primary parent from the branch tip, if any.
  const existingRef = await refStore.getRef(opts.seed.id, opts.branch);
  const parentCommits: string[] = [];
  let treeChanged = true;
  if (existingRef) {
    parentCommits.push(existingRef.commit);
    const parentCommit = await objStore.getCommit(existingRef.commit);
    if (parentCommit && parentCommit.tree === treeHash) {
      treeChanged = false;
      // Idempotent commit: same content → same commit (only if message/author/ts
      // match too). We always create a new commit when the message differs
      // because the author may want to record intent even without content change.
    }
  }
  if (opts.extraParents) parentCommits.push(...opts.extraParents);

  const commitObj: SeedCommit = makeCommit({
    tree: treeHash,
    parents: parentCommits,
    author: opts.author,
    timestamp: opts.timestamp ?? new Date().toISOString(),
    message: opts.message,
    seed_id: opts.seed.id,
  });
  const commitHash = hashCommit(commitObj);
  await objStore.put(commitHash, commitObj);

  await refStore.setRef(opts.seed.id, opts.branch, commitHash, opts.timestamp);

  return { commit: commitHash, tree: treeHash, treeChanged };
}

// ── log ────────────────────────────────────────────────────────────

export interface LogEntry {
  hash: string;
  commit: SeedCommit;
}

/**
 * Walk the commit DAG from `head` following the *first* parent each step.
 * Stops at the initial commit (empty parents) or when `limit` is reached.
 *
 * First-parent walk (vs. full DAG traversal) matches what users want for a
 * linear "this is what I did" view. For full graph traversal we'd add a
 * separate `graph()` operation returning edges.
 */
export async function log(
  objStore: ObjectStore,
  head: string,
  limit = 50,
): Promise<LogEntry[]> {
  const out: LogEntry[] = [];
  let cursor: string | undefined = head;
  const seen = new Set<string>(); // guard against malformed cycles
  while (cursor && out.length < limit) {
    if (seen.has(cursor)) break;
    seen.add(cursor);
    const c = await objStore.getCommit(cursor);
    if (!c) break;
    out.push({ hash: cursor, commit: c });
    cursor = c.parents[0];
  }
  return out;
}

// ── diff ──────────────────────────────────────────────────────────

export type GeneChange =
  | { kind: 'added'; path: string; value: Gene }
  | { kind: 'removed'; path: string; value: Gene }
  | { kind: 'modified'; path: string; from: Gene; to: Gene };

export interface TreeDiff {
  domainChanged: boolean;
  nameChanged: boolean;
  genes: GeneChange[];
}

/**
 * Pure diff of two trees. Doesn't touch any store.
 *
 * Equality for gene values uses canonical JSON — not reference equality and
 * not JSON.stringify (which can produce different strings for equal content
 * depending on key order).
 */
export function diffTrees(a: SeedTree, b: SeedTree): TreeDiff {
  const domainChanged = a.domain !== b.domain;
  const nameChanged = a.name !== b.name;
  const geneChanges: GeneChange[] = [];
  const keys = new Set([...Object.keys(a.genes), ...Object.keys(b.genes)]);
  const sorted = [...keys].sort();
  for (const k of sorted) {
    const av = a.genes[k];
    const bv = b.genes[k];
    if (av && !bv) geneChanges.push({ kind: 'removed', path: k, value: av });
    else if (!av && bv) geneChanges.push({ kind: 'added', path: k, value: bv });
    else if (av && bv && !geneEquals(av, bv)) {
      geneChanges.push({ kind: 'modified', path: k, from: av, to: bv });
    }
  }
  return { domainChanged, nameChanged, genes: geneChanges };
}

/** Structural gene equality via canonical JSON — order-insensitive. */
export function geneEquals(a: Gene, b: Gene): boolean {
  if (a === b) return true;
  return canonicalJson(a) === canonicalJson(b);
}

// ── merge base (LCA) ──────────────────────────────────────────────

/**
 * Find the lowest common ancestor of two commits — i.e. the newest commit
 * reachable from both. Standard algorithm: BFS ancestors of A into a set,
 * then BFS ancestors of B and return the first one in the set.
 *
 * Returns null if the commits share no ancestor (disjoint histories — we
 * treat this as "merge base is the empty tree").
 */
export async function findMergeBase(
  objStore: ObjectStore,
  a: string,
  b: string,
): Promise<string | null> {
  if (a === b) return a;
  const ancestorsOfA = new Set<string>();
  const queueA: string[] = [a];
  while (queueA.length) {
    const cur = queueA.shift()!;
    if (ancestorsOfA.has(cur)) continue;
    ancestorsOfA.add(cur);
    const c = await objStore.getCommit(cur);
    if (!c) continue;
    for (const p of c.parents) queueA.push(p);
  }
  const visited = new Set<string>();
  const queueB: string[] = [b];
  while (queueB.length) {
    const cur = queueB.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    if (ancestorsOfA.has(cur)) return cur;
    const c = await objStore.getCommit(cur);
    if (!c) continue;
    for (const p of c.parents) queueB.push(p);
  }
  return null;
}

// ── merge ─────────────────────────────────────────────────────────

export interface MergeConflict {
  path: string;
  base?: Gene;
  ours: Gene;
  theirs: Gene;
}

export interface MergeResult {
  /** The merged tree, if conflicts === []. */
  tree?: SeedTree;
  /** Conflicts that need resolver attention. */
  conflicts: MergeConflict[];
  /** `true` when the merge was trivially resolved (fast-forward or clean 3-way). */
  clean: boolean;
}

/**
 * Three-way merge of `ours` and `theirs` against their common ancestor `base`.
 *
 * Per-gene rules:
 *   - If both sides equal to base → unchanged.
 *   - If one side changed, the other didn't → take the changed side.
 *   - If both sides made the same change → unchanged (take either).
 *   - If both sides changed differently → CONFLICT (reported).
 *
 * Domain and name get the same rules but there's no `conflicts` slot for
 * them in v1 — if one side renamed and the other didn't, we take the
 * rename; if both renamed to different things, theirs wins and we log.
 * This keeps the return type simple; rename conflicts are rare in practice.
 */
export function mergeTrees(
  base: SeedTree | null,
  ours: SeedTree,
  theirs: SeedTree,
): MergeResult {
  const conflicts: MergeConflict[] = [];
  const mergedGenes: Record<string, Gene> = {};
  const emptyBaseGenes: Record<string, Gene> = {};
  const baseGenes = base?.genes ?? emptyBaseGenes;

  const allKeys = new Set([
    ...Object.keys(baseGenes),
    ...Object.keys(ours.genes),
    ...Object.keys(theirs.genes),
  ]);

  for (const k of allKeys) {
    const b = baseGenes[k];
    const o = ours.genes[k];
    const t = theirs.genes[k];

    const oursChanged = !geneSame(b, o);
    const theirsChanged = !geneSame(b, t);

    if (!oursChanged && !theirsChanged) {
      // Both equal to base. If `o` exists, keep it (base + no changes).
      if (o) mergedGenes[k] = o;
      continue;
    }
    if (oursChanged && !theirsChanged) {
      if (o) mergedGenes[k] = o;
      // If o is undefined, the user removed it and theirs didn't touch → stay removed.
      continue;
    }
    if (!oursChanged && theirsChanged) {
      if (t) mergedGenes[k] = t;
      continue;
    }
    // Both changed. If they happen to agree, no conflict.
    if (o && t && geneEquals(o, t)) {
      mergedGenes[k] = o;
      continue;
    }
    conflicts.push({
      path: k,
      base: b,
      // When one side removed and the other edited, we still surface a conflict
      // with a placeholder gene; callers should inspect `ours`/`theirs` presence.
      ours: o ?? { type: '<removed>', value: null },
      theirs: t ?? { type: '<removed>', value: null },
    });
  }

  if (conflicts.length > 0) {
    return { conflicts, clean: false };
  }

  const domain =
    ours.domain === theirs.domain ? ours.domain :
    base && ours.domain !== base.domain && theirs.domain === base.domain ? ours.domain :
    theirs.domain;

  const name =
    ours.name === theirs.name ? ours.name :
    base && ours.name !== base.name && theirs.name === base.name ? ours.name :
    theirs.name;

  const tree: SeedTree = {
    kind: 'tree',
    version: 1,
    domain,
    name,
    genes: mergedGenes,
  };
  if (ours.meta || theirs.meta) {
    tree.meta = { ...(theirs.meta ?? {}), ...(ours.meta ?? {}) };
  }
  return { tree, conflicts: [], clean: true };
}

function geneSame(a: Gene | undefined, b: Gene | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return geneEquals(a, b);
}

// ── merge high-level helper ───────────────────────────────────────

export interface MergeCommitsOptions {
  seed_id: string;
  ours: string; // commit hash
  theirs: string; // commit hash
}

export interface MergeCommitsResult extends MergeResult {
  /** For clean merges, the tree hash stored in the ObjectStore. */
  treeHash?: string;
  /** The merge base commit hash (null if disjoint histories). */
  base: string | null;
}

/**
 * Convenience over mergeTrees that resolves commits → trees and persists the
 * merged tree for a caller that's about to commit it.
 *
 * Why not auto-commit here? Because the caller owns author/message/timestamp
 * and whether this merge should create a new commit on a branch or just
 * preview the result. Separating the "compute merged tree" step from the
 * "write a merge commit" step keeps the surface composable.
 */
export async function mergeCommits(
  objStore: ObjectStore,
  opts: MergeCommitsOptions,
): Promise<MergeCommitsResult> {
  const [oursCommit, theirsCommit] = await Promise.all([
    objStore.getCommit(opts.ours),
    objStore.getCommit(opts.theirs),
  ]);
  if (!oursCommit) throw new Error(`merge: ours commit not found: ${opts.ours}`);
  if (!theirsCommit) throw new Error(`merge: theirs commit not found: ${opts.theirs}`);

  const baseHash = await findMergeBase(objStore, opts.ours, opts.theirs);

  // Fast-forward cases:
  //  - If base === ours, theirs is strictly ahead → result is theirs' tree.
  //  - If base === theirs, ours is strictly ahead → result is ours' tree.
  if (baseHash === opts.ours) {
    const theirsTree = await objStore.getTree(theirsCommit.tree);
    if (!theirsTree) throw new Error(`merge: theirs tree missing: ${theirsCommit.tree}`);
    return { clean: true, conflicts: [], tree: theirsTree, treeHash: theirsCommit.tree, base: baseHash };
  }
  if (baseHash === opts.theirs) {
    const oursTree = await objStore.getTree(oursCommit.tree);
    if (!oursTree) throw new Error(`merge: ours tree missing: ${oursCommit.tree}`);
    return { clean: true, conflicts: [], tree: oursTree, treeHash: oursCommit.tree, base: baseHash };
  }

  const [baseTree, oursTree, theirsTree] = await Promise.all([
    baseHash ? objStore.getCommit(baseHash).then((c) => c ? objStore.getTree(c.tree) : null) : Promise.resolve(null),
    objStore.getTree(oursCommit.tree),
    objStore.getTree(theirsCommit.tree),
  ]);
  if (!oursTree) throw new Error(`merge: ours tree missing: ${oursCommit.tree}`);
  if (!theirsTree) throw new Error(`merge: theirs tree missing: ${theirsCommit.tree}`);

  const result = mergeTrees(baseTree ?? null, oursTree, theirsTree);
  if (result.clean && result.tree) {
    const treeHash = hashTree(result.tree);
    await objStore.put(treeHash, result.tree);
    return { ...result, treeHash, base: baseHash };
  }
  return { ...result, base: baseHash };
}

// ── branch / checkout / ensureRef ──────────────────────────────────

export async function branch(
  refStore: RefStore,
  seed_id: string,
  name: string,
  fromCommit: string,
): Promise<void> {
  const existing = await refStore.getRef(seed_id, name);
  if (existing) {
    throw new Error(`branch: ref already exists: ${name}`);
  }
  await refStore.setRef(seed_id, name, fromCommit);
}

export async function checkout(refStore: RefStore, seed_id: string, ref_name: string): Promise<void> {
  const ref = await refStore.getRef(seed_id, ref_name);
  if (!ref) throw new Error(`checkout: ref not found: ${ref_name}`);
  await refStore.setHead(seed_id, ref_name);
}

/**
 * Get-or-create a ref at `commit`. Useful for the initial `main` branch on a
 * seed's first commit, where we don't want the caller to branch-before-commit.
 */
export async function ensureRef(
  refStore: RefStore,
  seed_id: string,
  name: string,
  commit: string,
): Promise<void> {
  const existing = await refStore.getRef(seed_id, name);
  if (existing) return;
  await refStore.setRef(seed_id, name, commit);
}
