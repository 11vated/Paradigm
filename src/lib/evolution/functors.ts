/**
 * Functor adapter — re-exports from `src/evolution/functors.ts`
 * Full implementation at `../../evolution/functors.ts` (uses UniversalSeed).
 * Will be migrated to use kernel Seed types in a future phase.
 */

export { FunctorRegistry, GameFunctor, MusicFunctor, ArtFunctor, StorytellingFunctor } from '../../evolution/functors';
export type { FunctorBridge } from '../../evolution/functors';
