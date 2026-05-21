/**
 * Tool Layer — harness + built-in tools tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createStandardHarness, type StandardToolHarness } from '../../src/lib/intelligence/tools';
import { createMemoryOrchestrator } from '../../src/lib/intelligence/memory/orchestrator';

describe('Tool Layer — harness', () => {
  let harness: StandardToolHarness;
  beforeEach(() => {
    harness = createStandardHarness(createMemoryOrchestrator({}));
  });

  it('invoking an unknown tool returns tool-not-found', async () => {
    const r = await harness.invoke({
      toolId: 'made_up_tool',
      args: {},
      ctx: { caller: 'user', airGap: true },
    });
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('tool-not-found');
  });

  it('sub-agent calling a non-granted tool returns not-granted', async () => {
    // vision is granted palette_gen but NOT name_generator
    const r = await harness.invoke({
      toolId: 'name_generator',
      args: { phrase: 'x' },
      ctx: { caller: 'vision', airGap: true },
    });
    expect(r.ok).toBe(false);
    expect(r.error?.code).toBe('not-granted');
  });

  it('user caller can invoke any tool', async () => {
    const r = await harness.invoke({
      toolId: 'kernel_now',
      args: {},
      ctx: { caller: 'user', airGap: true },
    });
    expect(r.ok).toBe(true);
    expect(typeof r.value).toBe('number');
  });

  it('harmonic_score returns a deterministic score for octave (2:1)', async () => {
    const r = await harness.invoke({
      toolId: 'harmonic_score',
      args: { a: 440, b: 880 },
      ctx: { caller: 'music-theory', airGap: true },
    });
    expect(r.ok).toBe(true);
    const v = r.value as { score: number; bestMatch: string };
    expect(v.score).toBeGreaterThan(0.95);
    expect(v.bestMatch).toBe('octave');
  });

  it('palette_gen produces a 5-color palette with the requested harmony', async () => {
    const r = await harness.invoke({
      toolId: 'palette_gen',
      args: { hue: 200, harmony: 'triadic' },
      ctx: { caller: 'vision', airGap: true },
    });
    expect(r.ok).toBe(true);
    const v = r.value as { harmony: string; palette: { role: string }[] };
    expect(v.harmony).toBe('triadic');
    expect(v.palette).toHaveLength(5);
    expect(v.palette[0].role).toBe('base');
  });

  it('name_generator is deterministic on the same phrase', async () => {
    const a = await harness.invoke({
      toolId: 'name_generator',
      args: { phrase: 'aria of the dawn', count: 3 },
      ctx: { caller: 'narrative', airGap: true },
    });
    const b = await harness.invoke({
      toolId: 'name_generator',
      args: { phrase: 'aria of the dawn', count: 3 },
      ctx: { caller: 'narrative', airGap: true },
    });
    expect(a.value).toEqual(b.value);
  });

  it('audit log captures every invocation with caller + ok + duration', async () => {
    await harness.invoke({ toolId: 'kernel_now', args: {}, ctx: { caller: 'user', airGap: true } });
    await harness.invoke({ toolId: 'unknown_tool', args: {}, ctx: { caller: 'user', airGap: true } });
    const log = harness.auditLog();
    expect(log.length).toBe(2);
    expect(log[0].toolId).toBe('kernel_now');
    expect(log[0].ok).toBe(true);
    expect(log[1].ok).toBe(false);
    expect(log[1].errorCode).toBe('tool-not-found');
  });

  it('signature_for returns dimensional signature with required axes', async () => {
    const r = await harness.invoke({
      toolId: 'signature_for',
      args: { geneType: 'music' },
      ctx: { caller: 'user', airGap: true },
    });
    expect(r.ok).toBe(true);
    const v = r.value as { weights: { SPECTRAL: number } };
    expect(v.weights.SPECTRAL).toBeGreaterThan(0);
  });

  it('archetype_lookup classify by 12-D vector returns an archetype', async () => {
    const r = await harness.invoke({
      toolId: 'archetype_lookup',
      args: {
        query: 'classify',
        name: 'unused',
        vector: [0.4, 0.6, 0.5, 0.3, 0.6, 0.5, 0.4, 0.7, 0.2, 0.5, 0.3, 0.6],
      },
      ctx: { caller: 'personality', airGap: true },
    });
    expect(r.ok).toBe(true);
    expect(typeof (r.value as { archetype: string }).archetype).toBe('string');
  });
});
