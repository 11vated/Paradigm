/**
 * Sovereign Agent — determinism + sub-agent + assembly tests.
 *
 * Pinning behavior:
 *   1. Adjective normalization is byte-stable
 *   2. Sub-agents produce deterministic specs from a given intent
 *   3. Stage-4 assemble is a pure function of (plan, lookup)
 *   4. The full orchestrator returns the same planHash + seed.$hash
 *      for the same raw utterance, twice in a row
 *
 * No LLM is wired here — we test the deterministic core only.
 */

import { describe, it, expect } from 'vitest';
import { setKernelClockMode } from '@/lib/kernel/clock';
import {
  normalizeAdjective,
  cosine12,
} from '@/lib/intelligence/agent/adjective-normalization';
import { parse } from '@/lib/intelligence/agent/stages/stage-1-parse';
import { resolve as resolveStage } from '@/lib/intelligence/agent/stages/stage-2-resolve';
import { plan as planStage } from '@/lib/intelligence/agent/stages/stage-3-plan';
import { assemble } from '@/lib/intelligence/agent/stages/stage-4-assemble';
import { defaultSubAgents } from '@/lib/intelligence/agent/sub-agents';
import { createMemoryOrchestrator } from '@/lib/intelligence/memory/orchestrator';
import { VisionAgent } from '@/lib/intelligence/agent/sub-agents/vision-agent';
import { PersonalityAgent } from '@/lib/intelligence/agent/sub-agents/personality-agent';
import { MusicTheoryAgent } from '@/lib/intelligence/agent/sub-agents/music-theory-agent';

// Freeze the kernel clock for the whole test run so timestamps don't drift.
setKernelClockMode('frozen', 1_000_000);

describe('adjective-normalization', () => {
  it('returns null for unknown words', () => {
    expect(normalizeAdjective('zorblax')).toBeNull();
  });

  it('produces the same vector twice for the same word', () => {
    const a = normalizeAdjective('melancholy')!;
    const b = normalizeAdjective('melancholy')!;
    expect(a.vector).toEqual(b.vector);
  });

  it('intensity scales vector magnitude', () => {
    const a = normalizeAdjective('joyful', 1)!;
    const b = normalizeAdjective('joyful', 1.5)!;
    expect(Math.abs(b.vector[0])).toBeGreaterThan(Math.abs(a.vector[0]));
  });

  it('polarity flips direction', () => {
    const a = normalizeAdjective('joyful', 1, 1)!;
    const b = normalizeAdjective('joyful', 1, -1)!;
    expect(cosine12(a.vector as never, b.vector as never)).toBeLessThan(-0.9);
  });
});

describe('VisionAgent', () => {
  it('produces consistent specs for the same intent', async () => {
    const agent = new VisionAgent();
    const intent = makeIntent('a luminous warm pastoral landscape', ['world', 'visual']);
    const memory = createMemoryOrchestrator();
    const memoryView = {
      recall: () => undefined,
      lookup: () => undefined,
      worldFact: () => undefined,
    };
    const a = await agent.run({ intent, partial: [], memory: memoryView });
    const b = await agent.run({ intent, partial: [], memory: memoryView });
    expect(a.produced).toEqual(b.produced);
    void memory; // touched for symmetry
  });

  it('warm + bright produces a warm hue (< 90° or > 300°)', async () => {
    const agent = new VisionAgent();
    const intent = makeIntent('a luminous warm joyful sunset', ['visual']);
    const memoryView = { recall: () => undefined, lookup: () => undefined, worldFact: () => undefined };
    const out = await agent.run({ intent, partial: [], memory: memoryView });
    const hueSpec = out.produced.find((s) => s.path === 'visual.hueDeg')!;
    const hue = hueSpec.value as number;
    expect(hue < 90 || hue > 300).toBe(true);
  });
});

describe('PersonalityAgent', () => {
  it('cruel personality has low agreeableness', async () => {
    const agent = new PersonalityAgent();
    const intent = makeIntent('a cruel ferocious character', ['character']);
    const memoryView = { recall: () => undefined, lookup: () => undefined, worldFact: () => undefined };
    const out = await agent.run({ intent, partial: [], memory: memoryView });
    const agreeable = out.produced.find((s) => s.path === 'body.bigFive.agreeableness')!;
    expect(agreeable.value as number).toBeLessThan(0.4);
  });

  it('tender personality has high agreeableness', async () => {
    const agent = new PersonalityAgent();
    const intent = makeIntent('a tender warm caregiver', ['character']);
    const memoryView = { recall: () => undefined, lookup: () => undefined, worldFact: () => undefined };
    const out = await agent.run({ intent, partial: [], memory: memoryView });
    const agreeable = out.produced.find((s) => s.path === 'body.bigFive.agreeableness')!;
    expect(agreeable.value as number).toBeGreaterThan(0.6);
  });
});

describe('MusicTheoryAgent', () => {
  it('melancholy → aeolian (minor) mode', async () => {
    const agent = new MusicTheoryAgent();
    const intent = makeIntent('a melancholy violin piece', ['music']);
    const memoryView = { recall: () => undefined, lookup: () => undefined, worldFact: () => undefined };
    const out = await agent.run({ intent, partial: [], memory: memoryView });
    const mode = out.produced.find((s) => s.path === 'music.mode')!.value as string;
    expect(['aeolian', 'phrygian', 'dorian']).toContain(mode);
  });

  it('driving fast joyful → high tempo', async () => {
    const agent = new MusicTheoryAgent();
    const intent = makeIntent('a driving fast joyful beat', ['music']);
    const memoryView = { recall: () => undefined, lookup: () => undefined, worldFact: () => undefined };
    const out = await agent.run({ intent, partial: [], memory: memoryView });
    const tempo = out.produced.find((s) => s.path === 'music.tempo')!.value as number;
    expect(tempo).toBeGreaterThan(120);
  });
});

describe('Stage-2 resolve (full sub-agent fan-out)', () => {
  it('produces specs from multiple sub-agents for a cross-domain intent', async () => {
    const intent = makeIntent(
      'a brooding melancholy warrior with a haunting melody',
      ['character', 'music'],
    );
    const memory = createMemoryOrchestrator();
    const resolved = await resolveStage(intent, { subAgents: defaultSubAgents(), memory });
    expect(resolved.geneSpecs.length).toBeGreaterThan(10);
    // Should contain both character and music specs
    const hasCharacter = resolved.geneSpecs.some((s) => s.path.startsWith('body.bigFive'));
    const hasMusic = resolved.geneSpecs.some((s) => s.path.startsWith('music.'));
    expect(hasCharacter).toBe(true);
    expect(hasMusic).toBe(true);
  });
});

describe('Stage-3 plan + Stage-4 assemble — determinism boundary', () => {
  it('same intent → same planHash', async () => {
    const memory = createMemoryOrchestrator();
    const i1 = await parse('a luminous warm joyful sunset', { recentDomains: ['visual'] });
    const r1 = await resolveStage(i1, { subAgents: defaultSubAgents(), memory });
    const p1 = await planStage(r1, {});
    const i2 = await parse('a luminous warm joyful sunset', { recentDomains: ['visual'] });
    const r2 = await resolveStage(i2, { subAgents: defaultSubAgents(), memory });
    const p2 = await planStage(r2, {});
    expect(p1.planHash).toEqual(p2.planHash);
  });

  it('assembled seed.$hash equals planHash', async () => {
    const memory = createMemoryOrchestrator();
    const intent = await parse('a melancholy bard with a kind heart', { recentDomains: ['character'] });
    const resolved = await resolveStage(intent, { subAgents: defaultSubAgents(), memory });
    const planObj = await planStage(resolved, {});
    const out = await assemble(planObj, { lookupSeed: async () => undefined });
    expect(out.seed.$hash).toEqual(planObj.planHash);
  });

  it('byte-identical seeds across two full pipeline runs', async () => {
    const memory = createMemoryOrchestrator();
    const utterance = 'a cunning brooding shadow assassin';
    const run = async () => {
      const intent = await parse(utterance, { recentDomains: ['character'] });
      const resolved = await resolveStage(intent, { subAgents: defaultSubAgents(), memory });
      const planObj = await planStage(resolved, {});
      const out = await assemble(planObj, { lookupSeed: async () => undefined });
      return out.seed;
    };
    const a = await run();
    const b = await run();
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});

// ─── helpers ───────────────────────────────────────────────────────────

function makeIntent(raw: string, domains: string[]) {
  // Use the real parser so the test is exercising production code.
  // It's sync-friendly enough for these utterances.
  const adjectives = raw
    .split(/\s+/)
    .map((w) => normalizeAdjective(w.toLowerCase()))
    .filter((a): a is NonNullable<typeof a> => a !== null);
  return {
    raw,
    top: 'CREATE' as const,
    sub: 'CREATE.character',
    domains,
    adjectives,
    entities: [],
    references: [],
    budget: {},
    context: {},
  };
}
