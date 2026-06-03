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
  const maxD = Math.max(1, Math.min(100, lineageDepth)); // arbitrary depth (capped sane for v1)
  for (let d = 0; d < maxD && remaining > 0.0001; d++) {
    const pct = remaining * (1 / (d + 2)); // diminishing
    waterfall.push({
      depth: d,
      percentage: pct,
      cumulative: saleAmount * pct,
    });
    remaining -= pct;
  }
  // ensure at least depth entries by padding zeros if needed for arbitrary
  while (waterfall.length < maxD) {
    const d = waterfall.length;
    waterfall.push({ depth: d, percentage: 0, cumulative: 0 });
  }
  return waterfall;
}

export const CivilizationalDividendRate = 0.01; // 1% of long-lived seeds
