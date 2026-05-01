/**
 * Phase 0 / G-05 acceptance test.
 *
 * The QCD SU(2) Metropolis sampler previously drew from Math.random(), so two
 * runs with identical parameters produced different gauge-link states — which
 * contradicts the kernel's determinism guarantee and the platform's "seed is
 * the reproducible genome" axiom. The solver now accepts a pluggable RNG.
 * This test verifies that the same seed + same solver steps produce a
 * byte-identical final Float32Array.
 */
import { describe, it, expect } from 'vitest';
import { QCDSolver, qcdRngFromHash } from '../../src/lib/qft/qcd_solver.js';

describe('QCD determinism (G-05)', () => {
  const GRID: [number, number, number, number] = [4, 4, 4, 4];
  const BETA = 2.5;
  const STEPS = 3;  // Keep small — each Metropolis sweep touches every link.
  const HASH  = '0123456789abcdef0123456789abcdef';

  function runOnce(): Float32Array {
    const solver = new QCDSolver(GRID, BETA, qcdRngFromHash(HASH, 'test'));
    for (let i = 0; i < STEPS; i++) solver.step();
    // Copy to detach from the solver so GC can't interfere with comparison.
    return new Float32Array(solver.links);
  }

  it('two runs with the same seed produce byte-identical gauge links', () => {
    const a = runOnce();
    const b = runOnce();
    expect(a.length).toBe(b.length);
    // Iterate rather than use toEqual to get a clear failure index on mismatch.
    for (let i = 0; i < a.length; i++) {
      // `Float32Array` values should be bit-exact given the same sequence of
      // floating-point ops — we do a direct equality rather than `toBeCloseTo`.
      if (a[i] !== b[i]) {
        throw new Error(`Non-deterministic QCD link at index ${i}: ${a[i]} vs ${b[i]}`);
      }
    }
  });

  it('different salts produce different gauge-link streams', () => {
    // Sanity check the RNG plumbing — if this fails we probably collapsed
    // the RNG onto a constant.
    const solverA = new QCDSolver(GRID, BETA, qcdRngFromHash(HASH, 'alpha'));
    const solverB = new QCDSolver(GRID, BETA, qcdRngFromHash(HASH, 'beta'));
    for (let i = 0; i < STEPS; i++) { solverA.step(); solverB.step(); }
    // At least one link should differ.
    let differs = false;
    for (let i = 0; i < solverA.links.length && !differs; i++) {
      if (solverA.links[i] !== solverB.links[i]) differs = true;
    }
    expect(differs).toBe(true);
  });

  it('average plaquette is finite and in [−1, 1]', () => {
    // Guards against numerical blowups (NaN/Inf) that a bad RNG could induce.
    const solver = new QCDSolver(GRID, BETA, qcdRngFromHash(HASH, 'plaq'));
    for (let i = 0; i < STEPS; i++) solver.step();
    const p = solver.calculatePlaquette();
    expect(Number.isFinite(p)).toBe(true);
    expect(p).toBeGreaterThanOrEqual(-1);
    expect(p).toBeLessThanOrEqual(1);
  });
});
