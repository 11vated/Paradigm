import { describe, it, expect, beforeEach } from 'vitest';
import { FriendStore } from '@/lib/friend/store';
import { createFriendSeed } from '@/lib/friend';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

async function tmpDir(): Promise<string> {
  const d = await fs.mkdtemp(path.join(os.tmpdir(), 'friend-notes-'));
  return d;
}

describe('FriendStore episodic memory', () => {
  let store: FriendStore;
  let friend: ReturnType<typeof createFriendSeed>;

  beforeEach(async () => {
    const dir = await tmpDir();
    store = new FriendStore(dir);
    await store.load();
    friend = createFriendSeed('nori-notes');
    await store.add(friend);
  });

  it('append + get round-trip', () => {
    store.appendNote(friend.id, { text: 'I am here.', kind: 'user' });
    store.appendNote(friend.id, { text: 'I hear you.', kind: 'friend' });
    const notes = store.getNotes(friend.id);
    expect(notes).toHaveLength(2);
    expect(notes[0].text).toBe('I am here.');
    expect(notes[0].kind).toBe('user');
    expect(notes[0].turn).toBe(0);
    expect(notes[1].turn).toBe(1);
  });

  it('returns [] for unknown id', () => {
    expect(store.getNotes('does-not-exist')).toEqual([]);
  });

  it('returns null when appending to unknown friend', () => {
    expect(store.appendNote('does-not-exist', { text: 'x', kind: 'user' })).toBeNull();
  });

  it('bounded by episodicCapacity (drops oldest)', () => {
    const cap = friend.genes.memory.episodicCapacity;
    for (let i = 0; i < cap + 50; i++) {
      store.appendNote(friend.id, { text: `n${i}`, kind: 'user' });
    }
    const notes = store.getNotes(friend.id);
    expect(notes).toHaveLength(cap);
    expect(notes[0].text).toBe(`n50`);
  });

  it('limit param tail-slices', () => {
    for (let i = 0; i < 10; i++) store.appendNote(friend.id, { text: String(i), kind: 'user' });
    expect(store.getNotes(friend.id, 3).map(n => n.text)).toEqual(['7', '8', '9']);
  });

  it('clearNotes returns count and empties list', () => {
    store.appendNote(friend.id, { text: 'a', kind: 'user' });
    store.appendNote(friend.id, { text: 'b', kind: 'user' });
    expect(store.clearNotes(friend.id)).toBe(2);
    expect(store.getNotes(friend.id)).toEqual([]);
  });
});
