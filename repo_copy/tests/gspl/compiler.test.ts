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
});
