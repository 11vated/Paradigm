/**
 * File-backed store: persistence, atomicity, and ref-delete semantics.
 *
 * These use a fresh tmp dir per test so nothing leaks between runs. The
 * atomic-write property is tested indirectly: write → flush → close → reload
 * must round-trip without loss.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { JsonObjectStore, JsonRefStore, initFileVcs } from '../../src/lib/vcs/json-backed-store.js';
import type { SeedTree, SeedCommit } from '../../src/lib/vcs/objects.js';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vcs-json-'));
});

afterEach(() => {
  if (tmp && fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
});

const tree: SeedTree = {
  kind: 'tree', version: 1, domain: 'audio', name: 'wave',
  genes: { amp: { type: 's', value: 0.5 } },
};

const ccommit: SeedCommit = {
  kind: 'commit', version: 1, tree: 'a'.repeat(64), parents: [],
  author: 'alice', timestamp: '2026-04-14T00:00:00Z', message: 'init', seed_id: 's1',
};

describe('JsonObjectStore', () => {
  it('persists objects across reload', async () => {
    const s1 = new JsonObjectStore(tmp);
    s1.init();
    await s1.put('h1', tree);
    await s1.put('h2', ccommit);
    s1.close(); // flushes

    const s2 = new JsonObjectStore(tmp);
    s2.init();
    expect(await s2.get('h1')).toEqual(tree);
    expect(await s2.get('h2')).toEqual(ccommit);
    expect(await s2.listHashes()).toEqual(['h1', 'h2']);
    s2.close();
  });

  it('put is idempotent on same hash across reloads', async () => {
    const s1 = new JsonObjectStore(tmp);
    s1.init();
    await s1.put('h', tree);
    s1.close();

    const s2 = new JsonObjectStore(tmp);
    s2.init();
    await s2.put('h', tree); // should not duplicate
    expect((await s2.listHashes()).filter((h) => h === 'h').length).toBe(1);
    s2.close();
  });

  it('getCommit/getTree kind-checks persist', async () => {
    const s = new JsonObjectStore(tmp);
    s.init();
    await s.put('t', tree);
    await s.put('c', ccommit);
    await expect(s.getCommit('t')).rejects.toThrow(/expected commit/);
    await expect(s.getTree('c')).rejects.toThrow(/expected tree/);
    s.close();
  });

  it('writes a file on flush and reads it back', async () => {
    const s = new JsonObjectStore(tmp);
    s.init();
    await s.put('h', tree);
    s.flush();
    const raw = fs.readFileSync(path.join(tmp, 'vcs-objects.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.order).toEqual(['h']);
    expect(parsed.objects.h).toEqual(tree);
    s.close();
  });
});

describe('JsonRefStore', () => {
  it('persists refs and heads across reload', async () => {
    const s1 = new JsonRefStore(tmp);
    s1.init();
    await s1.setRef('seed-1', 'main', 'c1', '2026-04-14T00:00:00Z');
    await s1.setHead('seed-1', 'main');
    s1.close();

    const s2 = new JsonRefStore(tmp);
    s2.init();
    expect((await s2.getRef('seed-1', 'main'))?.commit).toBe('c1');
    expect(await s2.getHead('seed-1')).toBe('main');
    s2.close();
  });

  it('deleteRef clears HEAD when the HEAD pointed at the deleted ref', async () => {
    const s = new JsonRefStore(tmp);
    s.init();
    await s.setRef('seed-1', 'main', 'c1');
    await s.setHead('seed-1', 'main');
    expect(await s.deleteRef('seed-1', 'main')).toBe(true);
    expect(await s.getHead('seed-1')).toBeNull();
    s.close();
  });

  it('deleteRef does NOT clear HEAD when HEAD points at a different ref', async () => {
    const s = new JsonRefStore(tmp);
    s.init();
    await s.setRef('seed-1', 'main', 'c1');
    await s.setRef('seed-1', 'dev', 'c2');
    await s.setHead('seed-1', 'main');
    expect(await s.deleteRef('seed-1', 'dev')).toBe(true);
    expect(await s.getHead('seed-1')).toBe('main');
    s.close();
  });

  it('listRefs sorted newest first survives reload', async () => {
    const s1 = new JsonRefStore(tmp);
    s1.init();
    await s1.setRef('seed-1', 'a', 'ca', '2026-04-14T01:00:00Z');
    await s1.setRef('seed-1', 'b', 'cb', '2026-04-14T03:00:00Z');
    await s1.setRef('seed-1', 'c', 'cc', '2026-04-14T02:00:00Z');
    s1.close();

    const s2 = new JsonRefStore(tmp);
    s2.init();
    const list = await s2.listRefs('seed-1');
    expect(list.map((r) => r.name)).toEqual(['b', 'c', 'a']);
    s2.close();
  });
});

describe('initFileVcs', () => {
  it('returns ready-to-use object and ref stores in the same dir', async () => {
    const { objects, refs } = initFileVcs(tmp);
    await objects.put('h', tree);
    await refs.setRef('s', 'main', 'h');
    objects.close();
    refs.close();

    // reopen and confirm both survived
    const r2 = initFileVcs(tmp);
    expect(await r2.objects.get('h')).toEqual(tree);
    expect((await r2.refs.getRef('s', 'main'))?.commit).toBe('h');
    r2.objects.close();
    r2.refs.close();
  });
});
