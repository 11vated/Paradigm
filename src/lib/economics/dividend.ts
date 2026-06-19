import { createHash } from 'node:crypto';
import { kernelNow } from '../kernel/clock.js';
import type { CivilizationalDividend, OperatorShare } from '../sovereignty/economics-types.js';

export const CIVILIZATIONAL_DIVIDEND_RATE = 0.01;

export interface DividendConfig {
  baseRate: number;
  ageWeight: number;
  derivativeWeight: number;
  minEpochs: number;
}

export const DEFAULT_DIVIDEND_CONFIG: DividendConfig = {
  baseRate: CIVILIZATIONAL_DIVIDEND_RATE,
  ageWeight: 0.5,
  derivativeWeight: 0.02,
  minEpochs: 1,
};

export function calculateSeedDividend(
  seedId: string,
  ageInEpochs: number,
  derivativeCount: number,
  config: DividendConfig = DEFAULT_DIVIDEND_CONFIG,
): { baseDividend: number; multiplier: number; total: number } {
  if (ageInEpochs < config.minEpochs) {
    return { baseDividend: 0, multiplier: 0, total: 0 };
  }
  const multiplier = Math.log10(ageInEpochs + 10) * config.ageWeight + derivativeCount * config.derivativeWeight;
  const total = config.baseRate * multiplier * 1000;
  return {
    baseDividend: config.baseRate,
    multiplier,
    total: Math.round(total * 100) / 100,
  };
}

export function computeOperatorShares(
  operators: Array<{ operatorId: string; contributionScore: number }>,
  totalPool: number,
): OperatorShare[] {
  const totalScore = operators.reduce((sum, op) => sum + op.contributionScore, 0);
  if (totalScore <= 0) return operators.map(op => ({ operatorId: op.operatorId, contributionScore: op.contributionScore, sharePercent: 0, amount: 0 }));

  return operators.map(op => {
    const sharePercent = op.contributionScore / totalScore;
    return {
      operatorId: op.operatorId,
      contributionScore: op.contributionScore,
      sharePercent,
      amount: Math.round(totalPool * sharePercent * 100) / 100,
    };
  });
}

export function calculatePeriodDividend(
  period: string,
  totalRoyalties: number,
  operators: Array<{ operatorId: string; contributionScore: number }>,
  dividendRate: number = CIVILIZATIONAL_DIVIDEND_RATE,
): CivilizationalDividend {
  const dividendPool = totalRoyalties * dividendRate;
  const operatorShares = computeOperatorShares(operators, dividendPool);
  return {
    period,
    totalRoyalties,
    dividendPool: Math.round(dividendPool * 100) / 100,
    operators: operatorShares,
    distributionDate: kernelNow(),
    auditable: true,
  };
}
