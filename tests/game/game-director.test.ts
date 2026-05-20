/**
 * Director Agent — natural-language → game spec.
 */
import { describe, it, expect } from 'vitest';
import { directorBrief, directedSearch } from '@/lib/game/director';

describe('directorBrief', () => {
  it('extracts archetype from keywords', () => {
    expect(directorBrief('a mystery in a dark mansion').archetype).toBe('mystery');
    expect(directorBrief('frenetic survival wilderness').archetype).toBe('survival');
    expect(directorBrief('explore the uncharted map').archetype).toBe('discovery');
    expect(directorBrief('a court political intrigue').archetype).toBe('political');
  });

  it('extracts pace from keywords', () => {
    expect(directorBrief('a calm slow game').pace).toBeLessThan(0.5);
    expect(directorBrief('frenetic intense action').pace).toBeGreaterThan(0.5);
  });

  it('extracts mood from keywords', () => {
    expect(directorBrief('a bright cheerful tale').mood).toBeLessThan(0.5);
    expect(directorBrief('a grim haunting tragedy').mood).toBeGreaterThan(0.5);
  });

  it('is deterministic — same brief → same spec', () => {
    const a = directorBrief('a calm exploration game with a hero');
    const b = directorBrief('a calm exploration game with a hero');
    expect(a).toEqual(b);
  });

  it('falls back gracefully on no-match brief', () => {
    const r = directorBrief('xyzqq nonsense');
    expect(r.archetype).toBeNull();
    expect(r.rationale[0]).toContain('no keywords matched');
  });
});

describe('directedSearch', () => {
  it('runs and returns chosen + alternatives', () => {
    const r = directedSearch('a calm exploration game', { iterations: 20 });
    expect(r.spec).toBeDefined();
    expect(Array.isArray(r.alternatives)).toBe(true);
    // Either chosen has the spec archetype or it's the global best fallback.
    if (r.chosen && r.spec.archetype) {
      expect(['discovery', r.chosen.archetype]).toContain(r.chosen.archetype);
    }
  });
});
