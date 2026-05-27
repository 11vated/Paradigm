/**
 * Civilizational Dividend — Doctrine v2 Part VIII.19 v1.
 *
 * Validates the dividend engine's invariants: pool accumulation,
 * payout determinism, conservation (sum of payouts == pool),
 * idempotent sale addition, and manifest stability.
 */
import { describe, it, expect } from 'vitest';
import {
  openEpoch,
  addSale,
  closeEpoch,
  dividendSelfCheck,
} from '../../src/lib/kernel/civilizational-dividend';
import type { LineageRoyaltyResult } from '../../src/lib/kernel/lineage-royalty';

function sale(manifest: string, saleCents: number, splits: Array<{ address: string; cents: number; role?: string; depth?: number }>): LineageRoyaltyResult {
  return {
    schema: 'https://paradigm.ai/schema/lineage-royalty/v1',
    seedId: `seed-for-${manifest}`,
    saleAmountCents: saleCents,
    totalCents: saleCents,
    remainderCents: 0,
    manifest,
    splits: splits.map((s) => ({
      address: s.address,
      role: (s.role as 'author' | 'platform' | 'ancestor') ?? 'author',
      depth: s.depth ?? 0,
      seedId: null,
      cents: s.cents,
      percentageBp: Math.floor((s.cents / saleCents) * 10_000),
    })),
  };
}

describe('Doctrine v2 Part VIII.19 — civilizational dividend', () => {
  it('opens an epoch with sensible defaults', () => {
    const e = openEpoch({ epochId: 'epoch-1' });
    expect(e.epochId).toBe('epoch-1');
    expect(e.dividendBp).toBe(100);
    expect(e.platformAddress).toBe('platform');
    expect(e.status).toBe('open');
    expect(e.poolCents).toBe(0);
    expect(e.participations).toEqual([]);
  });

  it('addSale accumulates pool at dividendBp', () => {
    let e = openEpoch({ epochId: 'pool-test', dividendBp: 200 }); // 2%
    e = addSale(e, sale('s1', 10_000, [
      { address: 'alice', cents: 9_500 },
      { address: 'platform', cents: 500, role: 'platform' },
    ]));
    expect(e.poolCents).toBe(200); // 2% of 10000
    expect(e.totalSalesCents).toBe(10_000);
    expect(e.saleManifests).toContain('s1');
  });

  it('addSale is idempotent on duplicate manifest hashes', () => {
    let e = openEpoch({ epochId: 'idempotent' });
    const s = sale('dup', 5_000, [{ address: 'a', cents: 5_000 }]);
    e = addSale(e, s);
    e = addSale(e, s); // same manifest
    expect(e.saleManifests).toHaveLength(1);
    expect(e.poolCents).toBe(50); // 1% of 5000, only once
  });

  it('participation weights aggregate across multiple sales', () => {
    let e = openEpoch({ epochId: 'weights' });
    e = addSale(e, sale('s1', 10_000, [
      { address: 'alice', cents: 8_000 },
      { address: 'bob', cents: 2_000 },
    ]));
    e = addSale(e, sale('s2', 10_000, [
      { address: 'alice', cents: 9_000 },
      { address: 'carol', cents: 1_000 },
    ]));
    const a = e.participations.find((p) => p.address === 'alice');
    const b = e.participations.find((p) => p.address === 'bob');
    const c = e.participations.find((p) => p.address === 'carol');
    expect(a?.weight).toBe(2);
    expect(b?.weight).toBe(1);
    expect(c?.weight).toBe(1);
  });

  it('platform address never accumulates participation', () => {
    let e = openEpoch({ epochId: 'no-platform', platformAddress: 'platform' });
    e = addSale(e, sale('s1', 10_000, [
      { address: 'alice', cents: 9_500 },
      { address: 'platform', cents: 500, role: 'platform' },
    ]));
    expect(e.participations.find((p) => p.address === 'platform')).toBeUndefined();
  });

  it('closeEpoch distributes pool pro-rata by weight', () => {
    let e = openEpoch({ epochId: 'distrib' });
    e = addSale(e, sale('s1', 100_000, [
      { address: 'alice', cents: 95_000 },
      { address: 'bob', cents: 5_000 },
    ]));
    e = addSale(e, sale('s2', 100_000, [
      { address: 'alice', cents: 50_000 },
      { address: 'bob', cents: 50_000 },
    ]));
    // Default dividendBp=100 (1%). Pool = 1% of 200_000 = 2_000.
    // Both alice and bob have weight 2, so each gets 1_000.
    const { distribution } = closeEpoch(e);
    expect(distribution.poolCents).toBe(2_000);
    expect(distribution.payouts).toHaveLength(2);
    expect(distribution.payouts[0].cents).toBe(1_000);
    expect(distribution.payouts[1].cents).toBe(1_000);
  });

  it('payouts sum to pool minus remainder', () => {
    let e = openEpoch({ epochId: 'sum' });
    e = addSale(e, sale('s1', 10_000, [
      { address: 'alice', cents: 4_000 },
      { address: 'bob', cents: 3_000 },
      { address: 'carol', cents: 3_000 },
    ]));
    const { distribution } = closeEpoch(e);
    const sum = distribution.payouts.reduce((s, p) => s + p.cents, 0);
    expect(sum + distribution.remainderCents).toBe(distribution.poolCents);
  });

  it('payouts ordered by cents desc, then address asc', () => {
    let e = openEpoch({ epochId: 'ordering' });
    e = addSale(e, sale('s1', 100_000, [
      { address: 'zoe', cents: 50_000 },
      { address: 'amy', cents: 50_000 },
    ]));
    e = addSale(e, sale('s2', 100_000, [
      { address: 'amy', cents: 80_000 },
      { address: 'zoe', cents: 20_000 },
    ]));
    // amy and zoe both have weight 2; tied cents → address asc
    const { distribution } = closeEpoch(e);
    expect(distribution.payouts[0].address).toBe('amy');
    expect(distribution.payouts[1].address).toBe('zoe');
  });

  it('manifest is deterministic across identical inputs', () => {
    let a = openEpoch({ epochId: 'det' });
    let b = openEpoch({ epochId: 'det' });
    const s = sale('sx', 10_000, [{ address: 'x', cents: 5_000 }, { address: 'y', cents: 5_000 }]);
    a = addSale(a, s);
    b = addSale(b, s);
    expect(closeEpoch(a).distribution.manifest).toBe(closeEpoch(b).distribution.manifest);
  });

  it('closeEpoch on closed epoch throws', () => {
    let e = openEpoch({ epochId: 'closed-twice' });
    e = addSale(e, sale('s1', 10_000, [{ address: 'a', cents: 10_000 }]));
    const { epoch: closed } = closeEpoch(e);
    expect(() => closeEpoch(closed)).toThrow(/already closed/);
  });

  it('addSale on closed epoch throws', () => {
    let e = openEpoch({ epochId: 'add-after-close' });
    const { epoch: closed } = closeEpoch(e);
    expect(() => addSale(closed, sale('late', 100, [{ address: 'a', cents: 100 }]))).toThrow(/closed/);
  });

  it('empty epoch yields empty distribution', () => {
    const e = openEpoch({ epochId: 'empty' });
    const { distribution } = closeEpoch(e);
    expect(distribution.poolCents).toBe(0);
    expect(distribution.payouts).toEqual([]);
    expect(distribution.remainderCents).toBe(0);
  });

  it('dividendSelfCheck is healthy', () => {
    const r = dividendSelfCheck();
    expect(r.ok).toBe(true);
  });
});
