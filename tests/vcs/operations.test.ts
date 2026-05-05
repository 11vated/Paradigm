/**
 * VCS operations: commit, log, diff, merge-base, three-way merge.
 *
 * These tests use in-memory stores and explicit timestamps so results are
 * deterministic. The same invariants must hold for the file-backed store —
 * only the persistence is different.
 */
import { describe, it, expect } from 'vitest';
import {
  commit,
  log,
  diffTrees,
  findMergeBase,
  mergeTrees,
  mergeCommits,
  branch,
  checkout,
  ensureRef,
} from '../../src/lib/vcs/operations.js';
import { MemoryObjectStore, MemoryRefStore } from '../../src/lib/vcs/stores.js';
import type { Gene, SeedTree } from '../../src/lib/vcs/objects.js';

function makeSeed(id: string, genes: Record<string, Gene>, domain = 'audio', name = 'wave') {
  return { id, $domain: domain, $name: name, genes };
}

const TS = '2026-04-14T00:00:00Z';
const TS2 = '2026-04-14T01:00:00Z';
const TS3 = '2026-04-14T02:00:00Z';

describe('commit', () => {
  it('first commit creates tree+commit and sets the ref', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    const r = await commit(objs, refs, {
      seed: makeSeed('s1', { amp: { type: 'scalar', value: 0.5 } }),
      branch: 'main',
      author: 'alice',
      message: 'init',
      timestamp: TS,
    });
    expect(r.commit).toMatch(/^[0-9a-f]{64}$/);
    expect(r.tree).toMatch(/^[0-9a-f]{64}$/);
    expect(r.treeChanged).toBe(true);
    expect(await objs.has(r.tree)).toBe(true);
    expect(await objs.has(r.commit)).toBe(true);
    expect((await refs.getRef('s1', 'main'))?.commit).toBe(r.commit);
  });

  it('second commit parents onto the branch tip', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    const c1 = await commit(objs, refs, {
      seed: makeSeed('s1', { amp: { type: 'scalar', value: 0.5 } }),
      branch: 'main',
      author: 'a',
      message: 'init',
      timestamp: TS,
    });
    const c2 = await commit(objs, refs, {
      seed: makeSeed('s1', { amp: { type: 'scalar', value: 0.6 } }),
      branch: 'main',
      author: 'a',
      message: 'tweak',
      timestamp: TS2,
    });
    const commit2 = await objs.getCommit(c2.commit);
    expect(commit2?.parents).toEqual([c1.commit]);
    expect(c2.treeChanged).toBe(true);
  });

  it('unchanged content flags treeChanged=false but still parents onto tip', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    const seed = makeSeed('s1', { amp: { type: 'scalar', value: 0.5 } });
    const c1 = await commit(objs, refs, { seed, branch: 'main', author: 'a', message: 'init', timestamp: TS });
    const c2 = await commit(objs, refs, { seed, branch: 'main', author: 'a', message: 'no-op', timestamp: TS2 });
    expect(c2.treeChanged).toBe(false);
    expect(c1.tree).toBe(c2.tree);
    // Still a new commit (different message/timestamp → different commit hash).
    expect(c1.commit).not.toBe(c2.commit);
  });

  it('extraParents is appended after the primary parent for merge commits', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    const c1 = await commit(objs, refs, {
      seed: makeSeed('s1', { a: { type: 's', value: 1 } }),
      branch: 'main', author: 'a', message: 'a', timestamp: TS,
    });
    const c2 = await commit(objs, refs, {
      seed: makeSeed('s1', { a: { type: 's', value: 2 } }),
      branch: 'main', author: 'a', message: 'b', timestamp: TS2,
      extraParents: ['deadbeef'.repeat(8)],
    });
    const c = await objs.getCommit(c2.commit);
    expect(c?.parents[0]).toBe(c1.commit);
    expect(c?.parents[1]).toBe('deadbeef'.repeat(8));
  });
});

describe('log', () => {
  it('walks first-parent back to the initial commit', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    const a = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 1 } }), branch: 'main', author: 'a', message: 'a', timestamp: TS });
    const b = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 2 } }), branch: 'main', author: 'a', message: 'b', timestamp: TS2 });
    const c = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 3 } }), branch: 'main', author: 'a', message: 'c', timestamp: TS3 });
    const entries = await log(objs, c.commit);
    expect(entries.map((e) => e.commit.message)).toEqual(['c', 'b', 'a']);
  });

  it('respects limit', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    let prev: string | null = null;
    const hashes: string[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await commit(objs, refs, {
        seed: makeSeed('s', { g: { type: 's', value: i } }),
        branch: 'main', author: 'a', message: `m${i}`, timestamp: `2026-04-14T0${i}:00:00Z`,
      });
      hashes.push(r.commit);
      prev = r.commit;
    }
    const entries = await log(objs, prev!, 2);
    expect(entries).toHaveLength(2);
  });
});

describe('diffTrees', () => {
  const base: SeedTree = {
    kind: 'tree', version: 1, domain: 'audio', name: 'wave',
    genes: {
      a: { type: 's', value: 1 },
      b: { type: 's', value: 2 },
    },
  };

  it('detects added, removed, and modified genes', () => {
    const other: SeedTree = {
      ...base,
      genes: {
        a: { type: 's', value: 1 },           // unchanged
        b: { type: 's', value: 99 },          // modified
        c: { type: 's', value: 3 },           // added
      },
    };
    const d = diffTrees(base, other);
    expect(d.domainChanged).toBe(false);
    expect(d.nameChanged).toBe(false);
    const byKind = Object.fromEntries(d.genes.map((g) => [g.path, g.kind]));
    expect(byKind).toEqual({ b: 'modified', c: 'added' });
  });

  it('detects removal', () => {
    const other: SeedTree = { ...base, genes: { a: { type: 's', value: 1 } } };
    const d = diffTrees(base, other);
    expect(d.genes).toEqual([{ kind: 'removed', path: 'b', value: { type: 's', value: 2 } }]);
  });

  it('domain and name changes flag separately', () => {
    const other: SeedTree = { ...base, domain: 'visual', name: 'alt' };
    const d = diffTrees(base, other);
    expect(d.domainChanged).toBe(true);
    expect(d.nameChanged).toBe(true);
  });
});

describe('findMergeBase', () => {
  it('returns the branch point', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    // main: A -> B -> C
    const A = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 1 } }), branch: 'main', author: 'a', message: 'A', timestamp: TS });
    const B = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 2 } }), branch: 'main', author: 'a', message: 'B', timestamp: TS2 });
    // dev branches off B:  B -> D
    await branch(refs, 's', 'dev', B.commit);
    const D = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 20 } }), branch: 'dev', author: 'a', message: 'D', timestamp: TS3 });
    const C = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 3 } }), branch: 'main', author: 'a', message: 'C', timestamp: '2026-04-14T03:00:00Z' });
    const base = await findMergeBase(objs, C.commit, D.commit);
    expect(base).toBe(B.commit);
  });

  it('is reflexive and detects fast-forward', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    const A = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 1 } }), branch: 'main', author: 'a', message: 'A', timestamp: TS });
    const B = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 2 } }), branch: 'main', author: 'a', message: 'B', timestamp: TS2 });
    expect(await findMergeBase(objs, A.commit, A.commit)).toBe(A.commit);
    expect(await findMergeBase(objs, A.commit, B.commit)).toBe(A.commit);
  });

  it('returns null for disjoint histories', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    const A = await commit(objs, refs, { seed: makeSeed('s1', { g: { type: 's', value: 1 } }), branch: 'main', author: 'a', message: 'A', timestamp: TS });
    const B = await commit(objs, refs, { seed: makeSeed('s2', { g: { type: 's', value: 2 } }), branch: 'main', author: 'a', message: 'B', timestamp: TS2 });
    expect(await findMergeBase(objs, A.commit, B.commit)).toBeNull();
  });
});

describe('mergeTrees (three-way)', () => {
  const base: SeedTree = {
    kind: 'tree', version: 1, domain: 'audio', name: 'wave',
    genes: {
      shared: { type: 's', value: 1 },
      ours_only: { type: 's', value: 2 },
      theirs_only: { type: 's', value: 3 },
    },
  };

  it('clean merge: one-side-changed genes apply', () => {
    const ours: SeedTree = {
      ...base,
      genes: { ...base.genes, ours_only: { type: 's', value: 22 } },
    };
    const theirs: SeedTree = {
      ...base,
      genes: { ...base.genes, theirs_only: { type: 's', value: 33 } },
    };
    const r = mergeTrees(base, ours, theirs);
    expect(r.clean).toBe(true);
    expect(r.tree?.genes.ours_only.value).toBe(22);
    expect(r.tree?.genes.theirs_only.value).toBe(33);
    expect(r.tree?.genes.shared.value).toBe(1);
  });

  it('clean merge: same-change-both-sides is not a conflict', () => {
    const ours: SeedTree = { ...base, genes: { ...base.genes, shared: { type: 's', value: 99 } } };
    const theirs: SeedTree = { ...base, genes: { ...base.genes, shared: { type: 's', value: 99 } } };
    const r = mergeTrees(base, ours, theirs);
    expect(r.clean).toBe(true);
    expect(r.tree?.genes.shared.value).toBe(99);
  });

  it('conflict: both sides changed the same gene differently', () => {
    const ours: SeedTree = { ...base, genes: { ...base.genes, shared: { type: 's', value: 10 } } };
    const theirs: SeedTree = { ...base, genes: { ...base.genes, shared: { type: 's', value: 20 } } };
    const r = mergeTrees(base, ours, theirs);
    expect(r.clean).toBe(false);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].path).toBe('shared');
    expect(r.conflicts[0].ours.value).toBe(10);
    expect(r.conflicts[0].theirs.value).toBe(20);
  });

  it('conflict: one side removed, other edited', () => {
    const ours: SeedTree = { ...base, genes: (() => { const { shared, ...rest } = base.genes; return rest; })() };
    const theirs: SeedTree = { ...base, genes: { ...base.genes, shared: { type: 's', value: 99 } } };
    const r = mergeTrees(base, ours, theirs);
    expect(r.clean).toBe(false);
    expect(r.conflicts[0].path).toBe('shared');
  });

  it('null base is treated as empty-genes (both sides added from scratch)', () => {
    const ours: SeedTree = { ...base, genes: { x: { type: 's', value: 1 } } };
    const theirs: SeedTree = { ...base, genes: { y: { type: 's', value: 2 } } };
    const r = mergeTrees(null, ours, theirs);
    expect(r.clean).toBe(true);
    expect(r.tree?.genes).toEqual({
      x: { type: 's', value: 1 },
      y: { type: 's', value: 2 },
    });
  });
});

describe('mergeCommits', () => {
  it('fast-forwards when base === ours', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    const A = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 1 } }), branch: 'main', author: 'a', message: 'A', timestamp: TS });
    const B = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 2 } }), branch: 'main', author: 'a', message: 'B', timestamp: TS2 });
    const r = await mergeCommits(objs, { seed_id: 's', ours: A.commit, theirs: B.commit });
    expect(r.clean).toBe(true);
    expect(r.conflicts).toHaveLength(0);
    expect(r.treeHash).toBe(B.tree);
  });

  it('performs three-way merge when histories diverged', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    const A = await commit(objs, refs, { seed: makeSeed('s', { a: { type: 's', value: 1 }, b: { type: 's', value: 1 } }), branch: 'main', author: 'a', message: 'A', timestamp: TS });
    // ours branch: change a
    const ours = await commit(objs, refs, { seed: makeSeed('s', { a: { type: 's', value: 10 }, b: { type: 's', value: 1 } }), branch: 'main', author: 'a', message: 'ours', timestamp: TS2 });
    // theirs branch (from A): change b
    await branch(refs, 's', 'dev', A.commit);
    const theirs = await commit(objs, refs, { seed: makeSeed('s', { a: { type: 's', value: 1 }, b: { type: 's', value: 20 } }), branch: 'dev', author: 'a', message: 'theirs', timestamp: TS3 });
    const r = await mergeCommits(objs, { seed_id: 's', ours: ours.commit, theirs: theirs.commit });
    expect(r.clean).toBe(true);
    expect(r.tree?.genes.a.value).toBe(10);
    expect(r.tree?.genes.b.value).toBe(20);
    expect(r.base).toBe(A.commit);
    expect(r.treeHash).toBeDefined();
    // Merged tree got persisted.
    expect(await objs.has(r.treeHash!)).toBe(true);
  });

  it('surfaces conflicts and does not persist a tree', async () => {
    const objs = new MemoryObjectStore();
    const refs = new MemoryRefStore();
    const A = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 1 } }), branch: 'main', author: 'a', message: 'A', timestamp: TS });
    const ours = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 10 } }), branch: 'main', author: 'a', message: 'ours', timestamp: TS2 });
    await branch(refs, 's', 'dev', A.commit);
    const theirs = await commit(objs, refs, { seed: makeSeed('s', { g: { type: 's', value: 20 } }), branch: 'dev', author: 'a', message: 'theirs', timestamp: TS3 });
    const r = await mergeCommits(objs, { seed_id: 's', ours: ours.commit, theirs: theirs.commit });
    expect(r.clean).toBe(false);
    expect(r.conflicts).toHaveLength(1);
    expect(r.treeHash).toBeUndefined();
  });
});

describe('branch / checkout / ensureRef', () => {
  it('branch refuses to overwrite an existing ref', async () => {
    const refs = new MemoryRefStore();
    await refs.setRef('s', 'main', 'c1');
    await expect(branch(refs, 's', 'main', 'c2')).rejects.toThrow(/already exists/);
  });

  it('checkout sets HEAD; throws if ref missing', async () => {
    const refs = new MemoryRefStore();
    await refs.setRef('s', 'main', 'c1');
    await checkout(refs, 's', 'main');
    expect(await refs.getHead('s')).toBe('main');
    await expect(checkout(refs, 's', 'nope')).rejects.toThrow(/not found/);
  });

  it('ensureRef is idempotent', async () => {
    const refs = new MemoryRefStore();
    await ensureRef(refs, 's', 'main', 'c1');
    await ensureRef(refs, 's', 'main', 'c999'); // must NOT move the ref
    expect((await refs.getRef('s', 'main'))?.commit).toBe('c1');
  });
});
