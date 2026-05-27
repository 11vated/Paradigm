/**
 * Seed Cost — Doctrine v2 Part VIII.20 v0 (marketplace primitive).
 *
 * The unified "what does this cost me, and who do I pay?" answer.
 * Composes license evaluation (Phase 18) + lineage royalty (Phase 17)
 * into a single deterministic verdict any marketplace can call.
 *
 * Input:
 *   - the seed's content-addressable license (already verified)
 *   - the seed's lineage chain (already federated in)
 *   - the buyer's intended use and proposed sale amount
 *
 * Output:
 *   - allowed yes/no with a denial reason
 *   - the requirements the buyer must satisfy (attribution, share-alike…)
 *   - the royalty splits (author + ancestors + platform) for this sale
 *   - the total cost paid (sale + license-imposed royalty surcharge,
 *     if any)
 *   - the manifest hash that ties the whole verdict to an on-chain
 *     anchor
 *
 * Pure / deterministic / IO-free. Same inputs ⇒ same outputs, on any
 * operator, in any process.
 */
import { createHash } from 'node:crypto';
import {
  evaluateLicense,
  type SeedLicense,
  type IntendedUse,
} from './seed-license.js';
import {
  computeLineageRoyalty,
  type LineageNode,
  type LineageResolver,
  type RoyaltySplit,
} from './lineage-royalty.js';

export const SEED_COST_SCHEMA = 'https://paradigm.ai/schema/seed-cost/v1' as const;

export interface SeedCostOpts {
  /** The seed to be acquired. */
  seedId: string;
  /** The seed's signed, federation-transported license. */
  license: SeedLicense;
  /** The buyer's intended use. */
  intendedUse: IntendedUse;
  /** Proposed sale amount in minor units (cents). */
  saleAmountCents: number;
  /** Lineage chain. Must include the root seed. */
  lineage: ReadonlyArray<LineageNode>;
  /** Now, for license-expiry checks. */
  now?: Date | string;
  /** Royalty overrides, passed through to computeLineageRoyalty. */
  platformAddress?: string;
  ancestorShareBp?: number;
  platformShareBp?: number;
  ancestorDecay?: number;
  maxDepth?: number;
}

export interface SeedCostResult {
  readonly schema: typeof SEED_COST_SCHEMA;
  readonly seedId: string;
  readonly allowed: boolean;
  readonly reason: string;
  readonly requirements: ReadonlyArray<string>;
  /** Royalty splits for the sale itself (Phase 17). */
  readonly splits: ReadonlyArray<RoyaltySplit>;
  /** Royalty surcharge imposed by the license (Phase 18, commercial-royalty). */
  readonly licenseRoyaltyBp: number;
  readonly licenseSurchargeCents: number;
  /** Final amount the buyer pays: sale + license surcharge. */
  readonly totalCostCents: number;
  /** sha256(canonical(verdict)) — the on-chain anchor. */
  readonly manifest: string;
}

/** Pure canonical JSON (recursively sorted; undefined keys dropped). */
function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj ?? null);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).filter((k) => record[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(record[k])).join(',') + '}';
}

export async function computeSeedCost(opts: SeedCostOpts): Promise<SeedCostResult> {
  const saleAmountCents = Math.floor(opts.saleAmountCents);
  if (!Number.isFinite(saleAmountCents) || saleAmountCents < 0) {
    throw new RangeError(`saleAmountCents must be a non-negative finite number; got ${opts.saleAmountCents}`);
  }

  // 1. License gate. If denied, we return a stub verdict — no royalty payable.
  const verdict = evaluateLicense(opts.license, opts.intendedUse, { now: opts.now });

  if (!verdict.allowed) {
    return buildResult({
      seedId: opts.seedId,
      allowed: false,
      reason: verdict.reason,
      requirements: [],
      splits: [],
      licenseRoyaltyBp: 0,
      licenseSurchargeCents: 0,
      saleAmountCents,
      totalCostCents: 0,
    });
  }

  // 2. Royalty waterfall. Caller-provided lineage; this engine doesn't
  //    look up over federation — that's the marketplace's job.
  const lineageMap = new Map<string, LineageNode>(opts.lineage.map((n) => [n.seedId, n]));
  if (!lineageMap.has(opts.seedId)) {
    throw new Error(`lineage must include the root seedId (${opts.seedId})`);
  }
  const resolveLineage: LineageResolver = async (id) => lineageMap.get(id) ?? null;

  const royalty = await computeLineageRoyalty({
    seedId: opts.seedId,
    saleAmountCents,
    resolveLineage,
    platformAddress: opts.platformAddress,
    ancestorShareBp: opts.ancestorShareBp,
    platformShareBp: opts.platformShareBp,
    ancestorDecay: opts.ancestorDecay,
    maxDepth: opts.maxDepth,
  });

  // 3. License surcharge. commercial-royalty licenses can impose an
  //    ADDITIONAL royalty on top of the sale amount (e.g. 5% surcharge
  //    paid into the seed's custodian wallet).
  const licenseRoyaltyBp = verdict.royaltyBp;
  const licenseSurchargeCents = Math.floor((saleAmountCents * licenseRoyaltyBp) / 10000);
  const totalCostCents = saleAmountCents + licenseSurchargeCents;

  return buildResult({
    seedId: opts.seedId,
    allowed: true,
    reason: '',
    requirements: verdict.requirements,
    splits: royalty.splits,
    licenseRoyaltyBp,
    licenseSurchargeCents,
    saleAmountCents,
    totalCostCents,
  });
}

function buildResult(p: {
  seedId: string;
  allowed: boolean;
  reason: string;
  requirements: ReadonlyArray<string>;
  splits: ReadonlyArray<RoyaltySplit>;
  licenseRoyaltyBp: number;
  licenseSurchargeCents: number;
  saleAmountCents: number;
  totalCostCents: number;
}): SeedCostResult {
  const manifestBody = {
    schema: SEED_COST_SCHEMA,
    seedId: p.seedId,
    allowed: p.allowed,
    reason: p.reason,
    requirements: [...p.requirements],
    splits: p.splits.map((s) => ({
      address: s.address, role: s.role, depth: s.depth, seedId: s.seedId, cents: s.cents,
    })),
    licenseRoyaltyBp: p.licenseRoyaltyBp,
    licenseSurchargeCents: p.licenseSurchargeCents,
    saleAmountCents: p.saleAmountCents,
    totalCostCents: p.totalCostCents,
  };
  const manifest = createHash('sha256').update(canonicalize(manifestBody)).digest('hex');
  return {
    ...manifestBody,
    splits: p.splits,           // return the real RoyaltySplit objects, not the hashed shape
    requirements: p.requirements,
    manifest,
  };
}
