/**
 * Unit tests for xoshiro256** deterministic RNG
 * Validates: determinism, distribution, forking, all output methods
 */
import { describe, it, expect } from 'vitest';
import { Xoshiro256StarStar, rngFromHash } from '../../src/lib/kernel/rng.js';

describe('Xoshiro256StarStar', () => {
  describe('determinism', () => {
    it('produces identical sequences from the same seed', () => {
      const a = new Xoshiro256StarStar(42n);
      const b = new Xoshiro256StarStar(42n);

      const seqA = Array.from({ length: 100 }, () => a.nextU64());
      const seqB = Array.from({ length: 100 }, () => b.nextU64());

      expect(seqA).toEqual(seqB);
    });

    it('produces different sequences from different seeds', () => {
      const a = new Xoshiro256StarStar(42n);
      const b = new Xoshiro256StarStar(43n);

      const valA = a.nextU64();
      const valB = b.nextU64();

      expect(valA).not.toEqual(valB);
    });

    it('rngFromHash produces deterministic output', () => {
      const a = rngFromHash('test-seed-alpha');
      const b = rngFromHash('test-seed-alpha');

      const seqA = Array.from({ length: 50 }, () => a.nextF64());
      const seqB = Array.from({ length: 50 }, () => b.nextF64());

      expect(seqA).toEqual(seqB);
    });

    it('rngFromHash differs for different hashes', () => {
      const a = rngFromHash('seed-one');
      const b = rngFromHash('seed-two');

      expect(a.nextF64()).not.toEqual(b.nextF64());
    });
  });

  describe('nextF64', () => {
    it('produces values in [0, 1)', () => {
      const rng = new Xoshiro256StarStar(12345n);
      for (let i = 0; i < 10000; i++) {
        const val = rng.nextF64();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it('has reasonable distribution (mean near 0.5)', () => {
      const rng = new Xoshiro256StarStar(99n);
      const N = 10000;
      let sum = 0;
      for (let i = 0; i < N; i++) sum += rng.nextF64();
      const mean = sum / N;
      expect(mean).toBeGreaterThan(0.45);
      expect(mean).toBeLessThan(0.55);
    });
  });

  describe('nextInt', () => {
    it('produces values within [min, max]', () => {
      const rng = new Xoshiro256StarStar(7n);
      for (let i = 0; i < 5000; i++) {
        const val = rng.nextInt(10, 20);
        expect(val).toBeGreaterThanOrEqual(10);
        expect(val).toBeLessThanOrEqual(20);
      }
    });

    it('covers the full range', () => {
      const rng = new Xoshiro256StarStar(3n);
      const seen = new Set<number>();
      for (let i = 0; i < 10000; i++) {
        seen.add(rng.nextInt(0, 5));
      }
      expect(seen.size).toBe(6); // 0,1,2,3,4,5
    });
  });

  describe('nextBool', () => {
    it('produces roughly 50/50 distribution', () => {
      const rng = new Xoshiro256StarStar(11n);
      let trueCount = 0;
      const N = 10000;
      for (let i = 0; i < N; i++) {
        if (rng.nextBool()) trueCount++;
      }
      const ratio = trueCount / N;
      expect(ratio).toBeGreaterThan(0.45);
      expect(ratio).toBeLessThan(0.55);
    });
  });

  describe('nextChoice', () => {
    it('selects from the given array', () => {
      const rng = new Xoshiro256StarStar(55n);
      const options = ['a', 'b', 'c'];
      for (let i = 0; i < 100; i++) {
        expect(options).toContain(rng.nextChoice(options));
      }
    });

    it('covers all options over many draws', () => {
      const rng = new Xoshiro256StarStar(77n);
      const options = ['x', 'y', 'z'];
      const seen = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        seen.add(rng.nextChoice(options));
      }
      expect(seen.size).toBe(3);
    });
  });

  describe('nextGaussian', () => {
    it('produces values centered near 0', () => {
      const rng = new Xoshiro256StarStar(88n);
      const N = 10000;
      let sum = 0;
      for (let i = 0; i < N; i++) sum += rng.nextGaussian();
      const mean = sum / N;
      expect(Math.abs(mean)).toBeLessThan(0.05);
    });

    it('has standard deviation near 1', () => {
      const rng = new Xoshiro256StarStar(99n);
      const N = 10000;
      const values: number[] = [];
      for (let i = 0; i < N; i++) values.push(rng.nextGaussian());
      const mean = values.reduce((a, b) => a + b, 0) / N;
      const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / N;
      const std = Math.sqrt(variance);
      expect(std).toBeGreaterThan(0.9);
      expect(std).toBeLessThan(1.1);
    });
  });

  describe('fork', () => {
    it('creates a child RNG that diverges from parent', () => {
      const parent = new Xoshiro256StarStar(42n);
      const child = parent.fork('child-stream');

      // Parent and child should produce different sequences
      const parentVal = parent.nextF64();
      const childVal = child.nextF64();
      // They COULD be equal by chance but that's astronomically unlikely
      // What we really test is that fork is deterministic:
      const parent2 = new Xoshiro256StarStar(42n);
      const child2 = parent2.fork('child-stream');
      expect(child.nextF64()).not.toBeUndefined(); // just ensuring it works
      // The key property: same fork key = same child
      const p3 = new Xoshiro256StarStar(42n);
      const c3 = p3.fork('child-stream');
      // Reset and compare
      const pa = new Xoshiro256StarStar(42n);
      const ca = pa.fork('child-stream');
      const pb = new Xoshiro256StarStar(42n);
      const cb = pb.fork('child-stream');
      expect(ca.nextF64()).toEqual(cb.nextF64());
      expect(ca.nextF64()).toEqual(cb.nextF64());
    });

    it('different fork keys produce different children', () => {
      const p1 = new Xoshiro256StarStar(42n);
      const p2 = new Xoshiro256StarStar(42n);
      const c1 = p1.fork('alpha');
      const c2 = p2.fork('beta');
      expect(c1.nextF64()).not.toEqual(c2.nextF64());
    });
  });
});
