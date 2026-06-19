import { describe, it, expect } from 'vitest';
import { royaltyMultiplierForTier, createTieredRoyaltyConfig, computeTieredWaterfall, createTieredRoyaltyTx, lineageDepth } from '../../src/lib/economics/royalties';
import type { SeedLineage } from '../../src/lib/sovereignty/royalty-waterfall';

function makeLineage(opts: { id: string; creator: string; parents?: string[]; gen?: number }): SeedLineage {
  return {
    seedId: opts.id,
    seedHash: `hash-${opts.id}`,
    creator: opts.creator,
    parentIds: opts.parents ?? [],
    generation: opts.gen ?? 0,
    createdAt: 1_700_000_000_000 + (opts.gen ?? 0),
  };
}

function makeLineageMap(seeds: SeedLineage[]): Map<string, SeedLineage> {
  const m = new Map<string, SeedLineage>();
  for (const s of seeds) m.set(s.seedId, s);
  return m;
}

describe('royaltyMultiplierForTier', () => {
  it('returns correct multipliers', () => {
    expect(royaltyMultiplierForTier('free')).toBe(0.5);
    expect(royaltyMultiplierForTier('indie')).toBe(1.0);
    expect(royaltyMultiplierForTier('studio')).toBe(1.5);
    expect(royaltyMultiplierForTier('enterprise')).toBe(2.0);
  });
});

describe('createTieredRoyaltyConfig', () => {
  it('scales config by tier multiplier', () => {
    const freeCfg = createTieredRoyaltyConfig('free');
    expect(freeCfg.creatorRoyaltyPercent).toBeCloseTo(5, 6); // 10 * 0.5
    expect(freeCfg.tier).toBe('free');

    const entCfg = createTieredRoyaltyConfig('enterprise');
    expect(entCfg.creatorRoyaltyPercent).toBeCloseTo(20, 6); // 10 * 2.0
  });

  it('accepts overrides', () => {
    const cfg = createTieredRoyaltyConfig('indie', { creatorRoyaltyPercent: 8 });
    expect(cfg.creatorRoyaltyPercent).toBe(8);
  });
});

describe('computeTieredWaterfall', () => {
  it('computes waterfall with tier multiplier', () => {
    const seed = makeLineage({ id: 'A', creator: 'creator-A' });
    const lineage = makeLineageMap([seed]);
    const freeR = computeTieredWaterfall(seed, 1000, lineage, 'free');
    // free multiplier = 0.5 → creatorRoyaltyPercent = 5 → 5% of 1000 = 50
    expect(freeR.splits[0].amount).toBeCloseTo(50, 6);

    const entR = computeTieredWaterfall(seed, 1000, lineage, 'enterprise');
    // enterprise multiplier = 2.0 → creatorRoyaltyPercent = 20 → 20% of 1000 = 200
    expect(entR.splits[0].amount).toBeCloseTo(200, 6);
  });
});

describe('createTieredRoyaltyTx', () => {
  it('produces a transaction with tiered config', () => {
    const seed = makeLineage({ id: 'A', creator: 'creator-A' });
    const lineage = makeLineageMap([seed]);
    const tx = createTieredRoyaltyTx(seed, 'buyer', 'seller', 1000, 'PARA', lineage, 'indie');
    expect(tx.transactionId).toBeTruthy();
    expect(tx.amount).toBe(1000);
    expect(tx.currency).toBe('PARA');
  });
});

describe('lineageDepth', () => {
  it('returns 0 for a root seed', () => {
    const A = makeLineage({ id: 'A', creator: 'ca' });
    expect(lineageDepth(makeLineageMap([A]), 'A')).toBe(0);
  });

  it('counts generations', () => {
    const A = makeLineage({ id: 'A', creator: 'ca' });
    const B = makeLineage({ id: 'B', creator: 'cb', parents: ['A'], gen: 1 });
    const C = makeLineage({ id: 'C', creator: 'cc', parents: ['B'], gen: 2 });
    expect(lineageDepth(makeLineageMap([A, B, C]), 'C')).toBe(2);
  });
});
