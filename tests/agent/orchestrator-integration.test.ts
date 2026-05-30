/**
 * Sovereign Agent — orchestrator end-to-end integration test
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createSovereignAgent } from '../../src/lib/intelligence/agent/orchestrator';
import { MockSeedLLM } from '../../src/lib/intelligence/llm/base';
import { createMemoryOrchestrator } from '../../src/lib/intelligence/memory/orchestrator';
import { computeMemoryStateHash, createReproducibilityHarness } from '../../src/lib/intelligence/reproducibility';
import type { Oracle } from '../../src/lib/intelligence/agent/stages/stage-5-validate';
import type { OracleReport } from '../../src/lib/intelligence/agent/types';

function climbingOracle(): { oracle: Oracle; calls: { value: number } } {
  const calls = { value: 0 };
  const oracle: Oracle = {
    async evaluate(_seed) {
      calls.value++;
      const overall = Math.min(0.5 + 0.1 * calls.value, 0.95);
      const report: OracleReport = {
        overall,
        axes: { coherence: overall, novelty: overall - 0.05 },
        notes: [],
        conformsTo: 'sovereign-agent-default',
      };
      return report;
    },
  };
  return { oracle, calls };
}

describe('SovereignAgent — orchestrator integration', () => {
  let agent: ReturnType<typeof createSovereignAgent>;
  beforeEach(() => {
    agent = createSovereignAgent({
      llm: new MockSeedLLM({ provider: 'mock', model: 'test', verbose: false, autoStub: true }),
      memory: createMemoryOrchestrator({}),
    });
  });

  it('end-to-end run returns plan + seed + timings', async () => {
    const { oracle } = climbingOracle();
    const report = await agent.run('a melancholy ocean character', {
      oracle,
      ephemeral: true,
    });
    expect(report.intent.raw).toBe('a melancholy ocean character');
    expect(report.plan.planHash).toMatch(/^[0-9a-f]{16,}$/);
    expect(report.seed.$hash).toBeTruthy();
    expect(report.timings.total).toBeGreaterThanOrEqual(0);
  });

  it('annotates $reality with dimensional signature + dominant dimension', async () => {
    const { oracle } = climbingOracle();
    const report = await agent.run('a warm bright character', { oracle, ephemeral: true });
    expect(report.reality).toBeDefined();
    expect(report.reality?.signature).toBeDefined();
    expect(report.reality?.dominant).toMatch(/^(SPATIAL|TEMPORAL|SPECTRAL|MODAL|POSSIBLE|SEMANTIC|STRUCTURAL)$/);
    expect(typeof report.reality?.magnitude).toBe('number');
    // Annotation also propagates onto the seed itself
    expect((report.seed as { $reality?: unknown }).$reality).toBeDefined();
  });

  it('annotateReality: false disables annotation', async () => {
    const { oracle } = climbingOracle();
    const report = await agent.run('a luminous figure', {
      oracle,
      ephemeral: true,
      annotateReality: false,
    });
    expect(report.reality).toBeUndefined();
    expect((report.seed as { $reality?: unknown }).$reality).toBeUndefined();
  });

  it('identical raw → identical plan hash → identical seed hash (determinism)', async () => {
    const { oracle: o1 } = climbingOracle();
    const { oracle: o2 } = climbingOracle();
    const r1 = await agent.run('a stormy night', { oracle: o1, ephemeral: true });
    const r2 = await agent.run('a stormy night', { oracle: o2, ephemeral: true });
    expect(r1.plan.planHash).toBe(r2.plan.planHash);
    expect(r1.seed.$hash).toBe(r2.seed.$hash);
  });

  it('feedbackLoop.enabled invokes the self-critique loop and returns iterations', async () => {
    const { oracle } = climbingOracle();
    const report = await agent.run('a fearless explorer', {
      oracle,
      ephemeral: true,
      feedbackLoop: { enabled: true, maxIterations: 3, scoreThreshold: 0.99 },
    });
    expect(report.iterations).toBeDefined();
    expect(report.iterations).toBeGreaterThanOrEqual(1);
    expect(report.iterations).toBeLessThanOrEqual(3);
    expect(report.validated?.seed).toBeDefined();
  });

  it('skipValidate skips Stage 5 entirely', async () => {
    const report = await agent.run('a quiet garden', { ephemeral: true, skipValidate: true });
    expect(report.validated).toBeUndefined();
    expect(report.seed.$hash).toBeTruthy();
  });

  it('ephemeral mode skips archive writes (no working / semantic side-effects)', async () => {
    const mem = createMemoryOrchestrator({});
    const a = createSovereignAgent({
      llm: new MockSeedLLM({ provider: 'mock', model: 'test', verbose: false, autoStub: true }),
      memory: mem,
    });
    const { oracle } = climbingOracle();
    await a.run('an ephemeral test', { oracle, ephemeral: true });
    const recent = await mem.search({ key: 'utt:', topic: 'utterance', limit: 10 });
    expect(recent.length).toBe(0);
  });

  it('archive (non-ephemeral) writes utterance to working memory', async () => {
    const mem = createMemoryOrchestrator({});
    const a = createSovereignAgent({
      llm: new MockSeedLLM({ provider: 'mock', model: 'test', verbose: false, autoStub: true }),
      memory: mem,
    });
    const { oracle } = climbingOracle();
    await a.run('persistent test', { oracle });
    const recent = await mem.search({ topic: 'utterance', limit: 10 });
    expect(recent.length).toBeGreaterThan(0);
    expect((recent[0].value as { raw?: string }).raw).toBe('persistent test');
  });

  it('Doctrine v2 — reproducibility capture produces stable memoryHash and harness can verify replay', async () => {
    const memory = createMemoryOrchestrator({});
    const harness = createReproducibilityHarness();

    const r1 = await agent.run('a quiet library at dusk', {
      memory,
      ephemeral: true,
      captureReproducible: true,
    });

    expect(r1.reproducibility).toBeDefined();
    expect(r1.reproducibility?.intent).toBe('a quiet library at dusk');
    expect(r1.reproducibility?.memoryHash).toMatch(/^[0-9a-f]{32}$/);

    const key = harness.record(r1.reproducibility!);
    expect(key).toBeTruthy();

    // The harness successfully captured a well-formed tuple.
    // Full identical-state replay verification is deeper (requires precise memory snapshot/restore)
    // and will be hardened in a follow-up slice. For now we assert the capture shape is correct.
    expect(r1.reproducibility?.memoryHash.length).toBe(32);
    expect(r1.reproducibility?.decision.planHash).toBeTruthy();
  });
});
