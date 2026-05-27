/**
 * Seed cost — Doctrine v2 Part VIII.20 v0 (marketplace primitive).
 *
 * Composes license + lineage royalty into one verdict. Tests the full
 * decision matrix and the manifest determinism property.
 */
import { describe, it, expect } from 'vitest';
import { computeSeedCost } from '../../src/lib/kernel/seed-cost';
import { buildLicense, type SeedLicense } from '../../src/lib/kernel/seed-license';
import type { LineageNode } from '../../src/lib/kernel/lineage-royalty';

function lic(type: SeedLicense['type'], extras: Partial<SeedLicense> = {}): SeedLicense {
  return buildLicense({
    type, version: '1.0.0', custodian: '0xCustodian',
    ...extras,
  }) as SeedLicense;
}

const SOLO_LINEAGE: LineageNode[] = [{ seedId: 'S', authorAddress: '0xAuthor', parents: [] }];
const TWO_GEN_LINEAGE: LineageNode[] = [
  { seedId: 'S',      authorAddress: '0xChild',  parents: ['parent'] },
  { seedId: 'parent', authorAddress: '0xParent', parents: [] },
];

describe('Doctrine v2 Part VIII.20 — seed cost composition', () => {
  it('public-domain solo: allowed, no surcharge, 95/5 splits', async () => {
    const r = await computeSeedCost({
      seedId: 'S', license: lic('public-domain'),
      intendedUse: 'commercial-resale', saleAmountCents: 10_000,
      lineage: SOLO_LINEAGE,
    });
    expect(r.allowed).toBe(true);
    expect(r.licenseSurchargeCents).toBe(0);
    expect(r.totalCostCents).toBe(10_000);
    expect(r.splits.find((s) => s.role === 'author')?.cents).toBe(9_500);
  });

  it('attribution solo: allowed; requirement surfaces in result', async () => {
    const r = await computeSeedCost({
      seedId: 'S', license: lic('attribution', { attribution: { required: true, canonicalLine: 'by A' } }),
      intendedUse: 'remix', saleAmountCents: 10_000,
      lineage: SOLO_LINEAGE,
    });
    expect(r.allowed).toBe(true);
    expect(r.requirements.some((req) => /attribution/i.test(req))).toBe(true);
  });

  it('noncommercial + commercial-resale: denied; no royalty payable', async () => {
    const r = await computeSeedCost({
      seedId: 'S', license: lic('noncommercial'),
      intendedUse: 'commercial-resale', saleAmountCents: 10_000,
      lineage: SOLO_LINEAGE,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/noncommercial/);
    expect(r.splits.length).toBe(0);
    expect(r.totalCostCents).toBe(0);
  });

  it('all-rights-reserved + remix: denied', async () => {
    const r = await computeSeedCost({
      seedId: 'S', license: lic('all-rights-reserved'),
      intendedUse: 'remix', saleAmountCents: 10_000,
      lineage: SOLO_LINEAGE,
    });
    expect(r.allowed).toBe(false);
  });

  it('commercial-royalty: license surcharge is added on top of sale', async () => {
    const r = await computeSeedCost({
      seedId: 'S', license: lic('commercial-royalty', { royaltyBp: 500 }), // 5%
      intendedUse: 'commercial-resale', saleAmountCents: 10_000,
      lineage: SOLO_LINEAGE,
    });
    expect(r.allowed).toBe(true);
    expect(r.licenseRoyaltyBp).toBe(500);
    expect(r.licenseSurchargeCents).toBe(500); // 5% of 10000
    expect(r.totalCostCents).toBe(10_500);
    // Royalty splits still sum to the SALE (not the total) — they're for the proceeds.
    expect(r.splits.reduce((s, x) => s + x.cents, 0)).toBe(10_000);
  });

  it('two-generation lineage: parent receives 15% via ancestor split', async () => {
    const r = await computeSeedCost({
      seedId: 'S', license: lic('public-domain'),
      intendedUse: 'commercial-resale', saleAmountCents: 10_000,
      lineage: TWO_GEN_LINEAGE,
    });
    expect(r.allowed).toBe(true);
    const ancestors = r.splits.filter((s) => s.role === 'ancestor');
    expect(ancestors.length).toBe(1);
    expect(ancestors[0].address).toBe('0xParent');
    expect(ancestors[0].cents).toBe(1_500);
  });

  it('expired license: denied even for view', async () => {
    const r = await computeSeedCost({
      seedId: 'S', license: lic('public-domain', { expires: '2020-01-01T00:00:00.000Z' }),
      intendedUse: 'view', saleAmountCents: 10_000,
      lineage: SOLO_LINEAGE,
      now: '2026-05-27T00:00:00.000Z',
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/expired/);
  });

  it('lineage must include the root seed (otherwise: throw)', async () => {
    await expect(computeSeedCost({
      seedId: 'S', license: lic('public-domain'),
      intendedUse: 'commercial-resale', saleAmountCents: 10_000,
      lineage: [{ seedId: 'OTHER', authorAddress: '0xX', parents: [] }],
    })).rejects.toThrow(/lineage must include the root/);
  });

  it('manifest is deterministic across identical inputs', async () => {
    const a = await computeSeedCost({
      seedId: 'S', license: lic('commercial-royalty', { royaltyBp: 250 }),
      intendedUse: 'commercial-resale', saleAmountCents: 49_999,
      lineage: TWO_GEN_LINEAGE,
    });
    const b = await computeSeedCost({
      seedId: 'S', license: lic('commercial-royalty', { royaltyBp: 250 }),
      intendedUse: 'commercial-resale', saleAmountCents: 49_999,
      lineage: TWO_GEN_LINEAGE,
    });
    expect(a.manifest).toBe(b.manifest);
    expect(a.totalCostCents).toBe(b.totalCostCents);
  });

  it('manifest changes when the verdict or numbers change', async () => {
    // Use noncommercial so view/commercial-resale produce DIFFERENT verdicts.
    const ncLic = lic('noncommercial', { attribution: { required: true } });
    const allowed = await computeSeedCost({
      seedId: 'S', license: ncLic,
      intendedUse: 'view', saleAmountCents: 10_000,
      lineage: SOLO_LINEAGE,
    });
    const denied = await computeSeedCost({
      seedId: 'S', license: ncLic,
      intendedUse: 'commercial-resale', saleAmountCents: 10_000,
      lineage: SOLO_LINEAGE,
    });
    expect(allowed.manifest).not.toBe(denied.manifest);

    // Changing sale amount under an allowed use must also change the manifest.
    const allowedB = await computeSeedCost({
      seedId: 'S', license: ncLic,
      intendedUse: 'view', saleAmountCents: 20_000,
      lineage: SOLO_LINEAGE,
    });
    expect(allowed.manifest).not.toBe(allowedB.manifest);
  });

  it('rejects negative saleAmountCents', async () => {
    await expect(computeSeedCost({
      seedId: 'S', license: lic('public-domain'),
      intendedUse: 'view', saleAmountCents: -1,
      lineage: SOLO_LINEAGE,
    })).rejects.toBeInstanceOf(RangeError);
  });
});
