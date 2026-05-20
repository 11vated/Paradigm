/**
 * Game evolution loop tests — deterministic GA over (friend × world).
 */
import { describe, it, expect } from 'vitest';
import { evolveGames } from '../../src/lib/game/evolution';

describe('Evolution loop', () => {
  it('is deterministic — same initialSeed → same best', () => {
    const a = evolveGames({ pop: 6, generations: 2, initialSeed: 'evolve-det' });
    const b = evolveGames({ pop: 6, generations: 2, initialSeed: 'evolve-det' });
    expect(a.best.friendSeed).toBe(b.best.friendSeed);
    expect(a.best.worldSeed).toBe(b.best.worldSeed);
    expect(a.best.fitness.score).toBe(b.best.fitness.score);
  });

  it('best score monotonically non-decreases under elitism', () => {
    const r = evolveGames({ pop: 8, generations: 3, initialSeed: 'evolve-mono' });
    for (let i = 1; i < r.history.length; i++) {
      expect(r.history[i].bestScore).toBeGreaterThanOrEqual(r.history[i - 1].bestScore - 1e-9);
    }
  });

  it('produces a topK list and valid axes', () => {
    const r = evolveGames({ pop: 6, generations: 2, initialSeed: 'evolve-topk' });
    expect(r.topK.length).toBeGreaterThan(0);
    expect(r.topK[0].fitness.axes.completability).toBeGreaterThanOrEqual(0);
    expect(r.topK[0].fitness.axes.completability).toBeLessThanOrEqual(1);
  });

  it('history length equals generations count', () => {
    const r = evolveGames({ pop: 4, generations: 3, initialSeed: 'evolve-hist' });
    expect(r.history.length).toBe(3);
  });
});
