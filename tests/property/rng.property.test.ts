/**
 * Property-based tests for the deterministic RNG (Xoshiro256StarStar).
 *
 * Runs fast-check arbitraries against the substrate's only entropy source.
 * The kernel never lies: same seed → same stream, forever.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { Xoshiro256StarStar, rngFromHash } from '@/lib/kernel/rng';

const arbHexHash = fc
  .array(fc.integer({ min: 0, max: 255 }), { minLength: 8, maxLength: 64 })
  .map((arr) => arr.map((b) => b.toString(16).padStart(2, '0')).join(''));

const arbStringSeed = fc.string({ minLength: 1, maxLength: 64 });

describe('Xoshiro256StarStar — determinism properties', () => {
  it('same hash → same stream across 1k steps', () => {
    fc.assert(
      fc.property(arbHexHash, (hash) => {
        const a = rngFromHash(hash);
        const b = rngFromHash(hash);
        for (let i = 0; i < 1000; i++) {
          expect(a.nextF64()).toBe(b.nextF64());
        }
      }),
      { numRuns: 30 }
    );
  });

  it('nextF64() output stays in [0, 1) over 1k steps', () => {
    fc.assert(
      fc.property(arbHexHash, (hash) => {
        const r = rngFromHash(hash);
        for (let i = 0; i < 1000; i++) {
          const v = r.nextF64();
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThan(1);
          expect(Number.isFinite(v)).toBe(true);
        }
      }),
      { numRuns: 20 }
    );
  });

  it('nextInt(min, max) is inclusive on both ends', () => {
    fc.assert(
      fc.property(arbHexHash, fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: 1, max: 1000 }), (hash, a, b) => {
        const lo = Math.min(a, b);
        const hi = Math.max(a, b);
        const r = rngFromHash(hash);
        for (let i = 0; i < 100; i++) {
          const v = r.nextInt(lo, hi);
          expect(v).toBeGreaterThanOrEqual(lo);
          expect(v).toBeLessThanOrEqual(hi);
          expect(Number.isInteger(v)).toBe(true);
        }
      }),
      { numRuns: 20 }
    );
  });

  it('distinct hashes produce distinct streams (probabilistic)', () => {
    fc.assert(
      fc.property(arbHexHash, arbHexHash, (h1, h2) => {
        fc.pre(h1 !== h2);
        const a = rngFromHash(h1);
        const b = rngFromHash(h2);
        let sameCount = 0;
        for (let i = 0; i < 100; i++) {
          if (a.nextF64() === b.nextF64()) sameCount++;
        }
        expect(sameCount).toBeLessThan(5);
      }),
      { numRuns: 20 }
    );
  });

  it('forks produce independent but deterministic streams', () => {
    fc.assert(
      fc.property(arbHexHash, arbStringSeed, arbStringSeed, (hash, key1, key2) => {
        fc.pre(key1 !== key2);
        // Two fresh parents seeded identically; forks with same key → same child
        const p1 = rngFromHash(hash);
        const p2 = rngFromHash(hash);
        const c1 = p1.fork(key1);
        const c2 = p2.fork(key1);
        for (let i = 0; i < 100; i++) {
          expect(c1.nextF64()).toBe(c2.nextF64());
        }
        // Fork with a different key produces a different stream
        const p3 = rngFromHash(hash);
        const c3 = p3.fork(key2);
        let diff = 0;
        for (let i = 0; i < 100; i++) {
          if (c1.nextF64() !== c3.nextF64()) diff++;
        }
        expect(diff).toBeGreaterThan(50);
      }),
      { numRuns: 10 }
    );
  });

  it('Xoshiro instance seeded with hex string is well-defined', () => {
    fc.assert(
      fc.property(arbHexHash, (hash) => {
        const r = new Xoshiro256StarStar(hash);
        const v = r.nextF64();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }),
      { numRuns: 20 }
    );
  });

  it('Xoshiro instance seeded with bigint is well-defined', () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 0n, max: 1n << 64n }), (seed) => {
        const r = new Xoshiro256StarStar(seed);
        const v = r.nextF64();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }),
      { numRuns: 20 }
    );
  });

  it('Xoshiro self-consistency: instance methods agree with exported rngFromHash', () => {
    fc.assert(
      fc.property(arbHexHash, (hash) => {
        const direct = new Xoshiro256StarStar(hash);
        const helper = rngFromHash(hash);
        for (let i = 0; i < 50; i++) {
          expect(direct.nextF64()).toBe(helper.nextF64());
        }
      }),
      { numRuns: 10 }
    );
  });

  it('nextBool returns strictly booleans', () => {
    fc.assert(
      fc.property(arbHexHash, (hash) => {
        const r = rngFromHash(hash);
        for (let i = 0; i < 100; i++) {
          const v = r.nextBool();
          expect(typeof v).toBe('boolean');
        }
      }),
      { numRuns: 10 }
    );
  });

  it('nextChoice returns an element of the input array', () => {
    fc.assert(
      fc.property(
        arbHexHash,
        fc.array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 12 }),
        (hash, arr) => {
          const r = rngFromHash(hash);
          for (let i = 0; i < 50; i++) {
            const v = r.nextChoice(arr);
            expect(arr).toContain(v);
          }
        }
      ),
      { numRuns: 10 }
    );
  });
});
