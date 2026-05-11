export interface DeterministicRng {
  nextU64(): bigint;
  nextF64(): number;
  nextInt(min?: number, max?: number): number;
  fork(key: string): DeterministicRng;
}

export type LegacyFloatRng = DeterministicRng | { nextFloat: () => number } | { nextF64: () => number };

export function nextDeterministicFloat(rng: LegacyFloatRng): number {
  if ('nextF64' in rng && typeof rng.nextF64 === 'function') {
    return rng.nextF64();
  }
  if ('nextFloat' in rng && typeof rng.nextFloat === 'function') {
    return rng.nextFloat();
  }
  throw new Error('A deterministic RNG with nextF64() or nextFloat() is required.');
}
