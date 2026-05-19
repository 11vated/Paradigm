/**
 * Friend sovereignty — sign + verify FriendSeeds with ECDSA-P256.
 *
 * Phase 1 (5/n): wires `src/lib/friend` into the existing sovereignty
 * substrate so every Friend can carry a verifiable proof-of-ownership
 * receipt.
 *
 * Contract:
 *   - The signature covers the canonical JSON of the friend with the
 *     `sovereignty` field itself removed (chicken-and-egg).
 *   - The signature does NOT cover `signedAt` (wall-clock metadata).
 *   - Same friend + same key → same payloadHash. Same payload + same key
 *     → cryptographically distinct signatures (ECDSA includes randomness),
 *     but ALL of them verify against the same public key.
 *
 * Keys are exchanged as JWK strings (JSON Web Keys), which is the format
 * crypto.subtle expects and the cleanest portable format for HTTP APIs.
 */

import crypto from 'crypto';
import type { FriendSeedData, FriendSovereignty } from './types';

const ALG_NAME = 'ECDSA';
const ALG_CURVE = 'P-256';
const ALG_HASH = 'SHA-256';
const ALG_ID = 'ECDSA-P256-SHA256' as const;

// ─── Key management ────────────────────────────────────────────────────────

export interface FriendKeyPair {
  /** Public key as a JWK JSON string. */
  publicKey: string;
  /** Private key as a JWK JSON string. KEEP SECRET. */
  privateKey: string;
}

/**
 * Generate a fresh ECDSA-P256 keypair for signing Friends.
 *
 * NOTE: uses `crypto.subtle.generateKey` which IS an entropy source.
 * This is deliberate — keypairs MUST be unguessable. This function is
 * NOT inside the determinism boundary (src/lib/friend, not src/lib/kernel).
 */
export async function generateFriendKeyPair(): Promise<FriendKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    { name: ALG_NAME, namedCurve: ALG_CURVE },
    true,
    ['sign', 'verify'],
  );
  const [pubJwk, privJwk] = await Promise.all([
    crypto.subtle.exportKey('jwk', keyPair.publicKey),
    crypto.subtle.exportKey('jwk', keyPair.privateKey),
  ]);
  return {
    publicKey: JSON.stringify(pubJwk),
    privateKey: JSON.stringify(privJwk),
  };
}

async function importPrivateKey(jwk: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    JSON.parse(jwk),
    { name: ALG_NAME, namedCurve: ALG_CURVE },
    false,
    ['sign'],
  );
}

async function importPublicKey(jwk: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    JSON.parse(jwk),
    { name: ALG_NAME, namedCurve: ALG_CURVE },
    false,
    ['verify'],
  );
}

// ─── Canonicalization ──────────────────────────────────────────────────────

/**
 * Produce the canonical JSON for signing. Strips the `sovereignty` field
 * (otherwise we'd sign over a value that depends on the signature) and
 * sorts every object's keys lexicographically at every depth.
 */
export function canonicalFriendJson(friend: FriendSeedData): string {
  const stripped: Partial<FriendSeedData> = { ...friend };
  delete stripped.sovereignty;
  return canonicalJson(stripped);
}

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return JSON.stringify(value ?? null);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('canonicalFriendJson: non-finite number');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalJson).join(',') + ']';
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map((k) =>
    JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k]),
  ).join(',') + '}';
}

/**
 * SHA-256 hex of the canonical JSON. Stable; can be used as a fingerprint
 * for the seed's signed identity.
 */
export function friendPayloadHash(friend: FriendSeedData): string {
  const canonical = canonicalFriendJson(friend);
  return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
}

// ─── Sign + verify ─────────────────────────────────────────────────────────

/**
 * Sign a FriendSeed, returning a new copy of the seed with a populated
 * `sovereignty` field. The input is never mutated.
 */
export async function signFriendSeed(
  friend: FriendSeedData,
  privateKeyJwk: string,
  publicKeyJwk: string,
): Promise<FriendSeedData> {
  const canonical = canonicalFriendJson(friend);
  const payloadHash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  const privKey = await importPrivateKey(privateKeyJwk);
  const sigBuf = await crypto.subtle.sign(
    { name: ALG_NAME, hash: { name: ALG_HASH } },
    privKey,
    Buffer.from(canonical, 'utf8'),
  );
  const signature = Buffer.from(sigBuf).toString('base64');
  const sovereignty: FriendSovereignty = {
    author: publicKeyJwk,
    signature,
    algorithm: ALG_ID,
    signedAt: new Date().toISOString(),
    payloadHash,
  };
  return { ...friend, sovereignty };
}

export interface VerifyResult {
  valid: boolean;
  /** When invalid, a human-readable reason. */
  reason?: string;
  /** Echoes the payloadHash that was checked. */
  payloadHash: string;
  /** Echoes the author public key. */
  author?: string;
}

/**
 * Verify a FriendSeed's sovereignty receipt. Returns valid=false rather
 * than throwing on malformed/missing receipts — callers can decide policy.
 */
export async function verifyFriendSovereignty(
  friend: FriendSeedData,
): Promise<VerifyResult> {
  if (!friend.sovereignty) {
    return { valid: false, reason: 'no sovereignty receipt present', payloadHash: '' };
  }
  const sov = friend.sovereignty;
  if (sov.algorithm !== ALG_ID) {
    return {
      valid: false,
      reason: `unsupported algorithm: ${sov.algorithm}`,
      payloadHash: sov.payloadHash,
      author: sov.author,
    };
  }
  const canonical = canonicalFriendJson(friend);
  const computedHash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
  if (computedHash !== sov.payloadHash) {
    return {
      valid: false,
      reason: 'payload hash mismatch — friend has been modified since signing',
      payloadHash: computedHash,
      author: sov.author,
    };
  }
  try {
    const pubKey = await importPublicKey(sov.author);
    const sigBuf = Buffer.from(sov.signature, 'base64');
    const ok = await crypto.subtle.verify(
      { name: ALG_NAME, hash: { name: ALG_HASH } },
      pubKey,
      sigBuf,
      Buffer.from(canonical, 'utf8'),
    );
    return ok
      ? { valid: true, payloadHash: computedHash, author: sov.author }
      : { valid: false, reason: 'signature verification failed', payloadHash: computedHash, author: sov.author };
  } catch (err) {
    return {
      valid: false,
      reason: `signature check threw: ${(err as Error).message}`,
      payloadHash: computedHash,
      author: sov.author,
    };
  }
}
