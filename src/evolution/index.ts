/**
 * @deprecated This evolution module uses UniversalSeed.
 * Use `src/lib/evolution/` for GA and MAP-Elites with kernel Seed types.
 * Source kept for CMA-ES and Functors which will be migrated later.
 */

export { CMAES } from './cmaes';
export type { CMAESConfig, CMAESResult } from './cmaes';
export { FunctorRegistry, GameFunctor, MusicFunctor, ArtFunctor, StorytellingFunctor } from './functors';
export type { FunctorBridge } from './functors';