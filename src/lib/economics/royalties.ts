import { createHash } from 'node:crypto';
import { kernelNow } from '../kernel/clock.js';
import { computeRoyaltyWaterfall, createRoyaltyTransaction, type SeedLineage, type RoyaltyConfig, DEFAULT_ROYALTY_CONFIG } from '../sovereignty/royalty-waterfall.js';
import type { LicenseTier } from '../sovereignty/economics-types.js';

const TIER_ROYALTY_MULTIPLIER: Record<LicenseTier, number> = {
  free: 0.5,
  indie: 1.0,
  studio: 1.5,
  enterprise: 2.0,
};

export function royaltyMultiplierForTier(tier: LicenseTier): number {
  return TIER_ROYALTY_MULTIPLIER[tier] ?? 1.0;
}

export interface TieredRoyaltyConfig extends RoyaltyConfig {
  tier: LicenseTier;
}

export function createTieredRoyaltyConfig(tier: LicenseTier, overrides?: Partial<RoyaltyConfig>): TieredRoyaltyConfig {
  const multiplier = royaltyMultiplierForTier(tier);
  const base: RoyaltyConfig = { ...DEFAULT_ROYALTY_CONFIG, ...overrides };
  return {
    ...base,
    creatorRoyaltyPercent: base.creatorRoyaltyPercent * multiplier,
    ancestorRoyaltyPercent: base.ancestorRoyaltyPercent * multiplier,
    platformFeePercent: base.platformFeePercent * multiplier,
    tier,
  };
}

export function computeTieredWaterfall(
  seed: SeedLineage,
  salePrice: number,
  lineage: Map<string, SeedLineage>,
  tier: LicenseTier,
  config?: Partial<RoyaltyConfig>,
) {
  const tieredConfig = createTieredRoyaltyConfig(tier, config);
  return computeRoyaltyWaterfall(seed, salePrice, lineage, tieredConfig);
}

export function createTieredRoyaltyTx(
  seed: SeedLineage,
  buyerId: string,
  sellerId: string,
  salePrice: number,
  currency: 'PARA' | 'ETH' | 'USD',
  lineage: Map<string, SeedLineage>,
  tier: LicenseTier,
  config?: Partial<RoyaltyConfig>,
  privateKey?: string,
) {
  const tCfg = createTieredRoyaltyConfig(tier, config);
  return createRoyaltyTransaction(seed, buyerId, sellerId, salePrice, currency, lineage, tCfg, privateKey);
}

export function lineageDepth(lineage: Map<string, SeedLineage>, seedId: string): number {
  let depth = 0;
  let current = lineage.get(seedId);
  while (current && current.parentIds.length > 0) {
    const parent = lineage.get(current.parentIds[0]);
    if (!parent) break;
    depth++;
    current = parent;
  }
  return depth;
}
