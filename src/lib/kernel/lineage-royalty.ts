/**
 * Lineage Royalty — Doctrine v2 Part VIII.17 (lineage royalties at depth).
 *
 * Computes the royalty waterfall for a sale, distributing across:
 *   - the seed's primary author(s)
 *   - the platform
 *   - the seed's lineage ancestors (parent, grandparent, …), with
 *     a geometric decay capped at `maxDepth`
 *
 * The algorithm is integer-arithmetic only (cents), so a $100 sale
 * produces splits that sum to exactly 10000 cents — no penny lost,
 * no penny double-counted. Any rounding remainder is awarded to the
 * platform.
 *
 * The result includes a content-hash manifest suitable for on-chain
 * anchoring (the manifest is what a smart contract would commit to
 * before paying out).
 */
import { createHash } from 'node:crypto';

export interface LineageNode {
  /** Stable seed id. */
  readonly seedId: string;
  /** On-chain or off-chain author address. */
  readonly authorAddress: string;
  /** Parent seed ids (multi-parent permitted; first is canonical). */
  readonly parents: ReadonlyArray<string>;
}

export type LineageResolver = (seedId: string) => Promise<LineageNode | null>;

export interface LineageRoyaltyOpts {
  seedId: string;
  /** Sale amount in *minor units* (cents, satoshi-equivalent, …). */
  saleAmountCents: number;
  resolveLineage: LineageResolver;
  /** Total share given to ancestor seeds, in basis points (10000 = 100%). Default 1500 (15%). */
  ancestorShareBp?: number;
  /** Platform share in basis points. Default 500 (5%). */
  platformShareBp?: number;
  /** Geometric decay across generations: gen 1 gets X, gen 2 gets X·decay, ... Default 0.5. */
  ancestorDecay?: number;
  /** Maximum lineage depth. Default 8. */
  maxDepth?: number;
  /** Platform address; receives platform share + rounding remainder. */
  platformAddress?: string;
}

export type SplitRole = 'author' | 'platform' | 'ancestor';

export interface RoyaltySplit {
  readonly address: string;
  readonly role: SplitRole;
  readonly depth: number;
  readonly seedId: string | null;
  readonly cents: number;
  readonly percentageBp: number;
}

export interface LineageRoyaltyResult {
  readonly schema: 'https://paradigm.ai/schema/lineage-royalty/v1';
  readonly seedId: string;
  readonly saleAmountCents: number;
  readonly splits: ReadonlyArray<RoyaltySplit>;
  readonly totalCents: number;
  readonly remainderCents: number;
  readonly manifest: string;
}

const DEFAULT_PLATFORM = '0x0000000000000000000000000000000000000000';

/** Pure canonical JSON (recursively sorted keys; undefined keys dropped to match JSON.stringify). */
function canonicalize(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj ?? null);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).filter((k) => record[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize(record[k])).join(',') + '}';
}

/**
 * Compute the canonical lineage chain (parent, grandparent, ...) by
 * following the FIRST parent at each step. Multi-parent ancestry is
 * out of scope for v1; the chain stops at depth or at a missing node.
 */
async function walkLineage(
  seedId: string,
  resolve: LineageResolver,
  maxDepth: number,
): Promise<LineageNode[]> {
  const chain: LineageNode[] = [];
  const seen = new Set<string>([seedId]);
  let current = seedId;
  for (let depth = 1; depth <= maxDepth; depth++) {
    const node = await resolve(current);
    if (!node || node.parents.length === 0) break;
    const parentId = node.parents[0];
    if (seen.has(parentId)) break; // cycle guard
    seen.add(parentId);
    const parentNode = await resolve(parentId);
    if (!parentNode) break;
    chain.push(parentNode);
    current = parentId;
  }
  return chain;
}

/**
 * Distribute a budget across n positions using a geometric decay.
 * Returns integer allocations whose sum equals `budgetCents` exactly
 * (any rounding leftover is returned alongside).
 */
function geometricDistribute(budgetCents: number, n: number, decay: number): {
  allocations: number[];
  remainder: number;
} {
  if (n <= 0 || budgetCents <= 0) return { allocations: [], remainder: budgetCents };
  if (n === 1) return { allocations: [budgetCents], remainder: 0 };

  // Compute weights w_i = decay^(i-1) for i = 1..n; normalize.
  const weights: number[] = [];
  for (let i = 0; i < n; i++) weights.push(Math.pow(decay, i));
  const sumW = weights.reduce((a, b) => a + b, 0);

  const allocations: number[] = [];
  let allocated = 0;
  for (let i = 0; i < n - 1; i++) {
    const share = Math.floor((budgetCents * weights[i]) / sumW);
    allocations.push(share);
    allocated += share;
  }
  // Last position gets whatever's left to avoid penny loss inside the budget.
  allocations.push(budgetCents - allocated);
  return { allocations, remainder: 0 };
}

export async function computeLineageRoyalty(opts: LineageRoyaltyOpts): Promise<LineageRoyaltyResult> {
  const saleAmountCents = Math.floor(opts.saleAmountCents);
  if (!Number.isFinite(saleAmountCents) || saleAmountCents < 0) {
    throw new RangeError(`saleAmountCents must be a non-negative finite number; got ${opts.saleAmountCents}`);
  }
  const platformBp = clampBp(opts.platformShareBp ?? 500);
  const ancestorBp = clampBp(opts.ancestorShareBp ?? 1500);
  if (platformBp + ancestorBp >= 10000) {
    throw new RangeError(`platformShareBp + ancestorShareBp must be < 10000; got ${platformBp + ancestorBp}`);
  }
  const decay = clamp01(opts.ancestorDecay ?? 0.5);
  const maxDepth = Math.max(0, Math.floor(opts.maxDepth ?? 8));
  const platformAddress = opts.platformAddress ?? DEFAULT_PLATFORM;

  const root = await opts.resolveLineage(opts.seedId);
  if (!root) {
    throw new Error(`seed not found in lineage resolver: ${opts.seedId}`);
  }

  const ancestors = await walkLineage(opts.seedId, opts.resolveLineage, maxDepth);

  // Integer-arithmetic distribution.
  const platformCents = Math.floor((saleAmountCents * platformBp) / 10000);
  const ancestorBudget = ancestors.length > 0 ? Math.floor((saleAmountCents * ancestorBp) / 10000) : 0;
  const authorCents = saleAmountCents - platformCents - ancestorBudget;

  const splits: RoyaltySplit[] = [
    {
      address: root.authorAddress,
      role: 'author',
      depth: 0,
      seedId: root.seedId,
      cents: authorCents,
      percentageBp: saleAmountCents === 0 ? 0 : Math.round((authorCents * 10000) / saleAmountCents),
    },
  ];

  if (ancestors.length > 0) {
    const { allocations } = geometricDistribute(ancestorBudget, ancestors.length, decay);
    for (let i = 0; i < ancestors.length; i++) {
      const a = ancestors[i];
      const cents = allocations[i];
      splits.push({
        address: a.authorAddress,
        role: 'ancestor',
        depth: i + 1,
        seedId: a.seedId,
        cents,
        percentageBp: saleAmountCents === 0 ? 0 : Math.round((cents * 10000) / saleAmountCents),
      });
    }
  }

  let totalCents = splits.reduce((s, x) => s + x.cents, 0);
  const platformBaseCents = platformCents;
  const platformSplit: RoyaltySplit = {
    address: platformAddress,
    role: 'platform',
    depth: 0,
    seedId: null,
    cents: platformBaseCents,
    percentageBp: saleAmountCents === 0 ? 0 : Math.round((platformBaseCents * 10000) / saleAmountCents),
  };
  totalCents += platformBaseCents;

  // Any rounding remainder (saleAmount - totalCents) sweeps into platform.
  const remainder = saleAmountCents - totalCents;
  const finalPlatform: RoyaltySplit = {
    ...platformSplit,
    cents: platformSplit.cents + remainder,
    percentageBp: saleAmountCents === 0 ? 0 : Math.round(((platformSplit.cents + remainder) * 10000) / saleAmountCents),
  };
  splits.push(finalPlatform);

  const verifyTotal = splits.reduce((s, x) => s + x.cents, 0);
  if (verifyTotal !== saleAmountCents) {
    throw new Error(`royalty arithmetic mismatch: splits=${verifyTotal} sale=${saleAmountCents}`);
  }

  const manifestPayload = {
    schema: 'https://paradigm.ai/schema/lineage-royalty/v1',
    seedId: opts.seedId,
    saleAmountCents,
    splits: splits.map((s) => ({
      address: s.address, role: s.role, depth: s.depth, seedId: s.seedId, cents: s.cents,
    })),
  };
  const manifest = createHash('sha256').update(canonicalize(manifestPayload)).digest('hex');

  return {
    schema: 'https://paradigm.ai/schema/lineage-royalty/v1',
    seedId: opts.seedId,
    saleAmountCents,
    splits,
    totalCents: verifyTotal,
    remainderCents: remainder,
    manifest,
  };
}

function clampBp(bp: number): number {
  if (!Number.isFinite(bp)) return 0;
  return Math.max(0, Math.min(10000, Math.floor(bp)));
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
