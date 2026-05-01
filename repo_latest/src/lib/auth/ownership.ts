/**
 * Seed ownership and authorization (Phase 3).
 *
 * The auth module (index.ts) answers "who are you?". This module answers
 * "are you allowed to touch this seed?".
 *
 * Policy:
 *   - Seeds without an $owner field are unowned (legacy). Anyone can mutate them.
 *   - Seeds with an $owner field are owned. Only the owner or an admin can mutate.
 *   - Read endpoints are always open; ownership only gates writes.
 *
 * Why backward-compatible (unowned = public): the rest of the codebase has
 * ~40 mutating endpoints and ~500 tests that never attach a token. Flipping to
 * "all writes require auth" in one shot would collapse that. Instead we make
 * ownership opt-in at seed-create time: if the creator is authenticated, we
 * stamp the seed; otherwise it stays legacy. Production can require auth at
 * the create endpoint (via a middleware swap) without this module changing.
 */
import { pinoLogger } from '../logger/index.js';

export interface SeedOwner {
  userId: string;
  username: string;
  /** ISO8601 UTC — when ownership was assigned. Immutable once set. */
  assignedAt: string;
}

/** A seed as seen by the authorization layer. We only care about id + $owner. */
export interface OwnedLike {
  id?: string;
  $owner?: SeedOwner;
}

/** An authenticated user as seen by the authorization layer. */
export interface AuthedUser {
  sub: string;
  username: string;
  role: string;
}

/**
 * Result of an authorization check. A single object with both outcome and
 * reason lets callers log/audit without re-deriving anything.
 */
export type AuthzResult =
  | { allowed: true; reason: 'unowned' | 'owner' | 'admin' }
  | { allowed: false; status: 401 | 403; reason: string };

/**
 * Core decision function. Pure — no logging, no side effects. Callers wrap
 * this with their request/response machinery. Exported separately so unit
 * tests can hammer the rules without mocking Express.
 */
export function checkSeedMutation(seed: OwnedLike | null | undefined, user: AuthedUser | null | undefined): AuthzResult {
  if (!seed) {
    // Caller should usually 404 before getting here. If a non-existent seed
    // is somehow passed through, deny by default.
    return { allowed: false, status: 403, reason: 'seed not found' };
  }

  // Unowned seed — legacy path. Anyone (authed or not) can mutate.
  if (!seed.$owner) {
    return { allowed: true, reason: 'unowned' };
  }

  // From here, seed has an owner → a valid user must be present.
  if (!user) {
    return { allowed: false, status: 401, reason: 'authentication required for owned seed' };
  }

  if (user.role === 'admin') {
    return { allowed: true, reason: 'admin' };
  }

  if (seed.$owner.userId === user.sub) {
    return { allowed: true, reason: 'owner' };
  }

  return { allowed: false, status: 403, reason: 'not seed owner' };
}

/**
 * Build a SeedOwner from an authenticated user. Returns undefined when the
 * user is missing — use `addOwnerIfAuthed` for that branch, this helper is
 * for code paths where we know `user` is present.
 */
export function ownerFromUser(user: AuthedUser, now: string = new Date().toISOString()): SeedOwner {
  return {
    userId: user.sub,
    username: user.username,
    assignedAt: now,
  };
}

/**
 * Attach an owner to a seed only if a user is present. Returns the same seed
 * reference — mutates in place. Safe to call with `undefined` user; becomes a
 * no-op. If the seed already has an owner, we do NOT overwrite (ownership is
 * immutable; use `transferOwnership` explicitly if a transfer is intended).
 */
export function addOwnerIfAuthed<T extends OwnedLike>(seed: T, user: AuthedUser | null | undefined): T {
  if (!user) return seed;
  if (seed.$owner) return seed; // never silently reassign
  seed.$owner = ownerFromUser(user);
  return seed;
}

/**
 * Explicit ownership transfer. Separate function so this action can't happen
 * by accident. Requires: either the current owner OR an admin to initiate.
 */
export function transferOwnership<T extends OwnedLike>(
  seed: T,
  actor: AuthedUser,
  newOwner: AuthedUser,
): AuthzResult {
  const check = checkSeedMutation(seed, actor);
  if (!check.allowed) return check;
  seed.$owner = ownerFromUser(newOwner);
  return { allowed: true, reason: check.reason };
}

// ── Express glue ────────────────────────────────────────────────────────────
//
// Intentionally loose on req/res types — server.ts uses `any` throughout and
// pulling in the full Express types just for this file would force a cascade
// of annotation changes. The behavioural contract is covered by tests.

interface AuditFn {
  (action: string, entityType: string, entityId: string, details: Record<string, unknown>, req: unknown): void;
}

/**
 * Express-flavoured wrapper around checkSeedMutation.
 *
 * On deny, writes the response and returns null. On allow, returns a reason
 * tag for audit logging. Callers must check for `null` and bail early.
 *
 *   const ok = authorizeSeedMutation(seed, req, res, 'seed.mutate');
 *   if (!ok) return;
 *   ...do the thing...
 *
 * We pipe denials through pino so security events are structured and
 * searchable, not only stashed in the JSON audit log.
 */
export function authorizeSeedMutation(
  seed: OwnedLike | null | undefined,
  req: any,
  res: any,
  action: string,
  audit?: AuditFn,
): 'unowned' | 'owner' | 'admin' | null {
  const user: AuthedUser | undefined = req?.user;
  const check = checkSeedMutation(seed, user);

  if (check.allowed === false) {
    pinoLogger.warn(
      {
        action,
        seedId: seed?.id ?? null,
        ownerUserId: seed?.$owner?.userId ?? null,
        actorUserId: user?.sub ?? null,
        actorUsername: user?.username ?? null,
        reason: check.reason,
        status: check.status,
      },
      'authz denied',
    );
    if (audit && seed?.id) {
      audit('authz.deny', 'seed', seed.id, { action, reason: check.reason, status: check.status }, req);
    }
    res.status(check.status).json({ detail: check.reason });
    return null;
  }

  // Only log allows that are non-trivial — admin overrides are security-relevant.
  if (check.reason === 'admin') {
    pinoLogger.info(
      {
        action,
        seedId: seed?.id ?? null,
        ownerUserId: seed?.$owner?.userId ?? null,
        actorUserId: user?.sub ?? null,
        actorUsername: user?.username ?? null,
      },
      'authz admin override',
    );
  }

  return check.reason;
}

/**
 * Ensure the supplied `author` string (if any) matches the authenticated
 * user's username. Prevents a caller from forging a commit's author field
 * while holding another user's seed token.
 *
 * Returns the effective author string to use, or null if the request should
 * be rejected (in which case we've already written the response).
 */
export function resolveCommitAuthor(
  req: any,
  res: any,
  bodyAuthor: unknown,
): string | null {
  const user: AuthedUser | undefined = req?.user;

  if (user) {
    // Authenticated: body.author must either be omitted or exactly match.
    if (typeof bodyAuthor === 'string' && bodyAuthor.length && bodyAuthor !== user.username) {
      pinoLogger.warn(
        { actorUsername: user.username, bodyAuthor },
        'commit author mismatch rejected',
      );
      res.status(400).json({ detail: `author must be "${user.username}" for authenticated commits` });
      return null;
    }
    return user.username;
  }

  // Unauthenticated: permit free-form author (legacy compatibility), else 'anonymous'.
  if (typeof bodyAuthor === 'string' && bodyAuthor.length) return bodyAuthor;
  return 'anonymous';
}
