/**
 * Canonical seed digest (Phase 7).
 *
 * Every sovereignty operation — signing, anchoring on Base L2, pinning to
 * Arweave/IPFS, comparing against on-chain records — depends on one thing:
 * two peers agreeing, byte-for-byte, on *what was hashed*.
 *
 * JSON.stringify() is famously not deterministic: object key order is
 * insertion order, nested objects recurse, and numeric edge cases (NaN,
 * -0, large floats) round-trip poorly. If a seed gets re-serialized between
 * signing and verification — which happens every time it passes through our
 * API — a naive `JSON.stringify(seed)` will not reproduce the same bytes,
 * and the signature verification fails silently.
 *
 * This module defines the canonical form:
 *
 *   1. Sort every object's keys lexicographically.
 *   2. Reject NaN, ±Infinity — sovereignty artifacts must be finite.
 *   3. Represent numbers via their JSON round-trip (ignoring -0 vs 0).
 *   4. Strip app-internal fields — `$hash`, `$owner`, `$lineage.*_timestamp`
 *      — so the digest is stable across deployments and ownership transfers.
 *   5. Hash the resulting UTF-8 bytes with SHA-256.
 *
 * The canonical JSON is itself exposed so callers can use it as EIP-712
 * `message` payload or as the Arweave `data` field verbatim.
 */

import crypto from 'crypto';

export interface CanonicalizedSeed {
  /** The canonical UTF-8 JSON bytes that were hashed. */
  canonicalJson: string;
  /** Hex-encoded SHA-256 of `canonicalJson` (lowercase). */
  digest: string;
  /** The stripped, sorted seed object used to produce the JSON. */
  stripped: unknown;
}

/**
 * Keys at *any* depth whose presence shouldn't affect the canonical digest.
 * These are either ownership/auth metadata (re-stamped on transfer) or
 * previous cached hashes that create chicken-and-egg issues.
 *
 * IMPORTANT: do not add to this list without considering whether the field
 * could meaningfully change the *identity* of the seed. Core genes, domain,
 * name, lineage parents — never strippable.
 */
const STRIPPED_KEYS: ReadonlySet<string> = new Set([
  '$hash',
  '$owner',
  '$sovereignty',
  // Lineage timestamps are wall-clock — strip them inside $lineage below.
]);

/**
 * Keys specifically stripped from `$lineage` so two peers with clock skew
 * can still agree on the digest. The lineage identifiers — parent hashes,
 * generation number — are preserved.
 */
const LINEAGE_STRIP_KEYS: ReadonlySet<string> = new Set([
  'created_at',
  'updated_at',
  'timestamp',
]);

/**
 * Recursively strip and sort the input for canonicalization. Returns `null`
 * for `undefined` (JSON doesn't represent undefined — we replace with null
 * so callers get a predictable round-trip).
 */
function canonicalize(value: unknown, path: string): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`canonicalizeSeed: non-finite number at ${path || '<root>'}`);
    }
    // Normalize -0 → 0 so signatures survive a JSON round trip.
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) {
    return value.map((v, i) => canonicalize(v, `${path}[${i}]`));
  }
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    const isLineage = path === '$lineage';
    const out: Record<string, unknown> = {};
    const keys = Object.keys(v).filter((k) => {
      if (STRIPPED_KEYS.has(k)) return false;
      if (isLineage && LINEAGE_STRIP_KEYS.has(k)) return false;
      return true;
    });
    keys.sort();
    for (const k of keys) {
      out[k] = canonicalize(v[k], path ? `${path}.${k}` : k);
    }
    return out;
  }
  // Functions, symbols, etc. are not representable in sovereignty payloads.
  throw new Error(`canonicalizeSeed: unsupported type ${typeof value} at ${path || '<root>'}`);
}

/**
 * Produce the canonical digest for a seed. Fully deterministic.
 *
 * Two seeds with different app-internal metadata (ownership, cached hash,
 * lineage timestamps) but identical genes will produce the *same* digest
 * — which is exactly what sovereignty verification needs.
 */
export function canonicalizeSeed(seed: unknown): CanonicalizedSeed {
  const stripped = canonicalize(seed, '');
  const canonicalJson = JSON.stringify(stripped);
  const digest = crypto.createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
  return { canonicalJson, digest, stripped };
}

/**
 * Convenience: just the 32-byte hex digest, for callers that only need the
 * hash (e.g. to compare against an on-chain `seedHash(tokenId)`).
 */
export function seedDigestHex(seed: unknown): string {
  return canonicalizeSeed(seed).digest;
}

/**
 * Encode the digest as a 0x-prefixed bytes32 — the form Ethereum ABIs want.
 * Always 66 chars (0x + 64 hex). Never truncated or padded beyond what
 * SHA-256 naturally produces.
 */
export function seedDigestBytes32(seed: unknown): `0x${string}` {
  const h = seedDigestHex(seed);
  // SHA-256 is already 32 bytes / 64 hex chars, so no padding needed.
  return `0x${h}` as `0x${string}`;
}
