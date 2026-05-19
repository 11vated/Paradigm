/**
 * FriendStore tests — persistence, lineage queries, atomic writes.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  FriendStore,
  __resetFriendStoreForTests,
  createFriendSeed,
  breedFriends,
  mutateFriend,
} from '@/lib/friend';

let tmpdir: string;
let store: FriendStore;

beforeEach(async () => {
  tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'friend-store-'));
  __resetFriendStoreForTests();
  store = new FriendStore(tmpdir);
  await store.load();
});

afterEach(async () => {
  await fs.rm(tmpdir, { recursive: true, force: true });
});

describe('FriendStore — basic CRUD', () => {
  it('starts empty', () => {
    expect(store.count()).toBe(0);
    expect(store.list()).toEqual([]);
  });

  it('adds and retrieves a friend', async () => {
    const f = createFriendSeed('test-1');
    await store.add(f);
    expect(store.count()).toBe(1);
    expect(store.get(f.id)?.name).toBe(f.name);
    expect(store.has(f.id)).toBe(true);
  });

  it('add is idempotent (same id → no duplicate)', async () => {
    const f = createFriendSeed('idempotent');
    await store.add(f);
    await store.add(f);
    await store.add(f);
    expect(store.count()).toBe(1);
  });

  it('removes a friend', async () => {
    const f = createFriendSeed('to-delete');
    await store.add(f);
    const removed = await store.remove(f.id);
    expect(removed).toBe(true);
    expect(store.has(f.id)).toBe(false);
    expect(store.count()).toBe(0);
  });

  it('remove returns false for unknown id', async () => {
    const removed = await store.remove('nonexistent');
    expect(removed).toBe(false);
  });
});

describe('FriendStore — persistence', () => {
  it('persists across reload', async () => {
    const f1 = createFriendSeed('persist-1');
    const f2 = createFriendSeed('persist-2');
    await store.add(f1);
    await store.add(f2);
    await store.flush();

    // New store instance, same dir.
    const store2 = new FriendStore(tmpdir);
    await store2.load();
    expect(store2.count()).toBe(2);
    expect(store2.get(f1.id)?.name).toBe(f1.name);
    expect(store2.get(f2.id)?.name).toBe(f2.name);
  });

  it('handles non-existent file gracefully on first load', async () => {
    const freshDir = await fs.mkdtemp(path.join(os.tmpdir(), 'friend-empty-'));
    const fresh = new FriendStore(freshDir);
    await fresh.load();
    expect(fresh.count()).toBe(0);
    await fs.rm(freshDir, { recursive: true });
  });

  it('atomic write — partial file never observed', async () => {
    const f = createFriendSeed('atomic');
    await store.add(f);
    await store.flush();
    const raw = await fs.readFile(path.join(tmpdir, 'friends.json'), 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(1);
  });
});

describe('FriendStore — list + filter', () => {
  it('pagination: offset + limit', async () => {
    for (let i = 0; i < 25; i++) await store.add(createFriendSeed(`page-${i}`));
    expect(store.list({ offset: 0, limit: 10 })).toHaveLength(10);
    expect(store.list({ offset: 20, limit: 10 })).toHaveLength(5);
    expect(store.list({ offset: 100 })).toHaveLength(0);
  });

  it('filter by operator', async () => {
    const a = createFriendSeed('op-a');
    const b = createFriendSeed('op-b');
    const child = breedFriends(a, b, 'op-test');
    const mutant = mutateFriend(a, 0.2, 'op-mutant');
    await store.add(a);
    await store.add(b);
    await store.add(child);
    await store.add(mutant);
    expect(store.list({ operator: 'genesis' })).toHaveLength(2);
    expect(store.list({ operator: 'breed' })).toHaveLength(1);
    expect(store.list({ operator: 'mutate' })).toHaveLength(1);
  });
});

describe('FriendStore — lineage', () => {
  it('tracks parents and children', async () => {
    const a = createFriendSeed('lineage-a');
    const b = createFriendSeed('lineage-b');
    const child = breedFriends(a, b, 'l1');
    const grandchild = breedFriends(child, a, 'l2');
    await store.add(a);
    await store.add(b);
    await store.add(child);
    await store.add(grandchild);

    const lineageOfChild = store.lineage(child.id);
    expect(lineageOfChild).not.toBeNull();
    expect(lineageOfChild!.ancestors.map((n) => n.id).sort()).toEqual([a.id, b.id].sort());
    expect(lineageOfChild!.descendants.map((n) => n.id)).toContain(grandchild.id);

    const lineageOfA = store.lineage(a.id);
    expect(lineageOfA!.descendants.map((n) => n.id).sort()).toEqual([child.id, grandchild.id].sort());
    expect(lineageOfA!.ancestors).toEqual([]);
  });

  it('lineage returns null for unknown id', () => {
    expect(store.lineage('does-not-exist')).toBeNull();
  });

  it('respects maxDepth', async () => {
    let prev = createFriendSeed('chain-0');
    await store.add(prev);
    for (let i = 1; i <= 5; i++) {
      const next = mutateFriend(prev, 0.1, `chain-${i}`);
      await store.add(next);
      prev = next;
    }
    const last = prev;
    const shallow = store.lineage(last.id, 2);
    expect(shallow!.ancestors.length).toBe(2);
    const deep = store.lineage(last.id, 10);
    expect(deep!.ancestors.length).toBe(5);
  });
});

describe('FriendStore — stats', () => {
  it('reports counts by operator and max generation', async () => {
    const a = createFriendSeed('s-a');
    const b = createFriendSeed('s-b');
    const child = breedFriends(a, b, 's1');
    const grandchild = mutateFriend(child, 0.1, 's2');
    await store.add(a);
    await store.add(b);
    await store.add(child);
    await store.add(grandchild);

    const stats = store.stats();
    expect(stats.count).toBe(4);
    expect(stats.genesisCount).toBe(2);
    expect(stats.bredCount).toBe(1);
    expect(stats.mutatedCount).toBe(1);
    expect(stats.maxGeneration).toBe(2);
  });
});
