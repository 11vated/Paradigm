import { describe, it, expect } from 'vitest';
import { GSPLCompiler } from '../../src/lib/gspl/compiler.js';

function makeSeed(domain: string, genes: Record<string, any> = {}): any {
  return { id: 'test', $domain: domain, $name: 'Test', genes };
}

describe('GSPL Compiler', () => {
  describe('compileToQFT', () => {
    it('maps character domain to DIRAC field', () => {
      const result = GSPLCompiler.compileToQFT(makeSeed('character'));
      expect(result.field_type).toBe('DIRAC');
    });

    it('maps vfx domain to QED field', () => {
      const result = GSPLCompiler.compileToQFT(makeSeed('vfx'));
      expect(result.field_type).toBe('QED');
    });

    it('uses 4D lattice for QCD', () => {
      const result = GSPLCompiler.compileToQFT(makeSeed('matter'));
      expect(result.field_type).toBe('QCD');
      expect(result.grid_size).toEqual([8, 8, 8, 8]);
    });

    it('respects explicit field_type gene override', () => {
      const result = GSPLCompiler.compileToQFT(makeSeed('character', {
        field_type: { type: 'categorical', value: 'GRAVITY' }
      }));
      expect(result.field_type).toBe('GRAVITY');
    });

    it('is deterministic', () => {
      const seed = makeSeed('character', { core_power: { value: 80 }, stability: { value: 60 } });
      const r1 = GSPLCompiler.compileToQFT(seed);
      const r2 = GSPLCompiler.compileToQFT(seed);
      expect(r1).toEqual(r2);
    });
  });

  describe('compileToEngine', () => {
    it('includes all gene values as parameters', () => {
      const result = GSPLCompiler.compileToEngine(makeSeed('character', {
        strength: { type: 'scalar', value: 0.8 },
        archetype: { type: 'categorical', value: 'warrior' },
      }));
      expect(result.strength).toBe(0.8);
      expect(result.archetype).toBe('warrior');
    });

    it('adds character-specific params', () => {
      const result = GSPLCompiler.compileToEngine(makeSeed('character'));
      expect(result.render_mode).toBe('2d_character');
      expect(result.stat_normalization).toBe(true);
    });

    it('adds music-specific params', () => {
      const result = GSPLCompiler.compileToEngine(makeSeed('music', {
        tempo: { type: 'scalar', value: 0.5 }
      }));
      expect(result.tempo_bpm).toBe(130);
      expect(result.sample_rate).toBe(44100);
    });

    it('adds physics-specific params', () => {
      const result = GSPLCompiler.compileToEngine(makeSeed('physics', {
        simulationType: { type: 'categorical', value: 'fluid' }
      }));
      expect(result.integrator).toBe('sph');
      expect(result.dt).toBe(0.001);
    });

    it('adds shader-specific params', () => {
      const result = GSPLCompiler.compileToEngine(makeSeed('shader'));
      expect(result.target_api).toBe('webgpu');
    });

    it('handles all 27 domains without error', () => {
      for (const domain of GSPLCompiler.getTargetEngines()) {
        const result = GSPLCompiler.compileToEngine(makeSeed(domain));
        expect(result.domain).toBe(domain);
        expect(result.render_mode).toBeDefined();
      }
    });
  });

  describe('getTargetEngines', () => {
    it('returns 27 engines', () => {
      expect(GSPLCompiler.getTargetEngines()).toHaveLength(27);
    });
  });
});
