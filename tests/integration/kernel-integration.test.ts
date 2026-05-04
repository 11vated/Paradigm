import { describe, expect, it } from 'vitest';
import { routeSeed, routeToLLM, routeByStance } from '../../src/lib/kernel/seed-router';

describe('Kernel seed routing integration', () => {
  it('routes a direct domain seed to a generator', () => {
    const seed = { $domain: 'character', genes: {} };
    const decision = routeSeed(seed as any, undefined, { preferGPU: true, fallbackToCPU: true, allowComposition: true });

    expect(decision.type).toBe('generator');
    expect(decision.target).toContain('generateCharacter');
    expect(decision.confidence).toBeGreaterThan(0.2);
  });

  it('falls back to LLM when unknown domain is provided', () => {
    const seed = { $domain: 'unknown' };
    const decision = routeSeed(seed as any, { reasoning_style: { value: 'deductive' } }, { preferGPU: false, fallbackToCPU: false, allowComposition: false });

    expect(decision.type).toBe('llm');
    expect(decision.target).toBe('claude-3-opus');
    expect(decision.reason).toContain('reasoning_style');
  });

  it('prefers GPU generator when configured and supported', () => {
    const seed = { $domain: 'character' };
    const decision = routeSeed(seed as any, undefined, { preferGPU: true, fallbackToCPU: true, allowComposition: true });

    expect(decision.type).toBe('generator');
    expect(decision.target).toContain('GPU');
    expect(decision.reason).toContain('Direct domain match');
  });

  it('returns a consistent reasoning model for deductive style', () => {
    const llm = routeToLLM('deductive', { confidence: { value: 0.8 }, depth: { value: 0.9 } });
    expect(llm).toBe('claude-3-opus');
  });

  it('generates a composition stance decision for composer', () => {
    const seed = { $domain: 'music' };
    const decision = routeByStance(seed as any, 'composer');
    expect(decision).toBeDefined();
    expect(['generator', 'llm', 'composition']).toContain(decision.type);
  });
});
