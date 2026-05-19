/**
 * Quality Contract conformance — Friend pilot.
 *
 * Verifies the Friend generator passes all 5 clauses of the Paradigm
 * Quality Contract. Also verifies the contract framework itself
 * (registry, runner, leaderboard formatting).
 */

import { describe, it, expect } from 'vitest';
import {
  runConformance, runAllConformance, formatLeaderboard,
  getContract, listContracts, registerContract,
  type QualityContract, type ConformanceResult,
} from '@/lib/kernel/quality-contract';
import { FriendQualityContract } from '@/lib/friend';

describe('Quality Contract framework', () => {
  it('registers and finds contracts', () => {
    expect(getContract('friend')).toBe(FriendQualityContract);
    expect(listContracts()).toContain(FriendQualityContract);
  });

  it('formats leaderboards even when empty', () => {
    expect(formatLeaderboard([])).toContain('(no contracts');
  });
});

describe('FriendQualityContract — conformance', () => {
  let result: ConformanceResult;

  it('runs the full suite cleanly', async () => {
    result = await runConformance(FriendQualityContract);
    expect(result.domain).toBe('friend');
    expect(result.version).toBe('1.0.0');
  });

  it('passes Clause 1 (synthesize)', async () => {
    if (!result) result = await runConformance(FriendQualityContract);
    expect(result.clauses.synthesize.passed).toBe(true);
    expect(result.clauses.synthesize.detail).toContain('synthesized');
  });

  it('passes Clause 2 (invert)', async () => {
    if (!result) result = await runConformance(FriendQualityContract);
    expect(result.clauses.invert.passed).toBe(true);
    expect((result.clauses.invert.evidence as any)?.keys).toContain('body');
  });

  it('passes Clause 3 (rate)', async () => {
    if (!result) result = await runConformance(FriendQualityContract);
    expect(result.clauses.rate.passed).toBe(true);
    const score = (result.clauses.rate.evidence as any)?.score;
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0.6);
  });

  it('passes Clause 4 (curate ≥ 3 unique seeds)', async () => {
    if (!result) result = await runConformance(FriendQualityContract);
    expect(result.clauses.curate.passed).toBe(true);
    const count = (result.clauses.curate.evidence as any)?.count;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('passes Clause 5 (deterministic — byte-identical across runs)', async () => {
    if (!result) result = await runConformance(FriendQualityContract);
    expect(result.clauses.deterministic.passed).toBe(true);
  });

  it('FriendQualityContract is canonical (all 5 clauses pass)', async () => {
    if (!result) result = await runConformance(FriendQualityContract);
    expect(result.passed).toBe(true);
    expect(result.summary).toContain('canonical');
  });
});

describe('FriendQualityContract — rate function', () => {
  it('curated seeds all score ≥ 0.6', async () => {
    for (const c of FriendQualityContract.curated()) {
      const art = await FriendQualityContract.synthesize(c.seed);
      const r = await FriendQualityContract.rate(art);
      expect(r.score, `${c.name} (${c.id}) should rate ≥ 0.6 but got ${r.score}`).toBeGreaterThanOrEqual(0.6);
    }
  });

  it('rate breakdown includes the expected axes', async () => {
    const curated = FriendQualityContract.curated();
    const art = await FriendQualityContract.synthesize(curated[0].seed);
    const r = await FriendQualityContract.rate(art);
    expect(r.axes).toHaveProperty('portrait');
    expect(r.axes).toHaveProperty('voice');
    expect(r.axes).toHaveProperty('body');
    expect(r.axes).toHaveProperty('personaVector');
    expect(r.axes).toHaveProperty('pose');
  });
});

describe('runAllConformance', () => {
  it('returns a sorted leaderboard with the friend contract', async () => {
    const results = await runAllConformance();
    expect(results.length).toBeGreaterThan(0);
    expect(results.find((r) => r.domain === 'friend')).toBeDefined();
    // Passed contracts come first
    let sawFailing = false;
    for (const r of results) {
      if (!r.passed) sawFailing = true;
      else if (sawFailing) throw new Error('passed contract should come before any failing one');
    }
  });

  it('produces a formatted leaderboard string', async () => {
    const results = await runAllConformance();
    const printed = formatLeaderboard(results);
    expect(printed).toContain('Generator Quality Contract');
    expect(printed).toContain('friend');
  });
});

describe('runConformance — failure detection', () => {
  it('detects a non-deterministic generator', async () => {
    const flaky: QualityContract<{ seed: string }, { value: number }, { value: number }> = {
      domain: 'flaky-test',
      version: '0.0.1',
      synthesize: () => ({ value: Math.random() }), // non-deterministic
      invert: (a) => ({ value: a.value }),
      rate: (a) => ({ score: 1, axes: { value: 1 } }),
      curated: () => [
        { id: 'f1', name: 'F1', seed: { seed: 'a' }, intent: 'flaky' },
        { id: 'f2', name: 'F2', seed: { seed: 'b' }, intent: 'flaky' },
        { id: 'f3', name: 'F3', seed: { seed: 'c' }, intent: 'flaky' },
      ],
    };
    const r = await runConformance(flaky);
    expect(r.clauses.deterministic.passed).toBe(false);
    expect(r.passed).toBe(false);
  });

  it('detects a too-small curated library', async () => {
    const tiny: QualityContract<{}, {}, {}> = {
      domain: 'tiny-test',
      version: '0.0.1',
      synthesize: () => ({}),
      invert: () => ({}),
      rate: () => ({ score: 1, axes: {} }),
      curated: () => [{ id: 't1', name: 'T1', seed: {}, intent: 'tiny' }],
    };
    const r = await runConformance(tiny);
    expect(r.clauses.curate.passed).toBe(false);
    expect(r.clauses.curate.detail).toContain('requires ≥ 3');
  });

  it('detects an invalid rate score', async () => {
    const bad: QualityContract<{}, {}, {}> = {
      domain: 'bad-rate-test',
      version: '0.0.1',
      synthesize: () => ({}),
      invert: () => ({}),
      rate: () => ({ score: 1.5, axes: { a: 1 } }) as any, // out of [0,1]
      curated: () => [
        { id: 'b1', name: 'B1', seed: {}, intent: '' },
        { id: 'b2', name: 'B2', seed: {}, intent: '' },
        { id: 'b3', name: 'B3', seed: {}, intent: '' },
      ],
    };
    const r = await runConformance(bad);
    expect(r.clauses.rate.passed).toBe(false);
  });
});
