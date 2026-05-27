/**
 * Civilizational Dividend — Doctrine v2 Part VIII.19 v1.
 *
 * The most "magical" feature of the economic substrate: a small,
 * deterministic share of every sale accumulates into an epoch pool
 * that, on epoch close, distributes pro-rata to every author with
 * lineage participation in the epoch.
 *
 * Old creators with widely-forked seeds receive ongoing income from
 * descendant sales they have no operational involvement in. The
 * substrate is the operator.
 *
 * Composition: layers over Phase 17 (lineage royalty manifests).
 * Each sale's LineageRoyaltyResult contributes `dividendBp` basis
 * points to the open epoch's pool. On close, the pool is split by
 * author participation: each author's weight = number of times their
 * address appears across all lineage chains in the epoch's sales.
 *
 * Determinism:
 *   - Canonical JSON + sha256 manifest per distribution.
 *   - Integer-cents arithmetic; remainder pinned to platformAddress.
 *   - Deterministic ordering: payouts sorted by (cents desc, addr asc).
 *
 * Invariants enforced by test:
 *   - sum(payouts.cents) === pool
 *   - same set of manifests + same dividendBp → byte-identical distribution
 *   - opening then immediately closing an empty epoch yields zero payouts
 *   - manifest hash changes iff any input changes
 */
import { createHash } from 'node:crypto';
import { canonicalize } from '../intelligence/federation/peer-store.js';
import type { LineageRoyaltyResult } from './lineage-royalty.js';

export const DIVIDEND_SCHEMA = 'https://paradigm.ai/schema/civilizational-dividend/v1' as const;

export interface DividendEpoch {
  readonly schema: typeof DIVIDEND_SCHEMA;
  readonly epochId: string;
  readonly dividendBp: number;       // basis points per sale reserved for the pool
  readonly platformAddress: string;  // catches rounding remainder
  readonly status: 'open' | 'closed';
  readonly saleManifests: ReadonlyArray<string>;  // manifest hashes seen
  readonly totalSalesCents: number;
  readonly poolCents: number;        // accumulated pool reserve
  readonly participations: ReadonlyArray<{
    readonly address: string;
    readonly weight: number;         // count of appearances in lineage chains
  }>;
}

export interface DividendPayout {
  readonly address: string;
  readonly cents: number;
  readonly shareBp: number;          // basis points of the pool (sum ≤ 10_000)
  readonly weight: number;           // participation weight
}

export interface DividendDistribution {
  readonly schema: typeof DIVIDEND_SCHEMA;
  readonly epochId: string;
  readonly closedAt: number;         // kernelNow at close; pinned 0 in tests
  readonly poolCents: number;
  readonly totalSalesCents: number;
  readonly dividendBp: number;
  readonly payouts: ReadonlyArray<DividendPayout>;
  readonly remainderCents: number;   // any rounding goes here
  readonly manifest: string;         // sha256 of canonical distribution
}

export interface OpenEpochOpts {
  epochId: string;
  dividendBp?: number;               // default 100 bp = 1%
  platformAddress?: string;          // default 'platform'
}

export function openEpoch(opts: OpenEpochOpts): DividendEpoch {
  return {
    schema: DIVIDEND_SCHEMA,
    epochId: opts.epochId,
    dividendBp: opts.dividendBp ?? 100,
    platformAddress: opts.platformAddress ?? 'platform',
    status: 'open',
    saleManifests: [],
    totalSalesCents: 0,
    poolCents: 0,
    participations: [],
  };
}

/**
 * Add a sale's royalty manifest to an open epoch. Pure: returns a new
 * epoch object; never mutates. Idempotent on duplicate manifest hashes.
 */
export function addSale(epoch: DividendEpoch, sale: LineageRoyaltyResult): DividendEpoch {
  if (epoch.status !== 'open') {
    throw new Error(`cannot add sale to closed epoch ${epoch.epochId}`);
  }
  if (epoch.saleManifests.includes(sale.manifest)) {
    return epoch; // idempotent
  }
  const reserveCents = Math.floor(sale.saleAmountCents * epoch.dividendBp / 10_000);
  // Aggregate participation weights from this sale's lineage splits.
  const newParticipations = new Map<string, number>();
  for (const p of epoch.participations) {
    newParticipations.set(p.address, p.weight);
  }
  for (const split of sale.splits) {
    if (split.address === epoch.platformAddress) continue;
    newParticipations.set(split.address, (newParticipations.get(split.address) ?? 0) + 1);
  }
  return {
    ...epoch,
    saleManifests: [...epoch.saleManifests, sale.manifest],
    totalSalesCents: epoch.totalSalesCents + sale.saleAmountCents,
    poolCents: epoch.poolCents + reserveCents,
    participations: Array.from(newParticipations.entries())
      .map(([address, weight]) => ({ address, weight }))
      .sort((a, b) => (b.weight - a.weight) || a.address.localeCompare(b.address)),
  };
}

/**
 * Close an epoch and compute the distribution. Pure; returns a new
 * epoch (status='closed') alongside the distribution. The pool is
 * divided pro-rata by participation weight; any rounding remainder
 * goes to the platform address.
 */
export function closeEpoch(epoch: DividendEpoch, opts: { closedAt?: number } = {}): {
  epoch: DividendEpoch;
  distribution: DividendDistribution;
} {
  if (epoch.status === 'closed') {
    throw new Error(`epoch ${epoch.epochId} already closed`);
  }
  const closedAt = opts.closedAt ?? 0;
  const totalWeight = epoch.participations.reduce((s, p) => s + p.weight, 0);
  const payouts: DividendPayout[] = [];
  let allocated = 0;
  if (totalWeight > 0 && epoch.poolCents > 0) {
    for (const p of epoch.participations) {
      const cents = Math.floor((p.weight / totalWeight) * epoch.poolCents);
      if (cents > 0) {
        payouts.push({
          address: p.address,
          cents,
          shareBp: Math.floor((cents / epoch.poolCents) * 10_000),
          weight: p.weight,
        });
        allocated += cents;
      }
    }
  }
  // Deterministic ordering: cents desc, then address asc.
  payouts.sort((a, b) => (b.cents - a.cents) || a.address.localeCompare(b.address));
  const remainderCents = epoch.poolCents - allocated;
  const closedEpoch: DividendEpoch = { ...epoch, status: 'closed' };
  const distribution: DividendDistribution = {
    schema: DIVIDEND_SCHEMA,
    epochId: epoch.epochId,
    closedAt,
    poolCents: epoch.poolCents,
    totalSalesCents: epoch.totalSalesCents,
    dividendBp: epoch.dividendBp,
    payouts,
    remainderCents,
    manifest: '',
  };
  const manifest = createHash('sha256').update(canonicalize({ ...distribution, manifest: undefined }), 'utf8').digest('hex');
  return { epoch: closedEpoch, distribution: { ...distribution, manifest } };
}

/** Quick sanity self-check used by /api/dividend/health. */
export function dividendSelfCheck(): { ok: true; sampleHash: string } | { ok: false; reason: string } {
  try {
    let e = openEpoch({ epochId: 'self-check', dividendBp: 100, platformAddress: 'platform' });
    const fakeSale: LineageRoyaltyResult = {
      schema: 'https://paradigm.ai/schema/lineage-royalty/v1',
      seedId: 'fake-seed',
      saleAmountCents: 10_000,
      totalCents: 10_000,
      remainderCents: 0,
      manifest: 'fake-manifest-hash',
      splits: [
        { address: 'author-a', role: 'author', depth: 0, seedId: null, cents: 8_000, percentageBp: 8000 },
        { address: 'author-b', role: 'ancestor', depth: 1, seedId: 'parent', cents: 1_500, percentageBp: 1500 },
        { address: 'platform', role: 'platform', depth: 0, seedId: null, cents: 500, percentageBp: 500 },
      ],
    };
    e = addSale(e, fakeSale);
    const { distribution } = closeEpoch(e);
    if (distribution.poolCents !== 100) return { ok: false, reason: `pool=${distribution.poolCents} expected 100` };
    if (distribution.payouts.length !== 2) return { ok: false, reason: `payouts=${distribution.payouts.length} expected 2` };
    return { ok: true, sampleHash: distribution.manifest };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}
