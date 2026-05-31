/**
 * Paradigm Infinite — Civilizational Dividends Primitive (Part 6)
 * Long-lived seeds earn from derivative ecosystem.
 */

export interface DividendCalculation {
  seedId: string;
  ageInEpochs: number;
  derivativeCount: number;
  baseDividend: number;
  total: number;
}

export function calculateCivilizationalDividends(
  seedId: string,
  ageInEpochs: number,
  derivativeCount: number,
  baseRate: number = 0.01
): DividendCalculation {
  const multiplier = Math.log10(ageInEpochs + 10) * 0.5 + (derivativeCount * 0.02);
  const total = baseRate * multiplier * 1000; // scaled
  return {
    seedId,
    ageInEpochs,
    derivativeCount,
    baseDividend: baseRate,
    total: Math.round(total * 100) / 100,
  };
}
