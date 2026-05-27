/**
 * Seed License — Doctrine v2 Part VIII.18 v1 ("Universe licensing").
 *
 * A signed, content-addressable license that travels WITH a seed
 * through federation. The license is the canonical statement of
 * "what may be done with this seed, by whom, at what cost." The
 * recipient operator enforces it locally; the license itself is
 * signed by the custodian so its terms cannot be silently mutated
 * in transit.
 *
 * Six canonical archetypes (composable; the custom type lets you
 * mix dimensions):
 *
 *   public-domain         remix ✓ commercial ✓ attribution ✗
 *   attribution           remix ✓ commercial ✓ attribution ✓
 *   attribution-share     remix ✓ commercial ✓ attribution ✓ derivative must inherit
 *   noncommercial         remix ✓ commercial ✗ attribution ✓
 *   commercial-royalty    remix ✓ commercial ✓ (with royaltyBp)
 *   all-rights-reserved   remix ✗ commercial ✗ attribution ✓
 *   custom                opaque — terms text is binding
 *
 * Pure / deterministic / IO-free.
 */
import { createHash } from 'node:crypto';
import { kernelNow } from './clock';

export const LICENSE_SCHEMA = 'https://paradigm.ai/schema/seed-license/v1' as const;

export type LicenseType =
  | 'public-domain'
  | 'attribution'
  | 'attribution-share-alike'
  | 'noncommercial'
  | 'commercial-royalty'
  | 'all-rights-reserved'
  | 'custom';

export interface SeedLicense {
  readonly schema: typeof LICENSE_SCHEMA;
  readonly type: LicenseType;
  readonly version: string;
  /** Custodian (author / licensor) address. */
  readonly custodian: string;
  /** Attribution line caller must include (when required). */
  readonly attribution?: { required: boolean; canonicalLine?: string };
  /** Commercial-resale royalty (basis points; integer 0..10000). */
  readonly royaltyBp?: number;
  /** Geographic / jurisdictional restrictions; empty = worldwide. */
  readonly territories?: ReadonlyArray<string>;
  /** ISO-8601 expiry; missing = perpetual. */
  readonly expires?: string;
  /** Free-text terms (binding when type === 'custom'). */
  readonly terms?: string;
  /** Canonical hash of the license body (sans signature). */
  readonly manifest: string;
  /** ECDSA signature over `manifest` by `custodian`. */
  readonly signature?: { algorithm: 'ECDSA-P256'; signature: string; signed_at: string };
}

export type IntendedUse =
  | 'view'                  // private viewing
  | 'public-display'        // showing to others, non-commercial
  | 'remix'                 // deriving a child seed
  | 'commercial-display'    // commercial display, no resale
  | 'commercial-resale'     // commercial sale of original or derivative
  | 'redistribute';         // sharing as-is (federation)

export interface LicenseEvaluation {
  readonly allowed: boolean;
  /** Conditions the caller must satisfy for `allowed` to actually apply. */
  readonly requirements: ReadonlyArray<string>;
  /** Royalty basis points the use must pay (0 if none). */
  readonly royaltyBp: number;
  /** Reason for a denial, or '' if allowed. */
  readonly reason: string;
}

/** Pure canonical JSON (recursively sorted keys; undefined keys dropped to match JSON.stringify wire behavior). */
function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj ?? null);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).filter((k) => record[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(record[k])).join(',') + '}';
}

/** Compute a license's canonical manifest hash from its body (signature excluded). */
export function licenseManifestOf(
  body: Omit<SeedLicense, 'manifest' | 'signature'>,
): string {
  return createHash('sha256').update(canonicalize(body)).digest('hex');
}

/**
 * Build a license body with its manifest. The signature must be
 * computed separately (the ECDSA signer lives in `src/lib/sovereignty`)
 * and attached by the caller before publishing.
 */
export function buildLicense(
  body: Omit<SeedLicense, 'schema' | 'manifest' | 'signature'>,
): Omit<SeedLicense, 'signature'> {
  const withSchema = { ...body, schema: LICENSE_SCHEMA } as Omit<SeedLicense, 'manifest' | 'signature'>;
  return { ...withSchema, manifest: licenseManifestOf(withSchema) };
}

/**
 * Pure license evaluator. Same license + same use ⇒ same verdict, on
 * any operator, in any process. No clock side-effects (caller supplies
 * `now` if expiry matters).
 */
export function evaluateLicense(
  license: SeedLicense,
  intendedUse: IntendedUse,
  ctx: { now?: Date | string } = {},
): LicenseEvaluation {
  // 1. Expiry check.
  if (license.expires) {
    const expiry = new Date(license.expires).getTime();
    const nowMs = (ctx.now instanceof Date)
      ? ctx.now.getTime()
      : (ctx.now ? new Date(ctx.now).getTime() : kernelNow());
    if (Number.isFinite(expiry) && nowMs > expiry) {
      return {
        allowed: false,
        requirements: [],
        royaltyBp: 0,
        reason: `license expired ${license.expires}`,
      };
    }
  }

  const reqs: string[] = [];
  if (license.attribution?.required) {
    const line = license.attribution.canonicalLine ?? `attribution: ${license.custodian}`;
    reqs.push(`attribution: include "${line}"`);
  }

  // 2. Type-driven decision matrix.
  switch (license.type) {
    case 'public-domain':
      return ok([], 0);

    case 'attribution':
      return ok(reqs, 0);

    case 'attribution-share-alike':
      if (intendedUse === 'remix') {
        return ok([...reqs, `derivative must inherit license type "${license.type}"`], 0);
      }
      return ok(reqs, 0);

    case 'noncommercial':
      if (intendedUse === 'commercial-display' || intendedUse === 'commercial-resale') {
        return deny('noncommercial license forbids commercial use');
      }
      return ok(reqs, 0);

    case 'commercial-royalty': {
      const rbp = clampBp(license.royaltyBp ?? 0);
      if (intendedUse === 'commercial-resale' || intendedUse === 'commercial-display') {
        return ok([...reqs, `pay royalty: ${rbp} basis points (${(rbp / 100).toFixed(2)}%)`], rbp);
      }
      return ok(reqs, 0);
    }

    case 'all-rights-reserved':
      if (intendedUse === 'view' || intendedUse === 'redistribute') {
        return ok(reqs, 0);
      }
      return deny('all-rights-reserved: only view + redistribute permitted');

    case 'custom':
      // Conservative: 'custom' requires human interpretation; default-deny
      // unless terms are explicitly empty (treat as public-domain).
      if (!license.terms || !license.terms.trim()) {
        return ok([], 0);
      }
      return deny(`custom license requires manual review: "${truncate(license.terms, 80)}"`);
  }

  function ok(requirements: string[], royaltyBp: number): LicenseEvaluation {
    return { allowed: true, requirements, royaltyBp, reason: '' };
  }
  function deny(reason: string): LicenseEvaluation {
    return { allowed: false, requirements: [], royaltyBp: 0, reason };
  }
}

/**
 * Cheap structural validity check. Does NOT verify the signature
 * (that lives in `src/lib/sovereignty`). Use before evaluating.
 */
export function isStructurallyValid(license: unknown): license is SeedLicense {
  if (!license || typeof license !== 'object') return false;
  const l = license as Record<string, unknown>;
  if (l.schema !== LICENSE_SCHEMA) return false;
  if (typeof l.type !== 'string') return false;
  if (typeof l.custodian !== 'string' || l.custodian.length === 0) return false;
  if (typeof l.manifest !== 'string' || !/^[0-9a-f]{64}$/.test(l.manifest)) return false;
  // Verify the manifest is self-consistent.
  const { manifest, signature, ...body } = l;
  void signature;
  const recomputed = licenseManifestOf(body as Omit<SeedLicense, 'manifest' | 'signature'>);
  return recomputed === manifest;
}

function clampBp(bp: number): number {
  if (!Number.isFinite(bp)) return 0;
  return Math.max(0, Math.min(10000, Math.floor(bp)));
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
