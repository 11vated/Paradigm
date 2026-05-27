/**
 * Lineage royalty — Doctrine v2 Part VIII.17 v1.
 *
 * Exit-gate-adjacent: "lineage royalties at depth" — every fork pays
 * back the chain that produced it, with a deterministic, integer-
 * arithmetic, on-chain-anchorable manifest.
 */
import { describe, it, expect } from 'vitest';
import {
  computeLineageRoyalty,
  type LineageNode,
  type LineageResolver,
} from '../../src/lib/kernel/lineage-royalty';

function buildResolver(nodes: LineageNode[]): LineageResolver {
  const m = new Map(nodes.map((n) => [n.seedId, n]));
  return async (seedId: string) => m.get(seedId) ?? null;
}

describe('Doctrine v2 Part VIII.17 — lineage royalty waterfall', () => {
  it('single seed (no parents): author 95%, platform 5%, no ancestors', async () => {
    const resolve = buildResolver([
      { seedId: 'S', authorAddress: '0xAuthor', parents: [] },
    ]);
    const r = await computeLineageRoyalty({ seedId: 'S', saleAmountCents: 10_000, resolveLineage: resolve });
    expect(r.totalCents).toBe(10_000);
    expect(r.splits.length).toBe(2);
    const author = r.splits.find((s) => s.role === 'author')!;
    const platform = r.splits.find((s) => s.role === 'platform')!;
    expect(author.cents).toBe(9_500);
    expect(platform.cents).toBe(500);
  });

  it('one parent: author 80%, platform 5%, parent gets full 15%', async () => {
    const resolve = buildResolver([
      { seedId: 'child', authorAddress: '0xChild', parents: ['parent'] },
      { seedId: 'parent', authorAddress: '0xParent', parents: [] },
    ]);
    const r = await computeLineageRoyalty({ seedId: 'child', saleAmountCents: 10_000, resolveLineage: resolve });
    expect(r.totalCents).toBe(10_000);
    const author = r.splits.find((s) => s.role === 'author')!;
    const platform = r.splits.find((s) => s.role === 'platform')!;
    const ancestors = r.splits.filter((s) => s.role === 'ancestor');
    expect(author.cents).toBe(8_000);
    expect(platform.cents).toBe(500);
    expect(ancestors.length).toBe(1);
    expect(ancestors[0].cents).toBe(1_500);
    expect(ancestors[0].depth).toBe(1);
    expect(ancestors[0].seedId).toBe('parent');
  });

  it('three-generation chain: ancestor budget decays geometrically (0.5)', async () => {
    const resolve = buildResolver([
      { seedId: 'great-grandchild', authorAddress: '0xGGC', parents: ['grandchild'] },
      { seedId: 'grandchild',       authorAddress: '0xGC',  parents: ['child'] },
      { seedId: 'child',            authorAddress: '0xC',   parents: ['parent'] },
      { seedId: 'parent',           authorAddress: '0xP',   parents: [] },
    ]);
    const r = await computeLineageRoyalty({ seedId: 'great-grandchild', saleAmountCents: 10_000, resolveLineage: resolve });
    const ancestors = r.splits.filter((s) => s.role === 'ancestor');
    expect(ancestors.length).toBe(3);
    expect(ancestors.map((a) => a.depth)).toEqual([1, 2, 3]);
    expect(ancestors.map((a) => a.seedId)).toEqual(['grandchild', 'child', 'parent']);
    // weights 1, 0.5, 0.25  =>  4/7, 2/7, 1/7 of 1500
    // floor(1500 * 4/7) = 857, floor(1500 * 2/7) = 428, last gets remainder
    expect(ancestors[0].cents).toBe(857);
    expect(ancestors[1].cents).toBe(428);
    expect(ancestors[2].cents).toBe(1500 - 857 - 428); // 215
    expect(r.totalCents).toBe(10_000);
  });

  it('respects maxDepth: chain longer than maxDepth ignores deeper ancestors', async () => {
    // 10-deep chain
    const chain: LineageNode[] = [];
    for (let i = 0; i < 10; i++) {
      chain.push({ seedId: `S${i}`, authorAddress: `0x${i}`, parents: i < 9 ? [`S${i + 1}`] : [] });
    }
    const resolve = buildResolver(chain);
    const r = await computeLineageRoyalty({ seedId: 'S0', saleAmountCents: 10_000, resolveLineage: resolve, maxDepth: 3 });
    const ancestors = r.splits.filter((s) => s.role === 'ancestor');
    expect(ancestors.length).toBe(3);
    expect(r.totalCents).toBe(10_000);
  });

  it('cycle guard: a parent cycle does not produce infinite ancestors', async () => {
    const resolve = buildResolver([
      { seedId: 'A', authorAddress: '0xA', parents: ['B'] },
      { seedId: 'B', authorAddress: '0xB', parents: ['A'] },
    ]);
    const r = await computeLineageRoyalty({ seedId: 'A', saleAmountCents: 10_000, resolveLineage: resolve, maxDepth: 8 });
    const ancestors = r.splits.filter((s) => s.role === 'ancestor');
    expect(ancestors.length).toBeLessThanOrEqual(2);
    expect(r.totalCents).toBe(10_000);
  });

  it('integer arithmetic: $100.00 sale produces splits summing to exactly 10000 cents', async () => {
    const resolve = buildResolver([
      { seedId: 'A', authorAddress: '0xA', parents: ['B'] },
      { seedId: 'B', authorAddress: '0xB', parents: ['C'] },
      { seedId: 'C', authorAddress: '0xC', parents: [] },
    ]);
    const r = await computeLineageRoyalty({ seedId: 'A', saleAmountCents: 10_000, resolveLineage: resolve });
    expect(r.totalCents).toBe(10_000);
  });

  it('odd-cent sale: rounding remainder sweeps into platform; total still exact', async () => {
    const resolve = buildResolver([
      { seedId: 'A', authorAddress: '0xA', parents: ['B'] },
      { seedId: 'B', authorAddress: '0xB', parents: [] },
    ]);
    // $10.07 / 1007 cents — known to leave a rounding remainder
    const r = await computeLineageRoyalty({ seedId: 'A', saleAmountCents: 1007, resolveLineage: resolve });
    expect(r.totalCents).toBe(1007);
    // Sum of all splits equals exact sale amount.
    expect(r.splits.reduce((s, x) => s + x.cents, 0)).toBe(1007);
  });

  it('zero sale: zero everywhere, manifest still emitted', async () => {
    const resolve = buildResolver([
      { seedId: 'A', authorAddress: '0xA', parents: [] },
    ]);
    const r = await computeLineageRoyalty({ seedId: 'A', saleAmountCents: 0, resolveLineage: resolve });
    expect(r.totalCents).toBe(0);
    for (const s of r.splits) expect(s.cents).toBe(0);
    expect(r.manifest).toMatch(/^[0-9a-f]{64}$/);
  });

  it('manifest is deterministic across identical inputs', async () => {
    const make = () => computeLineageRoyalty({
      seedId: 'A',
      saleAmountCents: 49_999,
      resolveLineage: buildResolver([
        { seedId: 'A', authorAddress: '0xA', parents: ['B'] },
        { seedId: 'B', authorAddress: '0xB', parents: ['C'] },
        { seedId: 'C', authorAddress: '0xC', parents: [] },
      ]),
    });
    const [a, b] = await Promise.all([make(), make()]);
    expect(a.manifest).toBe(b.manifest);
    expect(a.totalCents).toBe(b.totalCents);
    expect(JSON.stringify(a.splits)).toBe(JSON.stringify(b.splits));
  });

  it('manifest changes when any split changes', async () => {
    const a = await computeLineageRoyalty({
      seedId: 'A', saleAmountCents: 10_000,
      resolveLineage: buildResolver([{ seedId: 'A', authorAddress: '0xA', parents: [] }]),
    });
    const b = await computeLineageRoyalty({
      seedId: 'A', saleAmountCents: 10_000,
      resolveLineage: buildResolver([{ seedId: 'A', authorAddress: '0xDIFFERENT', parents: [] }]),
    });
    expect(a.manifest).not.toBe(b.manifest);
  });

  it('rejects negative sale amount', async () => {
    const resolve = buildResolver([{ seedId: 'A', authorAddress: '0xA', parents: [] }]);
    await expect(computeLineageRoyalty({ seedId: 'A', saleAmountCents: -1, resolveLineage: resolve })).rejects.toBeInstanceOf(RangeError);
  });

  it('rejects ancestor + platform share >= 100%', async () => {
    const resolve = buildResolver([{ seedId: 'A', authorAddress: '0xA', parents: [] }]);
    await expect(
      computeLineageRoyalty({ seedId: 'A', saleAmountCents: 10_000, resolveLineage: resolve, ancestorShareBp: 9000, platformShareBp: 1500 }),
    ).rejects.toBeInstanceOf(RangeError);
  });
});
