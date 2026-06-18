import { describe, it, expect } from 'vitest';
import { SafeGeneExecutor, validateGeneOperationSource } from '../../src/lib/kernel/safe-gene-executor';
import { Xoshiro256StarStar } from '../../src/lib/kernel/rng';

describe('SafeGeneExecutor', () => {
  describe('validateGeneOperationSource', () => {
    it('accepts valid JavaScript code', () => {
      expect(() => validateGeneOperationSource('return _v + 1')).not.toThrow();
      expect(() => validateGeneOperationSource('var x = _v * 2; return x')).not.toThrow();
      expect(() => validateGeneOperationSource('if (_v > 0) return _v; else return 0')).not.toThrow();
    });

    it('rejects eval', () => {
      expect(() => validateGeneOperationSource('eval("malicious code")')).toThrow(/eval/);
    });

    it('rejects Function constructor', () => {
      expect(() => validateGeneOperationSource('new Function("return 1")()')).toThrow(/Function/);
    });

    it('rejects require', () => {
      expect(() => validateGeneOperationSource('require("fs")')).toThrow(/require/);
    });

    it('rejects import', () => {
      expect(() => validateGeneOperationSource('import fs from "fs"')).toThrow(/import/);
    });

    it('rejects process access', () => {
      expect(() => validateGeneOperationSource('process.exit(1)')).toThrow(/process/);
    });

    it('rejects global access', () => {
      expect(() => validateGeneOperationSource('global.something = 1')).toThrow(/global/);
    });

    it('rejects window access', () => {
      expect(() => validateGeneOperationSource('window.location = "evil"')).toThrow(/window/);
    });

    it('rejects fetch', () => {
      expect(() => validateGeneOperationSource('fetch("http://evil.com")')).toThrow(/fetch/);
    });

    it('rejects setTimeout', () => {
      expect(() => validateGeneOperationSource('setTimeout(() => {}, 1000)')).toThrow(/setTimeout/);
    });

    it('rejects escape sequences', () => {
      expect(() => validateGeneOperationSource('return "\\x41"')).toThrow(/Escape sequences/);
      expect(() => validateGeneOperationSource('return "\\u0041"')).toThrow(/Escape sequences/);
    });

    it('rejects empty or non-string source', () => {
      expect(() => validateGeneOperationSource('')).toThrow(/non-empty string/);
      expect(() => validateGeneOperationSource(null as any)).toThrow(/non-empty string/);
      expect(() => validateGeneOperationSource(undefined as any)).toThrow(/non-empty string/);
    });
  });

  describe('createValidate', () => {
    it('creates a working validate function', () => {
      const validate = SafeGeneExecutor.createValidate('return typeof _v === "number" && _v >= 0 && _v <= 100');
      
      expect(validate(50)).toBe(true);
      expect(validate(0)).toBe(true);
      expect(validate(100)).toBe(true);
      expect(validate(-1)).toBe(false);
      expect(validate(101)).toBe(false);
      expect(validate('50')).toBe(false);
    });

    it('handles errors gracefully', () => {
      const validate = SafeGeneExecutor.createValidate('throw new Error("test")');
      expect(validate(123)).toBe(false);
    });

    it('isolates scope - no access to outer variables', () => {
      const outerVar = 'should not be accessible';
      const validate = SafeGeneExecutor.createValidate('return typeof outerVar === "undefined"');
      expect(validate(123)).toBe(true);
    });
  });

  describe('createMutate', () => {
    it('creates a working mutate function with RNG helpers', () => {
      const mutate = SafeGeneExecutor.createMutate(
        'var delta = _rngNextGaussian() * _r * 10; return _v + delta'
      );
      
      const rng = new Xoshiro256StarStar('test-mutate');
      const original = 50;
      const mutated = mutate(original, 0.1, rng);
      
      expect(typeof mutated).toBe('number');
      expect(mutated).not.toBe(original); // Should be different due to mutation
    });

    it('provides all RNG helper functions', () => {
      const mutate = SafeGeneExecutor.createMutate(`
        var f64 = _rngNextF64();
        var int = _rngNextInt(0, 100);
        var bool = _rngNextBool();
        var gauss = _rngNextGaussian();
        var choice = _rngChoice([1, 2, 3]);
        return f64 + int + (bool ? 1 : 0) + gauss + choice;
      `);
      
      const rng = new Xoshiro256StarStar('test-helpers');
      const result = mutate(0, 0.5, rng);
      
      expect(typeof result).toBe('number');
    });

    it('respects mutation rate', () => {
      const mutate = SafeGeneExecutor.createMutate(
        'if (_rngNextF64() < _r) return _v + 10; else return _v'
      );
      
      const rng1 = new Xoshiro256StarStar('test-rate-high');
      const rng2 = new Xoshiro256StarStar('test-rate-low');
      
      // High rate should mutate more often
      let mutatedHigh = 0;
      for (let i = 0; i < 100; i++) {
        if (mutate(50, 0.9, rng1) !== 50) mutatedHigh++;
      }
      
      // Low rate should mutate less often
      let mutatedLow = 0;
      for (let i = 0; i < 100; i++) {
        if (mutate(50, 0.1, rng2) !== 50) mutatedLow++;
      }
      
      expect(mutatedHigh).toBeGreaterThan(mutatedLow);
    });
  });

  describe('createCrossover', () => {
    it('creates a working crossover function', () => {
      const crossover = SafeGeneExecutor.createCrossover(
        'return _a + _rngNextF64() * (_b - _a)'
      );
      
      const rng = new Xoshiro256StarStar('test-crossover');
      const child = crossover(100, 200, rng);
      
      expect(child).toBeGreaterThanOrEqual(100);
      expect(child).toBeLessThanOrEqual(200);
    });

    it('produces deterministic results with same RNG seed', () => {
      const crossover = SafeGeneExecutor.createCrossover(
        'return _a + _rngNextF64() * (_b - _a)'
      );
      
      const rng1 = new Xoshiro256StarStar('deterministic-test');
      const rng2 = new Xoshiro256StarStar('deterministic-test');
      
      const child1 = crossover(100, 200, rng1);
      const child2 = crossover(100, 200, rng2);
      
      expect(child1).toBe(child2);
    });
  });

  describe('createDistance', () => {
    it('creates a working distance function', () => {
      const distance = SafeGeneExecutor.createDistance(
        'return Math.abs(_a - _b) / 100'
      );
      
      expect(distance(0, 100)).toBe(1);
      expect(distance(50, 50)).toBe(0);
      expect(distance(25, 75)).toBe(0.5);
    });

    it('handles schema parameter', () => {
      const distance = SafeGeneExecutor.createDistance(
        'var range = _s && _s.max ? _s.max : 100; return Math.abs(_a - _b) / range'
      );
      
      expect(distance(0, 100, { max: 100 })).toBe(1);
      expect(distance(0, 200, { max: 200 })).toBe(1);
    });
  });

  describe('createCanonicalize', () => {
    it('creates a working canonicalize function', () => {
      const canonicalize = SafeGeneExecutor.createCanonicalize(
        'return Math.round(_v)'
      );
      
      expect(canonicalize(3.7)).toBe(4);
      expect(canonicalize(3.2)).toBe(3);
    });

    it('returns original value on error', () => {
      const canonicalize = SafeGeneExecutor.createCanonicalize(
        'throw new Error("test")'
      );
      
      expect(canonicalize(123)).toBe(123);
    });
  });

  describe('createRepair', () => {
    it('creates a working repair function', () => {
      const repair = SafeGeneExecutor.createRepair(
        'if (_v < 0) return 0; if (_v > 100) return 100; return _v'
      );
      
      expect(repair(-10)).toBe(0);
      expect(repair(150)).toBe(100);
      expect(repair(50)).toBe(50);
    });

    it('returns original value on error', () => {
      const repair = SafeGeneExecutor.createRepair(
        'throw new Error("test")'
      );
      
      expect(repair(123)).toBe(123);
    });
  });

  describe('Security - Isolation', () => {
    it('cannot access outer scope variables', () => {
      const secretData = 'this should not be accessible';
      const validate = SafeGeneExecutor.createValidate(
        'try { return typeof secretData === "undefined"; } catch { return true; }'
      );
      
      expect(validate(123)).toBe(true);
    });

    it('cannot modify outer scope', () => {
      let outerCounter = 0;
      const mutate = SafeGeneExecutor.createMutate(
        'try { outerCounter = 999; } catch {} return _v'
      );
      
      const rng = new Xoshiro256StarStar('test-isolation');
      mutate(50, 0.5, rng);
      
      expect(outerCounter).toBe(0); // Should remain unchanged
    });

    it('runs in strict mode', () => {
      // In strict mode, assigning to undefined variable throws
      const validate = SafeGeneExecutor.createValidate(
        'try { undeclaredVar = 123; return false; } catch { return true; }'
      );
      
      expect(validate(123)).toBe(true);
    });
  });

  describe('Real-world gene operations', () => {
    it('handles color channel validation', () => {
      const validate = SafeGeneExecutor.createValidate(
        'return typeof _v === "number" && _v >= 0 && _v <= 255'
      );
      
      expect(validate(128)).toBe(true);
      expect(validate(0)).toBe(true);
      expect(validate(255)).toBe(true);
      expect(validate(-1)).toBe(false);
      expect(validate(256)).toBe(false);
    });

    it('handles color channel mutation', () => {
      const mutate = SafeGeneExecutor.createMutate(
        'var d = _rngNextGaussian() * _r * 255; var r = _v + d; if (r < 0) r = 0; if (r > 255) r = 255; return r'
      );
      
      const rng = new Xoshiro256StarStar('test-color');
      const mutated = mutate(128, 0.1, rng);
      
      expect(mutated).toBeGreaterThanOrEqual(0);
      expect(mutated).toBeLessThanOrEqual(255);
    });

    it('handles percentage operations', () => {
      const validate = SafeGeneExecutor.createValidate(
        'return typeof _v === "number" && _v >= 0 && _v <= 100'
      );
      const distance = SafeGeneExecutor.createDistance(
        'return Math.abs(_a - _b) / 100'
      );
      
      expect(validate(50)).toBe(true);
      expect(validate(-1)).toBe(false);
      expect(validate(101)).toBe(false);
      expect(distance(0, 100)).toBe(1);
      expect(distance(25, 75)).toBe(0.5);
    });
  });
});

// Made with Bob
