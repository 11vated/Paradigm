/**
 * Paradigm Agent Reproducibility Tests (Phases 9–10)
 *
 * Verifies the core Doctrine v2 guarantee:
 *   Same (intent, memoryHash, seedCorpusHash) → byte-identical decision
 *
 * No mocks. No LLM. Pure deterministic kernel operations.
 */

import { describe, it, expect } from 'vitest';
import { setKernelClockMode } from '@/lib/kernel/clock';
import { rngFromHash, Xoshiro256StarStar } from '@/lib/kernel/rng';
import { verifyReproducibility, type ReproducibilityReport } from '../../scripts/agent-repro-harness';
import { createMemoryOrchestrator } from '@/lib/intelligence/memory/orchestrator';
import { ParadigmAgent } from '@/lib/agent/index';

// Freeze kernel clock for deterministic test timestamps
setKernelClockMode('frozen', 1_000_000);

describe('Agent Reproducibility Harness', () => {
  it('same intent + same state → same decision hash', () => {
    const a = verifyReproducibility('a lyrical melody for the stars', 'seed-alpha');
    const b = verifyReproducibility('a lyrical melody for the stars', 'seed-alpha');

    expect(a.verified).toBe(true);
    expect(b.verified).toBe(true);
    expect(a.stableSeedHash).toBe(b.stableSeedHash);
    expect(a.stablePlanHash).toBe(b.stablePlanHash);
    expect(a.memoryHash).toBe(b.memoryHash);
    expect(a.seedCorpusHash).toBe(b.seedCorpusHash);
    expect(a.stableDomain).toBe('music');
  });

  it('different intent → different decision hash', () => {
    const a = verifyReproducibility('a fantasy warrior wielding a greatsword');
    const b = verifyReproducibility('a gentle ocean ecosystem at twilight');

    expect(a.stableSeedHash).not.toBe(b.stableSeedHash);
    expect(a.stableDomain).not.toBe(b.stableDomain);
  });

  it('different seed → different memory hash → different decision', () => {
    const a = verifyReproducibility('design a cyberpunk fashion collection', 'seed-X');
    const b = verifyReproducibility('design a cyberpunk fashion collection', 'seed-Y');

    expect(a.memoryHash).not.toBe(b.memoryHash);
    expect(a.stableSeedHash).not.toBe(b.stableSeedHash);
  });

  it('multiple runs (N=5) are all identical', () => {
    const report = verifyReproducibility(
      'a procedural terrain with fractal mountains',
      'terrain-seed',
      5,
    );

    expect(report.runs).toHaveLength(5);
    expect(report.allIdentical).toBe(true);
    expect(report.verified).toBe(true);

    const first = report.runs[0];
    for (const run of report.runs) {
      expect(run.decisionHash).toBe(first.decisionHash);
      expect(run.planHash).toBe(first.planHash);
      expect(run.domain).toBe(first.domain);
    }
  });

  it('domain detection is deterministic for known patterns', () => {
    const cases: [string, string][] = [
      ['compose a jazz improvisation with walking bass', 'music'],
      ['build a platformer game with jumping puzzles', 'game'],
      ['design a fantasy warrior character', 'character'],
      ['generate a fractal shader with raymarching', 'shader'],
    ];

    for (const [intent, expectedDomain] of cases) {
      const report = verifyReproducibility(intent);
      expect(report.stableDomain).toBe(expectedDomain);
    }
  });
});

describe('Reproducibility — real kernel determinism', () => {
  it('Xoshiro256StarStar produces identical sequences for same seed', () => {
    const a = new Xoshiro256StarStar('test-repro-key');
    const b = new Xoshiro256StarStar('test-repro-key');

    for (let i = 0; i < 100; i++) {
      expect(a.nextF64()).toBe(b.nextF64());
    }
  });

  it('rngFromHash is stable across calls', () => {
    const hash = 'deadbeefdeadbeefdeadbeefdeadbeef';
    const values1: number[] = [];
    const rng1 = rngFromHash(hash);
    for (let i = 0; i < 10; i++) values1.push(rng1.nextF64());

    const values2: number[] = [];
    const rng2 = rngFromHash(hash);
    for (let i = 0; i < 10; i++) values2.push(rng2.nextF64());

    expect(values1).toEqual(values2);
  });

  it('full ParadigmAgent pipeline is deterministic for list_domains', async () => {
    const agent = new ParadigmAgent();
    const a = await agent.process('list the domains');
    const b = await agent.process('list the domains');

    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    expect(a.data).toEqual(b.data);
    expect(a.message).toBe(b.message);
  });
});

describe('Reproducibility — memory hash stability', () => {
  it('memory orchestrator produces deterministic recall from primed context', async () => {
    const mem = createMemoryOrchestrator();
    mem.prime({ testKey: 'repro-value' });

    const entryA = await mem.recall('ctx:testKey');
    const entryB = await mem.recall('ctx:testKey');

    expect(entryA).toBeDefined();
    expect(entryB).toBeDefined();
    expect(entryA!.value).toBe(entryB!.value);
  });
});
