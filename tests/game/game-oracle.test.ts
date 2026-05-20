/**
 * Game playability oracle — deterministic multi-axis scoring.
 */
import { describe, it, expect } from 'vitest';
import { createFriendSeed } from '@/lib/friend';
import { createWorldSeed, composeQuest } from '@/lib/world';
import { createGameSeed, generateGame, evaluateGame } from '@/lib/game';

function freshGame(f = 'iris', w = 'vellichor') {
  return generateGame(createGameSeed(composeQuest(createFriendSeed(f), createWorldSeed(w))));
}

describe('Game oracle', () => {
  it('produces a complete report with all 5 axes', () => {
    const r = evaluateGame(freshGame());
    expect(r.axes).toMatchObject({
      completability: expect.any(Number),
      branchingHealth: expect.any(Number),
      karmaArc: expect.any(Number),
      paceVariance: expect.any(Number),
      endingDiversity: expect.any(Number),
    });
    expect(r.score).toBeGreaterThan(0);
    expect(r.score).toBeLessThanOrEqual(1);
  });

  it('is deterministic — same artifact → same hash twice', () => {
    const g = freshGame();
    expect(evaluateGame(g).hash).toBe(evaluateGame(g).hash);
  });

  it('returns 3 path summaries (low/high/balanced)', () => {
    const r = evaluateGame(freshGame());
    expect(r.paths).toHaveLength(3);
    expect(r.paths.map(p => p.strategy).sort()).toEqual(['balanced', 'high', 'low']);
  });

  it('completability is 1.0 for well-formed games', () => {
    const r = evaluateGame(freshGame());
    expect(r.axes.completability).toBe(1);
  });

  it('different games produce different fitness hashes', () => {
    const a = evaluateGame(freshGame('iris', 'vellichor'));
    const b = evaluateGame(freshGame('atlas', 'iron-marsh'));
    expect(a.hash).not.toBe(b.hash);
  });

  it('karmaArc is non-zero when choices have non-trivial karma values', () => {
    const r = evaluateGame(freshGame());
    expect(r.axes.karmaArc).toBeGreaterThan(0);
  });
});
