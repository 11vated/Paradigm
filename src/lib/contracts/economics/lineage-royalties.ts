/**
 * Paradigm Infinite — Lineage Royalties Primitive (Part 6)
 * Real waterfall calc for sovereign lineage dividends (used by manifests + full-economics).
 */

export interface RoyaltyWaterfall {
  depth: number;
  percentage: number; // to this ancestor
  cumulative: number;
}

export function calculateLineageRoyalties(
  saleAmount: number,
  lineageDepth: number,
  baseRate: number = 0.05
): RoyaltyWaterfall[] {
  const waterfall: RoyaltyWaterfall[] = [];
  let remaining = baseRate;
  for (let d = 0; d < lineageDepth && remaining > 0.001; d++) {
    const pct = remaining * (1 / (d + 2)); // diminishing
    waterfall.push({
      depth: d,
      percentage: pct,
      cumulative: saleAmount * pct,
    });
    remaining -= pct;
  }
  return waterfall;
}

export const CivilizationalDividendRate = 0.01; // 1% of long-lived seeds
