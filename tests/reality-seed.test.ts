/**
 * Reality Substrate seed — types + builder + determinism + field-engine mapping.
 *
 * Added by paradigm-infinite/ws-29.
 */
import { describe, it, expect } from 'vitest';
import {
  UNSEEN_CHANNELS,
  DIMENSIONS,
  STANDARD_CONSTANTS,
  createRealitySeed,
  deriveRealitySeedHash,
  realityToFieldKind,
} from '../src/seeds';

describe('reality seed', () => {
  it('lists 12 unseen channels covering the EM spectrum, gravity, quantum, neutrino, magnetic, cosmological', () => {
    expect(UNSEEN_CHANNELS.length).toBe(12);
    expect(UNSEEN_CHANNELS).toContain('electromagnetic-visible');
    expect(UNSEEN_CHANNELS).toContain('quantum-wavefunction');
    expect(UNSEEN_CHANNELS).toContain('gravitational');
    expect(UNSEEN_CHANNELS).toContain('neutrino-flux');
  });

  it('supports higher-dimensional projections (3,4,5,6,7,8,10,11,26)', () => {
    expect(DIMENSIONS).toContain(3);
    expect(DIMENSIONS).toContain(11);
    expect(DIMENSIONS).toContain(26);
  });

  it('STANDARD_CONSTANTS matches our universe (c, h, G, alpha)', () => {
    expect(STANDARD_CONSTANTS.c).toBe(299792458);
    expect(STANDARD_CONSTANTS.h).toBeCloseTo(6.626e-34, 36);
    expect(Object.isFrozen(STANDARD_CONSTANTS)).toBe(true);
  });

  it('createRealitySeed builds a deterministic seed', () => {
    const s = createRealitySeed({ prompt: 'a glowing nebula', channel: 'electromagnetic-visible' });
    expect(s.$hash).toMatch(/^[0-9a-f]{16}$/);
    expect(s.$domain).toBe('reality');
    expect(s.channel).toBe('electromagnetic-visible');
    expect(s.dimensions).toBe(3);
    expect(s.counterfactual).toBe(false);
    const s2 = createRealitySeed({ prompt: 'a glowing nebula', channel: 'electromagnetic-visible' });
    expect(s2.$hash).toBe(s.$hash);
  });

  it('counterfactual flag flips when non-standard constants are supplied', () => {
    const s = createRealitySeed({
      prompt: 'an alternate universe',
      channel: 'electromagnetic-visible',
      constants: { c: 2.998e9 },
    });
    expect(s.counterfactual).toBe(true);
  });

  it('rejects unknown channels and dimensions', () => {
    expect(() => createRealitySeed({ prompt: 'x', channel: 'foo' as any })).toThrow();
    expect(() => createRealitySeed({ prompt: 'x', channel: 'gravitational', dimensions: 12 as any })).toThrow();
  });

  it('rejects empty prompt', () => {
    expect(() => createRealitySeed({ prompt: '', channel: 'gravitational' })).toThrow();
  });

  it('realityToFieldKind maps channels to field engine kinds', () => {
    expect(realityToFieldKind('quantum-wavefunction')).toBe('quantum');
    expect(realityToFieldKind('gravitational')).toBe('cosmology');
    expect(realityToFieldKind('cosmological-curvature')).toBe('cosmology');
    expect(realityToFieldKind('electromagnetic-radio')).toBe('electromagnetic');
    expect(realityToFieldKind('electromagnetic-gamma')).toBe('electromagnetic');
    expect(realityToFieldKind('neutrino-flux')).toBe('electromagnetic');
  });

  it('deriveRealitySeedHash is pure / collision-distinct across channel changes', () => {
    const a = deriveRealitySeedHash('x', 'electromagnetic-visible', 3, STANDARD_CONSTANTS);
    const b = deriveRealitySeedHash('x', 'electromagnetic-radio', 3, STANDARD_CONSTANTS);
    const c = deriveRealitySeedHash('x', 'electromagnetic-visible', 3, STANDARD_CONSTANTS);
    expect(a).not.toBe(b);
    expect(a).toBe(c);
  });
});
