import { describe, it, expect } from 'vitest';
import { getViewportType, VIEWPORT_TYPES, AVAILABLE_VIEWS } from '../../src/components/studio/viewports';

describe('Viewport Routing', () => {
  it('maps all domains to a viewport type', () => {
    const allDomains = Object.values(VIEWPORT_TYPES).flat();
    expect(allDomains.length).toBeGreaterThanOrEqual(27);
  });

  it('returns correct viewport type for each domain', () => {
    expect(getViewportType('character')).toBe('3d');
    expect(getViewportType('geometry3d')).toBe('3d');
    expect(getViewportType('typography')).toBe('svg');
    expect(getViewportType('visual2d')).toBe('svg');
    expect(getViewportType('music')).toBe('audio');
    expect(getViewportType('audio')).toBe('audio');
    expect(getViewportType('fullgame')).toBe('game');
    expect(getViewportType('game')).toBe('game');
    expect(getViewportType('narrative')).toBe('code');
    expect(getViewportType('circuit')).toBe('code');
    expect(getViewportType('physics')).toBe('sim');
    expect(getViewportType('ecosystem')).toBe('sim');
    expect(getViewportType('alife')).toBe('sim');
    expect(getViewportType('animation')).toBe('anim');
    expect(getViewportType('choreography')).toBe('anim');
    expect(getViewportType('sprite')).toBe('anim');
    expect(getViewportType('ui')).toBe('2d');
    expect(getViewportType('particle')).toBe('2d');
    expect(getViewportType('shader')).toBe('2d');
    expect(getViewportType('food')).toBe('2d');
    expect(getViewportType('agent')).toBe('2d');
  });

  it('defaults to 3d for unknown domain', () => {
    expect(getViewportType('unknown')).toBe('3d');
    expect(getViewportType('')).toBe('3d');
    expect(getViewportType()).toBe('3d');
  });

  it('AVAILABLE_VIEWS has all expected types', () => {
    expect(AVAILABLE_VIEWS).toContain('hyperobject');
    expect(AVAILABLE_VIEWS).toContain('3d');
    expect(AVAILABLE_VIEWS).toContain('svg');
    expect(AVAILABLE_VIEWS).toContain('audio');
    expect(AVAILABLE_VIEWS).toContain('game');
    expect(AVAILABLE_VIEWS).toContain('code');
    expect(AVAILABLE_VIEWS).toContain('sim');
    expect(AVAILABLE_VIEWS).toContain('anim');
    expect(AVAILABLE_VIEWS).toContain('2d');
  });

  it('each viewport type has at least one domain', () => {
    for (const [type, domains] of Object.entries(VIEWPORT_TYPES)) {
      expect(domains.length).toBeGreaterThan(0);
    }
  });

  it('no domain appears in multiple viewport types', () => {
    const seen = new Map<string, string>();
    for (const [type, domains] of Object.entries(VIEWPORT_TYPES)) {
      for (const d of domains) {
        if (seen.has(d)) {
          throw new Error(`Domain ${d} appears in both ${seen.get(d)} and ${type}`);
        }
        seen.set(d, type);
      }
    }
  });
});
