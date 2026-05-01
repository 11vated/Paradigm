/**
 * Phase 6 tests — Swarm orchestration + deterministic inference adapter.
 *
 * These exercise the real orchestrator end-to-end using the deterministic
 * client, so no mocks, no fixtures, no Phi-4 dependency. If these ever go
 * red, the agent layer's coordination contract has genuinely regressed.
 */
import { describe, it, expect } from 'vitest';
import {
  SwarmOrchestrator,
  DEFAULT_ROLES,
  parseVerdict,
  type SwarmRole,
} from '../../src/lib/agent/swarm.js';
import { DeterministicInferenceClient } from '../../src/lib/agent/deterministic_inference.js';
import { InferenceTier } from '../../src/lib/agent/types.js';

// ─── parseVerdict ───────────────────────────────────────────────────────────

describe('parseVerdict', () => {
  it('returns null when no VERDICT marker is present', () => {
    expect(parseVerdict('Looks fine.')).toBeNull();
  });

  it('returns "ship" and "revise" case-insensitively', () => {
    expect(parseVerdict('VERDICT: ship')).toBe('ship');
    expect(parseVerdict('Verdict : Revise — do more work.')).toBe('revise');
    expect(parseVerdict('VERDICT:SHIP')).toBe('ship');
  });

  it('takes the last verdict when multiple appear', () => {
    expect(parseVerdict('VERDICT: ship\n...\nVERDICT: revise')).toBe('revise');
    expect(parseVerdict('VERDICT: revise\nVERDICT: ship')).toBe('ship');
  });

  it('ignores non-standard variants', () => {
    expect(parseVerdict('verdict: maybe')).toBeNull();
  });
});

// ─── DeterministicInferenceClient ───────────────────────────────────────────

describe('DeterministicInferenceClient', () => {
  it('reports all tiers available by default', () => {
    const c = new DeterministicInferenceClient();
    expect(c.isAvailable(InferenceTier.KERNEL)).toBe(true);
    expect(c.isAvailable(InferenceTier.FAST)).toBe(true);
    expect(c.isAvailable(InferenceTier.STANDARD)).toBe(true);
    expect(c.isAvailable(InferenceTier.DEEP)).toBe(true);
    expect(c.maxAvailableTier()).toBe(InferenceTier.DEEP);
  });

  it('falls back from unavailable tiers to the highest available', async () => {
    const c = new DeterministicInferenceClient({
      availableTiers: { [InferenceTier.DEEP]: false, [InferenceTier.STANDARD]: false },
    });
    const r = await c.generate({ prompt: 'hi', maxTokens: 100, temperature: 0.5 }, InferenceTier.DEEP);
    expect(r.tier).toBe(InferenceTier.FAST);
  });

  it('is deterministic across identical calls', async () => {
    const c = new DeterministicInferenceClient();
    const req = { prompt: 'design a living bridge', maxTokens: 128, temperature: 0.7 };
    const a = await c.generate(req, InferenceTier.STANDARD);
    const b = await c.generate(req, InferenceTier.STANDARD);
    expect(a.text).toBe(b.text);
    expect(a.tokensUsed).toBe(b.tokensUsed);
  });

  it('different tiers produce different outputs', async () => {
    const c = new DeterministicInferenceClient();
    const req = { prompt: 'same prompt', maxTokens: 128, temperature: 0.5 };
    const fast = await c.generate(req, InferenceTier.FAST);
    const deep = await c.generate(req, InferenceTier.DEEP);
    expect(fast.text).not.toBe(deep.text);
    // Deeper tiers should emit more tokens (more sentences).
    expect(deep.tokensUsed).toBeGreaterThanOrEqual(fast.tokensUsed);
  });

  it('applies finalize hook when provided', async () => {
    const c = new DeterministicInferenceClient({
      finalize: (body) => `${body} VERDICT: ship`,
    });
    const r = await c.generate({ prompt: 'x', maxTokens: 64, temperature: 0 }, InferenceTier.STANDARD);
    expect(r.text.endsWith('VERDICT: ship')).toBe(true);
  });

  it('health reflects availability config', async () => {
    const c = new DeterministicInferenceClient({ availableTiers: { [InferenceTier.DEEP]: false } });
    const h = await c.health();
    expect(h.available).toBe(true);
    expect(h.tiers[InferenceTier.DEEP]).toBe(false);
    expect(h.tiers[InferenceTier.STANDARD]).toBe(true);
  });
});

// ─── SwarmOrchestrator ──────────────────────────────────────────────────────

describe('SwarmOrchestrator — construction', () => {
  it('rejects empty roles', () => {
    const client = new DeterministicInferenceClient();
    expect(() => new SwarmOrchestrator({ roles: [], client })).toThrow(/non-empty/);
  });

  it('rejects duplicate role ids', () => {
    const client = new DeterministicInferenceClient();
    const r: SwarmRole = { ...DEFAULT_ROLES.idea };
    expect(() => new SwarmOrchestrator({ roles: [r, r], client })).toThrow(/duplicate role id/);
  });
});

describe('SwarmOrchestrator — run', () => {
  it('runs every role in order and records turns', async () => {
    const client = new DeterministicInferenceClient();
    const orch = new SwarmOrchestrator({
      roles: [DEFAULT_ROLES.idea, DEFAULT_ROLES.style, DEFAULT_ROLES.critic],
      client,
    });
    const out = await orch.run('Design a cathedral grown from coral.');
    expect(out.turns).toHaveLength(3);
    expect(out.turns[0].roleId).toBe('idea');
    expect(out.turns[1].roleId).toBe('style');
    expect(out.turns[2].roleId).toBe('critic');
    expect(out.totalLatencyMs).toBeGreaterThan(0);
    expect(out.totalTokens).toBeGreaterThan(0);
    expect(out.finalOutput).toBe(out.turns[2].output);
  });

  it('shares prior transcript into each subsequent turn by default', async () => {
    const client = new DeterministicInferenceClient();
    const orch = new SwarmOrchestrator({
      roles: [DEFAULT_ROLES.idea, DEFAULT_ROLES.style],
      client,
    });
    const out = await orch.run('some prompt');
    // The second role's prompt must contain the first role's output.
    expect(out.turns[1].prompt).toContain(out.turns[0].output);
  });

  it('isolates roles when shareTranscript=false', async () => {
    const client = new DeterministicInferenceClient();
    const orch = new SwarmOrchestrator({
      roles: [DEFAULT_ROLES.idea, DEFAULT_ROLES.style],
      client,
      shareTranscript: false,
    });
    const out = await orch.run('some prompt');
    expect(out.turns[1].prompt).not.toContain(out.turns[0].output);
  });

  it('injects sharedContext at the top of every prompt', async () => {
    const client = new DeterministicInferenceClient();
    const orch = new SwarmOrchestrator({
      roles: [DEFAULT_ROLES.idea, DEFAULT_ROLES.critic],
      client,
      sharedContext: 'CONSTRAINT: only use the "character" domain.',
    });
    const out = await orch.run('anything');
    for (const t of out.turns) {
      expect(t.prompt.startsWith('CONSTRAINT: only use the "character" domain.')).toBe(true);
    }
  });

  it('parses the critic verdict when present', async () => {
    const client = new DeterministicInferenceClient({
      finalize: (body, _req, tier) => tier === InferenceTier.DEEP ? `${body} VERDICT: ship` : body,
    });
    const orch = new SwarmOrchestrator({
      roles: [DEFAULT_ROLES.idea, DEFAULT_ROLES.critic],
      client,
    });
    const out = await orch.run('design something');
    expect(out.verdict).toBe('ship');
  });
});

describe('SwarmOrchestrator — runUntilShipped', () => {
  it('stops early when critic emits "ship" on the first round', async () => {
    const client = new DeterministicInferenceClient({
      finalize: (body, _req, tier) => tier === InferenceTier.DEEP ? `${body} VERDICT: ship` : body,
    });
    const orch = new SwarmOrchestrator({
      roles: [DEFAULT_ROLES.idea, DEFAULT_ROLES.critic],
      client,
    });
    const out = await orch.runUntilShipped('test', 3);
    expect(out.shipped).toBe(true);
    expect(out.rounds).toHaveLength(1);
  });

  it('loops to maxRounds when critic keeps saying revise', async () => {
    const client = new DeterministicInferenceClient({
      finalize: (body, _req, tier) => tier === InferenceTier.DEEP ? `${body} VERDICT: revise` : body,
    });
    const orch = new SwarmOrchestrator({
      roles: [DEFAULT_ROLES.idea, DEFAULT_ROLES.critic],
      client,
    });
    const out = await orch.runUntilShipped('test', 3);
    expect(out.shipped).toBe(false);
    expect(out.rounds).toHaveLength(3);
    // Later rounds should include the prior critique in their prompts.
    const lastRound = out.rounds[out.rounds.length - 1];
    expect(lastRound.turns[0].prompt).toContain('Prior critique to address:');
  });

  it('rejects maxRounds < 1', async () => {
    const client = new DeterministicInferenceClient();
    const orch = new SwarmOrchestrator({ roles: [DEFAULT_ROLES.idea], client });
    await expect(orch.runUntilShipped('test', 0)).rejects.toThrow(/maxRounds/);
  });

  it('bails after one round if no critic role is present', async () => {
    const client = new DeterministicInferenceClient();
    const orch = new SwarmOrchestrator({
      roles: [DEFAULT_ROLES.idea, DEFAULT_ROLES.style],
      client,
    });
    const out = await orch.runUntilShipped('test', 5);
    expect(out.rounds).toHaveLength(1);
    expect(out.shipped).toBe(false);
  });
});

describe('SwarmOrchestrator — determinism', () => {
  it('same prompt → byte-identical transcript across two runs', async () => {
    const client = new DeterministicInferenceClient();
    const orch = new SwarmOrchestrator({
      roles: [DEFAULT_ROLES.idea, DEFAULT_ROLES.style, DEFAULT_ROLES.critic],
      client,
    });
    const a = await orch.run('deterministic test');
    const b = await orch.run('deterministic test');
    expect(a.turns.length).toBe(b.turns.length);
    for (let i = 0; i < a.turns.length; i++) {
      expect(a.turns[i].output).toBe(b.turns[i].output);
      expect(a.turns[i].tier).toBe(b.turns[i].tier);
    }
  });
});
