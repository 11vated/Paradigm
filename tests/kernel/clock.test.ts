/**
 * Kernel clock shim — wall / counter / frozen modes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  kernelNow, kernelNowIso, withKernelClock,
  setKernelClockMode, getKernelClockMode, __resetKernelClockForTests,
} from '../../src/lib/kernel/clock';

describe('kernel/clock', () => {
  beforeEach(() => __resetKernelClockForTests());

  it('defaults to wall mode', () => {
    expect(getKernelClockMode()).toBe('wall');
  });

  it('wall mode returns real Date.now', () => {
    const a = kernelNow();
    expect(Math.abs(a - Date.now())).toBeLessThan(50);
  });

  it('wall mode returns valid ISO string', () => {
    const iso = kernelNowIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('counter mode is strictly monotonic from 1', () => {
    setKernelClockMode('counter');
    expect(kernelNow()).toBe(1);
    expect(kernelNow()).toBe(2);
    expect(kernelNow()).toBe(3);
  });

  it('counter mode produces unique ISO strings', () => {
    setKernelClockMode('counter');
    const a = kernelNowIso();
    const b = kernelNowIso();
    const c = kernelNowIso();
    expect(new Set([a, b, c]).size).toBe(3);
  });

  it('frozen mode returns the fixed value', () => {
    setKernelClockMode('frozen', 1700000000000);
    expect(kernelNow()).toBe(1700000000000);
    expect(kernelNow()).toBe(1700000000000);
    expect(kernelNowIso()).toBe(new Date(1700000000000).toISOString());
  });

  it('withKernelClock restores prior mode and state', () => {
    setKernelClockMode('counter');
    kernelNow(); kernelNow(); // advance counter to 2
    const result = withKernelClock(42, () => {
      expect(kernelNow()).toBe(42);
      expect(getKernelClockMode()).toBe('frozen');
      return 'inner';
    });
    expect(result).toBe('inner');
    expect(getKernelClockMode()).toBe('counter');
    expect(kernelNow()).toBe(3); // counter resumed
  });

  it('withKernelClock restores even on throw', () => {
    setKernelClockMode('wall');
    expect(() => withKernelClock(1, () => { throw new Error('boom'); }))
      .toThrow('boom');
    expect(getKernelClockMode()).toBe('wall');
  });

  it('determinism: same frozen value → same iso', () => {
    setKernelClockMode('frozen', 42);
    expect(kernelNowIso()).toBe(kernelNowIso());
  });
});
