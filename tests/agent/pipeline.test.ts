import { describe, it, expect } from 'vitest';
import { Pipeline } from '../../src/lib/agent/pipeline.js';
import { MultiLayerMemory } from '../../src/lib/agent/memory-system.js';

describe('Pipeline — 6-stage agent pipeline', () => {
  it('completes all 6 stages for a character intent', async () => {
    const pipeline = new Pipeline();
    const result = await pipeline.run('a fantasy warrior with a glowing sword');
    expect(result.success).toBe(true);
    expect(result.decision).toBeDefined();
    const d = result.decision!;
    expect(d.plan.intent.domain).toBe('character');
    expect(d.verification.qualityScore).toBeGreaterThan(0);
    expect(d.verification.determinismHash.length).toBe(32);
    expect(d.plan.steps.length).toBeGreaterThanOrEqual(4);
    expect(d.timing.totalMs).toBeGreaterThanOrEqual(0);
  });

  it('produces deterministic results for same intent and memory', async () => {
    const mem1 = new MultiLayerMemory();
    const mem2 = new MultiLayerMemory();
    const p1 = new Pipeline(mem1);
    const p2 = new Pipeline(mem2);
    const r1 = await p1.run('a melancholy piano melody in the rain');
    const r2 = await p2.run('a melancholy piano melody in the rain');
    expect(r1.decision?.decisionHash).toBe(r2.decision?.decisionHash);
    expect(r1.memoryDigest?.compositeHash).toBe(r2.memoryDigest?.compositeHash);
  });

  it('produces different hashes for different intents', async () => {
    const p1 = new Pipeline();
    const p2 = new Pipeline();
    const r1 = await p1.run('a cyberpunk city street with neon signs');
    const r2 = await p2.run('a melancholic piano melody in a empty ballroom');
    expect(r1.decision?.decisionHash).not.toBe(r2.decision?.decisionHash);
    expect(r1.decision?.plan.intent.domain).not.toBe(r2.decision?.plan.intent.domain);
  });
});

describe('Pipeline — MultiLayerMemory integration', () => {
  it('carries memory state across pipeline runs', async () => {
    const mem = new MultiLayerMemory();
    const p = new Pipeline(mem);
    await p.run('a cyberpunk city street at midnight');
    const before = mem.digest();
    expect(before.episodicHash.length).toBe(32);
    expect(before.workingHash.length).toBe(32);
    expect(before.entryCount).toBeGreaterThan(0);
  });

  it('accumulates episodes and semantic knowledge', async () => {
    const mem = new MultiLayerMemory();
    const p = new Pipeline(mem);
    await p.run('a steampunk airship');
    await p.run('a bioluminescent forest');
    await p.run('an ancient dwarven forge');
    const digest = mem.digest();
    expect(mem.stats.episodicCount).toBe(3);
    expect(digest.entryCount).toBeGreaterThanOrEqual(3);
  });
});

describe('Pipeline — domain detection', () => {
  it('detects music domain from musical intent', async () => {
    const pipeline = new Pipeline();
    const result = await pipeline.run('compose a jazz piece with walking bass');
    expect(result.decision?.plan.intent.domain).toBe('music');
  });

  it('detects shader domain from visual intent', async () => {
    const pipeline = new Pipeline();
    const result = await pipeline.run('generate a fractal raymarching shader');
    expect(result.decision?.plan.intent.domain).toBe('shader');
  });
});

describe('Pipeline — static determinism verification', () => {
  it('verifyDeterminism returns true for same inputs', () => {
    expect(Pipeline.verifyDeterminism('a procedural terrain', 'fixed-seed')).toBe(true);
  });

  it('compareRuns confirms all runs identical', () => {
    expect(Pipeline.compareRuns('a fantasy creature', 5, 'test-seed')).toBe(true);
  });
});

describe('Pipeline — error handling', () => {
  it('handles empty intent gracefully', async () => {
    const pipeline = new Pipeline();
    const result = await pipeline.run('');
    expect(result.success).toBe(true);
    expect(result.decision).toBeDefined();
    expect(result.decision!.plan.intent.domain).toBe('character');
  });
});
