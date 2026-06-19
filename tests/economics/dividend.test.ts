import { describe, it, expect } from 'vitest';
import { calculateSeedDividend, computeOperatorShares, calculatePeriodDividend, DEFAULT_DIVIDEND_CONFIG, CIVILIZATIONAL_DIVIDEND_RATE } from '../../src/lib/economics/dividend';

describe('calculateSeedDividend', () => {
  it('returns zero for seeds below minEpochs', () => {
    const r = calculateSeedDividend('seed-1', 0, 0);
    expect(r.total).toBe(0);
    expect(r.baseDividend).toBe(0);
  });

  it('returns positive dividend for mature seeds', () => {
    const r = calculateSeedDividend('seed-1', 100, 5);
    expect(r.total).toBeGreaterThan(0);
    expect(r.baseDividend).toBe(CIVILIZATIONAL_DIVIDEND_RATE);
  });

  it('higher age yields higher dividend', () => {
    const young = calculateSeedDividend('s', 10, 0);
    const old = calculateSeedDividend('s', 1000, 0);
    expect(old.total).toBeGreaterThan(young.total);
  });

  it('more derivatives yields higher dividend', () => {
    const few = calculateSeedDividend('s', 100, 0);
    const many = calculateSeedDividend('s', 100, 50);
    expect(many.total).toBeGreaterThan(few.total);
  });
});

describe('computeOperatorShares', () => {
  it('distributes pool proportionally', () => {
    const ops = [
      { operatorId: 'alice', contributionScore: 100 },
      { operatorId: 'bob', contributionScore: 300 },
    ];
    const shares = computeOperatorShares(ops, 1000);
    expect(shares[0].amount).toBeCloseTo(250, 6); // 25%
    expect(shares[1].amount).toBeCloseTo(750, 6); // 75%
  });

  it('handles zero total score', () => {
    const shares = computeOperatorShares([{ operatorId: 'a', contributionScore: 0 }], 100);
    expect(shares[0].amount).toBe(0);
  });

  it('handles single operator', () => {
    const shares = computeOperatorShares([{ operatorId: 'a', contributionScore: 50 }], 200);
    expect(shares[0].amount).toBe(200);
  });
});

describe('calculatePeriodDividend', () => {
  it('produces a valid CivilizationalDividend', () => {
    const ops = [{ operatorId: 'op-1', contributionScore: 100 }];
    const div = calculatePeriodDividend('2026-Q2', 10000, ops);
    expect(div.period).toBe('2026-Q2');
    expect(div.totalRoyalties).toBe(10000);
    expect(div.dividendPool).toBe(100); // 1% of 10000
    expect(div.operators).toHaveLength(1);
    expect(div.auditable).toBe(true);
    expect(div.distributionDate).toBeGreaterThan(0);
  });

  it('distributes across multiple operators', () => {
    const ops = [
      { operatorId: 'a', contributionScore: 200 },
      { operatorId: 'b', contributionScore: 200 },
    ];
    const div = calculatePeriodDividend('2026-Q3', 5000, ops);
    expect(div.operators[0].amount).toBeCloseTo(div.operators[1].amount, 6);
  });
});
