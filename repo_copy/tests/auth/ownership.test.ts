/**
 * Seed ownership + authorization tests.
 *
 * These pin the policy: unowned seeds are freely mutable (legacy); owned seeds
 * lock to their owner or admin. Also covers the Express-flavoured wrappers
 * and the commit-author binding that prevents authenticated users from
 * forging another user's username in a commit.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  checkSeedMutation,
  ownerFromUser,
  addOwnerIfAuthed,
  transferOwnership,
  authorizeSeedMutation,
  resolveCommitAuthor,
  type SeedOwner,
  type AuthedUser,
  type OwnedLike,
} from '../../src/lib/auth/ownership.js';

const alice: AuthedUser = { sub: 'u-alice', username: 'alice', role: 'user' };
const bob: AuthedUser = { sub: 'u-bob', username: 'bob', role: 'user' };
const root: AuthedUser = { sub: 'u-root', username: 'root', role: 'admin' };

const owner = (u: AuthedUser): SeedOwner => ({
  userId: u.sub,
  username: u.username,
  assignedAt: '2026-04-14T00:00:00Z',
});

// Lightweight mock req/res that captures status + json.
function mockRes() {
  const state: { status?: number; body?: unknown } = {};
  const res: any = {
    status(code: number) { state.status = code; return res; },
    json(body: unknown) { state.body = body; return res; },
  };
  return { res, state };
}

describe('checkSeedMutation', () => {
  it('allows anyone on unowned seeds (legacy compat)', () => {
    expect(checkSeedMutation({ id: 's1' }, undefined)).toEqual({ allowed: true, reason: 'unowned' });
    expect(checkSeedMutation({ id: 's1' }, alice)).toEqual({ allowed: true, reason: 'unowned' });
  });

  it('allows the owner on owned seeds', () => {
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    expect(checkSeedMutation(seed, alice)).toEqual({ allowed: true, reason: 'owner' });
  });

  it('denies non-owners with 403', () => {
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    const r = checkSeedMutation(seed, bob);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.status).toBe(403);
      expect(r.reason).toMatch(/not seed owner/i);
    }
  });

  it('denies anonymous with 401 on owned seeds', () => {
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    const r = checkSeedMutation(seed, null);
    expect(r.allowed).toBe(false);
    if (!r.allowed) {
      expect(r.status).toBe(401);
    }
  });

  it('admin overrides ownership', () => {
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    expect(checkSeedMutation(seed, root)).toEqual({ allowed: true, reason: 'admin' });
  });

  it('denies missing seed', () => {
    const r = checkSeedMutation(null, alice);
    expect(r.allowed).toBe(false);
  });
});

describe('addOwnerIfAuthed', () => {
  it('stamps owner when user present', () => {
    const seed: OwnedLike = { id: 's1' };
    addOwnerIfAuthed(seed, alice);
    expect(seed.$owner?.userId).toBe(alice.sub);
    expect(seed.$owner?.username).toBe(alice.username);
  });

  it('is a no-op when no user', () => {
    const seed: OwnedLike = { id: 's1' };
    addOwnerIfAuthed(seed, null);
    addOwnerIfAuthed(seed, undefined);
    expect(seed.$owner).toBeUndefined();
  });

  it('does NOT overwrite existing ownership', () => {
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    addOwnerIfAuthed(seed, bob);
    expect(seed.$owner?.userId).toBe(alice.sub); // unchanged
  });
});

describe('ownerFromUser', () => {
  it('builds owner with current ISO time when now is omitted', () => {
    const o = ownerFromUser(alice);
    expect(o.userId).toBe(alice.sub);
    expect(o.username).toBe(alice.username);
    expect(o.assignedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('uses supplied now for determinism', () => {
    const o = ownerFromUser(alice, '2026-01-01T00:00:00Z');
    expect(o.assignedAt).toBe('2026-01-01T00:00:00Z');
  });
});

describe('transferOwnership', () => {
  it('owner can transfer to another user', () => {
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    const r = transferOwnership(seed, alice, bob);
    expect(r.allowed).toBe(true);
    expect(seed.$owner?.userId).toBe(bob.sub);
  });

  it('admin can transfer anyone\'s seed', () => {
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    transferOwnership(seed, root, bob);
    expect(seed.$owner?.userId).toBe(bob.sub);
  });

  it('non-owner cannot transfer', () => {
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    const r = transferOwnership(seed, bob, bob);
    expect(r.allowed).toBe(false);
    expect(seed.$owner?.userId).toBe(alice.sub); // unchanged
  });
});

describe('authorizeSeedMutation (Express wrapper)', () => {
  it('returns reason and does not touch res on allow', () => {
    const { res, state } = mockRes();
    const req: any = { user: alice };
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    const result = authorizeSeedMutation(seed, req, res, 'seed.delete');
    expect(result).toBe('owner');
    expect(state.status).toBeUndefined();
  });

  it('writes 403 json on non-owner deny', () => {
    const { res, state } = mockRes();
    const req: any = { user: bob };
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    const result = authorizeSeedMutation(seed, req, res, 'seed.delete');
    expect(result).toBeNull();
    expect(state.status).toBe(403);
    expect(state.body).toMatchObject({ detail: expect.stringContaining('not seed owner') });
  });

  it('writes 401 json on anonymous deny', () => {
    const { res, state } = mockRes();
    const req: any = {};
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    const result = authorizeSeedMutation(seed, req, res, 'seed.delete');
    expect(result).toBeNull();
    expect(state.status).toBe(401);
  });

  it('invokes audit callback on deny', () => {
    const audit = vi.fn();
    const { res } = mockRes();
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    authorizeSeedMutation(seed, { user: bob }, res, 'seed.delete', audit);
    expect(audit).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledWith(
      'authz.deny',
      'seed',
      's1',
      expect.objectContaining({ action: 'seed.delete', status: 403 }),
      expect.anything(),
    );
  });

  it('allows admin override and does not write response', () => {
    const { res, state } = mockRes();
    const seed: OwnedLike = { id: 's1', $owner: owner(alice) };
    const result = authorizeSeedMutation(seed, { user: root }, res, 'seed.delete');
    expect(result).toBe('admin');
    expect(state.status).toBeUndefined();
  });
});

describe('resolveCommitAuthor', () => {
  it('returns authenticated username when body.author omitted', () => {
    const { res } = mockRes();
    const r = resolveCommitAuthor({ user: alice }, res, undefined);
    expect(r).toBe('alice');
  });

  it('accepts matching body.author', () => {
    const { res } = mockRes();
    const r = resolveCommitAuthor({ user: alice }, res, 'alice');
    expect(r).toBe('alice');
  });

  it('rejects mismatched body.author with 400', () => {
    const { res, state } = mockRes();
    const r = resolveCommitAuthor({ user: alice }, res, 'bob');
    expect(r).toBeNull();
    expect(state.status).toBe(400);
    expect(state.body).toMatchObject({ detail: expect.stringContaining('alice') });
  });

  it('permits free-form author for unauthenticated requests (legacy)', () => {
    const { res } = mockRes();
    expect(resolveCommitAuthor({}, res, 'someone')).toBe('someone');
    expect(resolveCommitAuthor({}, res, undefined)).toBe('anonymous');
  });
});
