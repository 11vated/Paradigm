/**
 * MAP-Elites for games — quality+diversity over (archetype, pace).
 */
import { describe, it, expect } from 'vitest';
import { mapElitesGames } from '@/lib/game/map-elites';

describe('mapElitesGames', () => {
  it('runs deterministically — same seed → same result', () => {
    const a = mapElitesGames({ initialSeed: 'me-test', paceBins: 3, iterations: 20 });
    const b = mapElitesGames({ initialSeed: 'me-test', paceBins: 3, iterations: 20 });
    expect(a.filled).toBe(b.filled);
    expect(a.best?.score).toBeCloseTo(b.best?.score ?? 0, 6);
    expect(a.best?.signature).toBe(b.best?.signature);
  });

  it('respects (archetype, paceBin) cell keys', () => {
    const r = mapElitesGames({ initialSeed: 'me-test', paceBins: 4, iterations: 30 });
    const keys = new Set<string>();
    for (const c of r.cells.values()) {
      const k = `${c.archetype}:${c.paceBin}`;
      expect(keys.has(k)).toBe(false);
      keys.add(k);
    }
    expect(r.cells.size).toBeGreaterThan(0);
  });

  it('grid covers archetypes × paceBins', () => {
    const r = mapElitesGames({ initialSeed: 'me-test', paceBins: 4, iterations: 10 });
    expect(r.grid.length).toBe(6 * 4); // 6 archetypes
    expect(r.total).toBe(24);
  });

  it('best score is at least mean', () => {
    const r = mapElitesGames({ initialSeed: 'me-test', paceBins: 3, iterations: 20 });
    const scores = [...r.cells.values()].map(c => c.score);
    if (scores.length === 0) return;
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    expect(r.best?.score ?? 0).toBeGreaterThanOrEqual(mean - 1e-9);
  });
});
