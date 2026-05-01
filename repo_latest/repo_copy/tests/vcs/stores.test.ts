/**
 * In-memory store tests.
 *
 * These pin the invariants the file-backed store inherits: put is idempotent,
 * listHashes is insertion-ordered (so log walks are stable across runs), refs
 * are namespaced by seed_id, and listRefs is sorted newest-first.
 */
import { describe, it, expect } from 'vitest';
import { MemoryObjectStore, MemoryRefStore } from '../../src/lib/vcs/stores.js';
import type { SeedTree, SeedCommit } from '../../src/lib/vcs/objects.js';

const sampleTree: SeedTree = {
  kind: 'tree',
  version: 1,
  domain: 'audio',
  name: 'wave',
  genes: { amp: { type: 'scalar', value: 0.5 } },
};

const sampleCommit: SeedCommit = {
  kind: 'commit',
  version: 1,
  tree: 'a'.repeat(64),
  parents: [],
  author: 'alice',
  timestamp: '2026-04-14T00:00:00Z',
  message: 'init',
  seed_id: 'seed-1',
};

describe('MemoryObjectStore', () => {
  it('put+get round-trips both kinds', async () => {
    const s = new MemoryObjectStore();
    await s.put('tree1', sampleTree);
    await s.put('commit1', sampleCommit);
    expect(await s.get('tree1')).toEqual(sampleTree);
    expect(await s.get('commit1')).toEqual(sampleCommit);
  });

  it('get returns null for missing hashes', async () => {
    const s = new MemoryObjectStore();
    expect(await s.get('nope')).toBeNull();
    expect(await s.has('nope')).toBe(false);
  });

  it('put is idempotent on the same hash', async () => {
    const s = new MemoryObjectStore();
    await s.put('h', sampleTree);
    await s.put('h', sampleTree);
    expect((await s.listHashes()).filter((x) => x === 'h').length).toBe(1);
  });

  it('listHashes preserves insertion order', async () => {
    const s = new MemoryObjectStore();
    await s.put('c', sampleTree);
    await s.put('a', sampleTree);
    await s.put('b', sampleTree);
    expect(await s.listHashes()).toEqual(['c', 'a', 'b']);
  });

  it('getCommit throws when hash resolves to a tree', async () => {
    const s = new MemoryObjectStore();
    await s.put('h', sampleTree);
    await expect(s.getCommit('h')).rejects.toThrow(/expected commit/);
  });

  it('getTree throws when hash resolves to a commit', async () => {
    const s = new MemoryObjectStore();
    await s.put('h', sampleCommit);
    await expect(s.getTree('h')).rejects.toThrow(/expected tree/);
  });

  it('typed accessors return null for unknown hashes (not throw)', async () => {
    const s = new MemoryObjectStore();
    expect(await s.getCommit('missing')).toBeNull();
    expect(await s.getTree('missing')).toBeNull();
  });
});

describe('MemoryRefStore', () => {
  it('setRef+getRef round-trips and records seed_id/name', async () => {
    const s = new MemoryRefStore();
    await s.setRef('seed-1', 'main', 'c1', '2026-04-14T00:00:00Z');
    const r = await s.getRef('seed-1', 'main');
    expect(r).toMatchObject({ seed_id: 'seed-1', name: 'main', commit: 'c1', updated_at: '2026-04-14T00:00:00Z' });
  });

  it('refs are namespaced by seed_id', async () => {
    const s = new MemoryRefStore();
    await s.setRef('seed-1', 'main', 'c1');
    await s.setRef('seed-2', 'main', 'c2');
    expect((await s.getRef('seed-1', 'main'))?.commit).toBe('c1');
    expect((await s.getRef('seed-2', 'main'))?.commit).toBe('c2');
  });

  it('listRefs returns only the scope seed, sorted newest first', async () => {
    const s = new MemoryRefStore();
    await s.setRef('seed-1', 'main', 'c1', '2026-04-14T01:00:00Z');
    await s.setRef('seed-1', 'dev', 'c2', '2026-04-14T02:00:00Z');
    await s.setRef('seed-1', 'hotfix', 'c3', '2026-04-14T00:30:00Z');
    await s.setRef('seed-2', 'main', 'other', '2026-04-14T03:00:00Z');
    const list = await s.listRefs('seed-1');
    expect(list.map((r) => r.name)).toEqual(['dev', 'main', 'hotfix']);
  });

  it('deleteRef returns true when it deleted, false when it did not exist', async () => {
    const s = new MemoryRefStore();
    await s.setRef('seed-1', 'main', 'c1');
    expect(await s.deleteRef('seed-1', 'main')).toBe(true);
    expect(await s.deleteRef('seed-1', 'main')).toBe(false);
    expect(await s.getRef('seed-1', 'main')).toBeNull();
  });

  it('setHead/getHead are per-seed', async () => {
    const s = new MemoryRefStore();
    await s.setHead('seed-1', 'main');
    await s.setHead('seed-2', 'dev');
    expect(await s.getHead('seed-1')).toBe('main');
    expect(await s.getHead('seed-2')).toBe('dev');
    expect(await s.getHead('seed-3')).toBeNull();
  });

  it('setRef uses "now" string when passed, else real ISO time', async () => {
    const s = new MemoryRefStore();
    await s.setRef('seed-1', 'x', 'c', '2020-01-01T00:00:00Z');
    expect((await s.getRef('seed-1', 'x'))?.updated_at).toBe('2020-01-01T00:00:00Z');
    await s.setRef('seed-1', 'y', 'c');
    const y = await s.getRef('seed-1', 'y');
    // ISO 8601 with ms and Z — sanity shape, not the exact value
    expect(y?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
