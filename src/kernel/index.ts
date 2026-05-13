/**
 * @deprecated This kernel directory is legacy. Use `src/lib/kernel/` instead.
 * The canonical kernel uses 64-bit bigint RNG (Xoshiro256StarStar from rng.ts).
 * This module uses 32-bit number-based RNG and different type system.
 *
 * Migration: replace imports from `@/kernel` with `@/lib/kernel`
 */

export { Kernel } from './kernel';
export { Xoshiro256SS, createSeededRNG } from './xoshiro';
export { FIM } from './fim';
export { TickSystem } from './tick';
export { Effects } from './effects';
export { GeneOperators } from './operators';

export type { LegacySeed as Seed, Gene, GeneValue, GeneMetadata, GeneType } from './types';