/**
 * Paradigm Kernel — clock shim.
 *
 * The kernel must never read wall-clock time *directly* — that breaks
 * replay, makes hashes time-dependent, and makes determinism tests flaky.
 *
 * Instead, the kernel reads time through this shim, which:
 *   - Defaults to wall-clock for human-facing metadata.
 *   - Can be switched to a monotonic counter for fully reproducible runs.
 *   - Can be frozen at a fixed value for tests / replay.
 *
 * Usage:
 *   kernelNow()                 → number (ms epoch in wall mode)
 *   kernelNowIso()              → ISO 8601 string
 *   withKernelClock(value, fn)  → run fn with a frozen clock, restore after
 *   setKernelClockMode('counter') → switch to monotonic counter
 *
 * NOTE: this file is the ONE place that may read wall-clock entropy.
 * It is exempted from the determinism boundary lint rule.
 */

/* eslint-disable no-restricted-syntax */

export type KernelClockMode = 'wall' | 'counter' | 'frozen';

let _mode: KernelClockMode = 'wall';
let _counter = 0;
let _frozen = 0;

export function setKernelClockMode(mode: KernelClockMode, frozenValue = 0): void {
  _mode = mode;
  if (mode === 'frozen') _frozen = frozenValue;
  if (mode === 'counter') _counter = 0;
}

export function getKernelClockMode(): KernelClockMode {
  return _mode;
}

/** Returns the current kernel time in ms. Mode-dependent. */
export function kernelNow(): number {
  switch (_mode) {
    case 'wall':    return Date.now();
    case 'counter': return ++_counter;
    case 'frozen':  return _frozen;
  }
}

/** Returns the current kernel time as an ISO 8601 string. */
export function kernelNowIso(): string {
  if (_mode === 'wall') return new Date().toISOString();
  return new Date(kernelNow()).toISOString();
}

/** Run `fn` with the clock frozen at `value`, then restore prior mode. */
export function withKernelClock<T>(value: number, fn: () => T): T {
  const prevMode = _mode;
  const prevCounter = _counter;
  const prevFrozen = _frozen;
  _mode = 'frozen';
  _frozen = value;
  try { return fn(); }
  finally { _mode = prevMode; _counter = prevCounter; _frozen = prevFrozen; }
}

/** Reset to default state — for tests. */
export function __resetKernelClockForTests(): void {
  _mode = 'wall';
  _counter = 0;
  _frozen = 0;
}
