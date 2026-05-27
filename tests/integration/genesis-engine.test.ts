/**
 * Genesis engine — Doctrine v2 Part XII v1.
 *
 * The hero loop's substrate. Tests prove:
 *   - Determinism: same token → same seed, every time.
 *   - Uniqueness: different tokens → different seeds.
 *   - Fork integrity: child carries parent in lineage.
 *   - Grade: every genesis seed passes its self-grade.
 *   - License: default license allows remix.
 *   - Cost: free for non-commercial, royalty-due for commercial.
 *   - Soul card aesthetics: palette/glyph/name/tone all derived stably.
 */
import { describe, it, expect } from 'vitest';
import {
  genesisFromToken,
  packageGenesis,
  permalinkOf,
  authorTokenOf,
  newSessionToken,
  genesisSelfCheck,
} from '../../src/lib/genesis/genesis-engine';
import { evaluateLicense } from '../../src/lib/kernel/seed-license';

describe('Doctrine v2 Part XII — genesis engine', () => {
  it('produces a deterministic seed from a token', () => {
    const a = genesisFromToken('hello-world');
    const b = genesisFromToken('hello-world');
    expect(a).toEqual(b);
    expect(a.$hash).toBe(b.$hash);
  });

  it('different tokens produce different seeds', () => {
    const a = genesisFromToken('alice');
    const b = genesisFromToken('bob');
    expect(a.$hash).not.toBe(b.$hash);
    expect(a.genes.soulCard.name).not.toBe(b.genes.soulCard.name);
  });

  it('soul card has palette, glyph, name, and tone', () => {
    const seed = genesisFromToken('aesthetic-test');
    const sc = seed.genes.soulCard;
    expect(sc.palette).toHaveLength(3);
    for (const color of sc.palette) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(sc.glyph.symmetry).toBeGreaterThanOrEqual(3);
    expect(sc.glyph.symmetry).toBeLessThanOrEqual(12);
    expect(sc.name.length).toBeGreaterThanOrEqual(4);
    expect(sc.tone.pitchHz).toBeGreaterThanOrEqual(20);
    expect(sc.tone.pitchHz).toBeLessThanOrEqual(20000);
    expect(sc.tone.rhythm).toBeGreaterThanOrEqual(0);
    expect(sc.tone.rhythm).toBeLessThanOrEqual(255);
  });

  it('genes fall in [0, 1]', () => {
    const seed = genesisFromToken('range-test');
    expect(seed.genes.disposition).toBeGreaterThanOrEqual(0);
    expect(seed.genes.disposition).toBeLessThanOrEqual(1);
    expect(seed.genes.curiosity).toBeGreaterThanOrEqual(0);
    expect(seed.genes.curiosity).toBeLessThanOrEqual(1);
    expect(seed.genes.resonance).toBeGreaterThanOrEqual(0);
    expect(seed.genes.resonance).toBeLessThanOrEqual(1);
  });

  it('author token is stable but anonymizes the session', () => {
    const t1 = authorTokenOf('session-A');
    const t2 = authorTokenOf('session-A');
    const t3 = authorTokenOf('session-B');
    expect(t1).toBe(t2);
    expect(t1).not.toBe(t3);
    expect(t1).not.toContain('session-A');
    expect(t1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('newSessionToken produces unique 48-hex tokens', () => {
    const a = newSessionToken();
    const b = newSessionToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f]{48}$/);
  });

  it('permalink is short and deterministic', () => {
    const seed = genesisFromToken('permalink-test');
    expect(permalinkOf(seed)).toBe(`/genesis/${seed.$hash.slice(0, 16)}`);
    expect(permalinkOf(seed)).toBe(permalinkOf(genesisFromToken('permalink-test')));
  });

  it('package binds license, cost, grade, and URLs', async () => {
    const seed = genesisFromToken('package-test');
    const pkg = await packageGenesis(seed);
    expect(pkg.seed.$hash).toBe(seed.$hash);
    expect(pkg.license.type).toBe('attribution');
    expect(pkg.license.custodian).toBe(seed.$sovereignty.authorToken);
    expect(pkg.grade.score).toBeGreaterThanOrEqual(50);
    expect(pkg.permalink).toContain('/genesis/');
    expect(pkg.forkUrl).toContain('/fork');
  });

  it('default license allows view, remix, and commercial', async () => {
    const seed = genesisFromToken('license-test');
    const pkg = await packageGenesis(seed);
    expect(evaluateLicense(pkg.license, 'view').allowed).toBe(true);
    expect(evaluateLicense(pkg.license, 'remix').allowed).toBe(true);
    expect(evaluateLicense(pkg.license, 'commercial-resale').allowed).toBe(true);
  });

  it('commercial cost has royalty splits to the author', async () => {
    const seed = genesisFromToken('cost-test');
    const pkg = await packageGenesis(seed);
    expect(pkg.costIfCommercial.allowed).toBe(true);
    const authorSplit = pkg.costIfCommercial.splits?.find(
      (s) => s.address === seed.$sovereignty.authorToken,
    );
    expect(authorSplit).toBeDefined();
    expect(authorSplit!.cents).toBeGreaterThan(0);
  });

  it('fork preserves parent in lineage', () => {
    const parent = genesisFromToken('parent-token');
    const child = genesisFromToken('child-token', [parent.$hash]);
    expect(child.$lineage.parents).toEqual([parent.$hash]);
    expect(child.$lineage.depth).toBe(1);
    expect(child.$hash).not.toBe(parent.$hash);
  });

  it('fork chains compose to arbitrary depth', () => {
    const a = genesisFromToken('a');
    const b = genesisFromToken('b', [a.$hash]);
    const c = genesisFromToken('c', [b.$hash]);
    const d = genesisFromToken('d', [c.$hash]);
    expect(d.$lineage.depth).toBe(1); // parents are only direct
    expect(d.$lineage.parents[0]).toBe(c.$hash);
  });

  it('every genesis seed grades above the floor', async () => {
    for (const token of ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta']) {
      const pkg = await packageGenesis(genesisFromToken(token));
      expect(pkg.grade.score).toBeGreaterThanOrEqual(50);
      const failed = pkg.grade.clauses.filter((c) => !c.passed);
      expect(failed).toEqual([]);
    }
  });

  it('selfCheck is healthy', async () => {
    const check = await genesisSelfCheck();
    expect(check.ok).toBe(true);
  });
});
