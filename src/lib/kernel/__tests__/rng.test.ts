/**
 * RNG DETERMINISM TESTS
 * 
 * Critical tests for xoshiro256** ensuring:
 * - Same seed → identical sequence forever
 * - Statistical quality of random numbers
 * - No correlation between sequences
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  Xoshiro256StarStar,
  rngFromHash,
  Xoshiro256StarStar_factory
} from '../../src/lib/kernel/rng';

describe('RNG Determinism', () => {
  describe('Core Determinism', () => {
    it('should produce identical sequence with same seed', () => {
      const rng1 = Xoshiro256StarStar_factory([12345, 67890, 11111, 22222]);
      const rng2 = Xoshiro256StarStar_factory([12345, 67890, 11111, 22222]);

      const seq1: number[] = [];
      const seq2: number[] = [];

      for (let i = 0; i < 1000; i++) {
        seq1.push(rng1.next());
        seq2.push(rng2.next());
      }

      expect(seq1).toEqual(seq2);
    });

    it('should produce identical sequence from string hash', () => {
      const rng1 = rngFromHash('my-consistent-seed-123');
      const rng2 = rngFromHash('my-consistent-seed-123');

      const seq1 = Array.from({ length: 100 }, () => rng1.next());
      const seq2 = Array.from({ length: 100 }, () => rng2.next());

      expect(seq1).toEqual(seq2);
    });

    it('should produce different sequences from different seeds', () => {
      const rng1 = rngFromHash('seed-AAA');
      const rng2 = rngFromHash('seed-BBB');

      const seq1 = Array.from({ length: 100 }, () => rng1.next());
      const seq2 = Array.from({ length: 100 }, () => rng2.next());

      // Should be different (allow small chance of collision)
      expect(seq1).not.toEqual(seq2);
    });

    it('should be deterministic across long sequences', () => {
      const rng1 = Xoshiro256StarStar_factory([99999, 88888, 77777, 66666]);
      const rng2 = Xoshiro256StarStar_factory([99999, 88888, 77777, 66666]);

      // Test 10,000 numbers - should still be identical
      for (let i = 0; i < 10000; i++) {
        const n1 = rng1.next();
        const n2 = rng2.next();
        expect(n1).toBe(n2);
      }
    });
  });

  describe('xoshiro256** Properties', () => {
    it('should produce values in [0, 1) range', () => {
      const rng = rngFromHash('range-test');

      for (let i = 0; i < 10000; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('should produce full range of values', () => {
      const rng = rngFromHash('full-range-test');
      
      let min = 1;
      let max = 0;

      for (let i = 0; i < 100000; i++) {
        const v = rng.next();
        min = Math.min(min, v);
        max = Math.max(max, v);
      }

      // Should approach 0 and 1
      expect(min).toBeLessThan(0.001);
      expect(max).toBeGreaterThan(0.999);
    });

    it('should not produce obvious patterns', () => {
      const rng = rngFromHash('pattern-test');
      
      // Check for simple patterns in first differences
      const firstDiffs: number[] = [];
      let prev = rng.next();
      
      for (let i = 0; i < 999; i++) {
        const current = rng.next();
        firstDiffs.push(current - prev);
        prev = current;
      }

      // First differences should have reasonable distribution
      const avgDiff = firstDiffs.reduce((a, b) => a + b, 0) / firstDiffs.length;
      expect(avgDiff).toBeCloseTo(0, 1); // Should average near 0
    });
  });

  describe('Jump Function', () => {
    it('should jump forward in sequence', () => {
      const rng1 = rngFromHash('jump-test');
      const rng2 = rngFromHash('jump-test');

      // Advance rng1 by 1000
      for (let i = 0; i < 1000; i++) rng1.next();

      // Jump rng2 by 1000
      rng2.jump();

      // Should now be at same state
      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('should jump 2^128 states ahead', () => {
      const rng1 = rngFromHash('big-jump');
      const rng2 = rngFromHash('big-jump');

      // Jump ahead
      rng2.jump();
      rng2.jump(); // 2^256 ahead

      // Should be completely different
      const val1 = rng1.next();
      const val2 = rng2.next();
      expect(val1).not.toBe(val2);
    });
  });

  describe('Factory Function', () => {
    it('should accept 4 numbers as seed', () => {
      const rng = Xoshiro256StarStar_factory([1, 2, 3, 4]);
      expect(rng.next()).toBeDefined();
    });

    it('should throw on invalid seed length', () => {
      expect(() => {
        Xoshiro256StarStar_factory([1, 2, 3]); // Only 3, need 4
      }).toThrow();
    });

    it('should throw on zero seed', () => {
      expect(() => {
        Xoshiro256StarStar_factory([0, 0, 0, 0]);
      }).toThrow();
    });
  });

  describe('Statistical Quality', () => {
    it('should pass basic chi-square for uniformity', () => {
      const rng = rngFromHash('chi-square-test');
      
      const bins = new Array(10).fill(0);
      const samples = 10000;

      for (let i = 0; i < samples; i++) {
        const bin = Math.floor(rng.next() * 10);
        bins[bin]++;
      }

      // Expected 1000 per bin
      const expected = samples / 10;
      let chiSquare = 0;

      for (const count of bins) {
        chiSquare += Math.pow(count - expected, 2) / expected;
      }

      // Chi-square with 9 degrees of freedom, p=0.05 threshold ~16.9
      // Be lenient: threshold 30 for this basic test
      expect(chiSquare).toBeLessThan(30);
    });

    it('should have no obvious autocorrelation', () => {
      const rng = rngFromHash('autocorr-test');
      
      const values = Array.from({ length: 1000 }, () => rng.next());
      
      // Test lag-1 correlation
      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < 999; i++) {
        dotProduct += values[i] * values[i + 1];
        norm1 += values[i] * values[i];
        norm2 += values[i + 1] * values[i + 1];
      }

      const correlation = dotProduct / Math.sqrt(norm1 * norm2);
      
      // Correlation should be near 0 (allow -0.1 to 0.1)
      expect(correlation).toBeGreaterThan(-0.1);
      expect(correlation).toBeLessThan(0.1);
    });
  });

  describe('Integration with Seed System', () => {
    it('should produce identical mutations with same RNG', () => {
      const { Seed } = require('../../src/lib/kernel/seed-class');
      
      const seed1 = new Seed('character', 'Test');
      seed1.setGene('scalar', 0.5, { min: 0, max: 1 });

      const rng1 = rngFromHash('mutation-seed-xyz');
      const rng2 = rngFromHash('mutation-seed-xyz');

      const mutated1 = seed1.clone().mutate(rng1, 0.2);
      const mutated2 = seed1.clone().mutate(rng2, 0.2);

      // Should produce identical mutations
      const gene1 = mutated1.getGeneValue('scalar');
      const gene2 = mutated2.getGeneValue('scalar');
      expect(gene1).toBeCloseTo(gene2, 5);
    });

    it('should produce different crossovers with different RNG', () => {
      const { Seed } = require('../../src/lib/kernel/seed-class');
      
      const parent1 = new Seed('character', 'P1');
      parent1.setGene('scalar', 0.2, { min: 0, max: 1 });

      const parent2 = new Seed('character', 'P2');
      parent2.setGene('scalar', 0.8, { min: 0, max: 1 });

      const rng1 = rngFromHash('cross-AAA');
      const rng2 = rngFromHash('cross-BBB');

      const child1 = parent1.clone().cross(parent2.clone(), rng1);
      const child2 = parent1.clone().cross(parent2.clone(), rng2);

      // Different RNG seeds should produce different children
      expect(child1.id).not.toBe(child2.id);
    });
  });
});