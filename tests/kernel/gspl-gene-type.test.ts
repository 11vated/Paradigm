import { describe, it, expect } from 'vitest';
import { registerGSPLGeneType } from '../../src/lib/kernel/gspl-gene-type';
import { geneTypeRegistry } from '../../src/lib/kernel/gene-type-registry';
import { Xoshiro256StarStar } from '../../src/lib/kernel/rng';

describe('GSPL Gene Type Registration', () => {
  it('registers a color_channel type from JS operators', () => {
    const result = registerGSPLGeneType({
      name: 'color_channel',
      baseType: 'scalar',
      description: 'RGB color channel 0-255',
      constraints: { min: 0, max: 255 },
      validate: `return typeof _v === 'number' && _v >= 0 && _v <= 255`,
      mutate: `var d = _rngNextGaussian() * _r * 255; var r = _v + d; if (r < 0) r = 0; if (r > 255) r = 255; return r`,
      crossover: `return _a + _rngNextF64() * (_b - _a)`,
      distance: `return Math.abs(_a - _b) / 255`,
    });

    expect(result.success).toBe(true);
    expect(result.name).toBe('color_channel');

    const type = geneTypeRegistry.get('color_channel');
    expect(type).toBeDefined();
    expect(type!.parent).toBe('scalar');

    expect(type!.ops.validate(128)).toBe(true);
    expect(type!.ops.validate(-1)).toBe(false);
    expect(type!.ops.validate(300)).toBe(false);
    expect(type!.ops.validate('abc')).toBe(false);
    expect(type!.ops.distance(0, 255)).toBeCloseTo(1);
    expect(type!.ops.distance(128, 128)).toBe(0);

    const rng = new Xoshiro256StarStar('test-color');
    const child = type!.ops.crossover(100, 200, rng);
    expect(child).toBeGreaterThanOrEqual(100);
    expect(child).toBeLessThanOrEqual(200);

    const mutRng = new Xoshiro256StarStar('test-mut');
    const mutated = type!.ops.mutate(128, 0.1, mutRng);
    expect(mutated).toBeGreaterThanOrEqual(0);
    expect(mutated).toBeLessThanOrEqual(255);
  });

  it('rejects invalid type names', () => {
    expect(registerGSPLGeneType({
      name: '123bad', baseType: 'scalar',
      validate: 'return true', mutate: 'return _v', crossover: 'return _a', distance: 'return 0',
    }).success).toBe(false);
  });

  it('rejects duplicate type names', () => {
    expect(registerGSPLGeneType({
      name: 'color_channel', baseType: 'scalar',
      validate: 'return true', mutate: 'return _v', crossover: 'return _a', distance: 'return 0',
    }).success).toBe(false);
  });

  it('registers a percentage type', () => {
    const result = registerGSPLGeneType({
      name: 'percentage', baseType: 'scalar',
      constraints: { min: 0, max: 100 },
      validate: 'return typeof _v === "number" && _v >= 0 && _v <= 100',
      mutate: 'var d = _rngNextGaussian() * _r * 100; var r = _v + d; if (r < 0) r = 0; if (r > 100) r = 100; return r',
      crossover: 'return _a + _rngNextF64() * (_b - _a)',
      distance: 'return Math.abs(_a - _b) / 100',
    });
    expect(result.success).toBe(true);
  });

  it('registered types pass law verification', () => {
    const rng = new Xoshiro256StarStar('verify-colors');
    expect(geneTypeRegistry.verifyLaws('color_channel', rng).valid).toBe(true);
    expect(geneTypeRegistry.verifyLaws('percentage', rng).valid).toBe(true);
  });

  it('custom types appear in registry listing', () => {
    const names = geneTypeRegistry.getAll().map(t => t.name);
    expect(names).toContain('color_channel');
    expect(names).toContain('percentage');
  });
});
