/**
 * CMA-ES adapter — re-exports from `src/evolution/cmaes.ts`
 * Full implementation at `../../evolution/cmaes.ts` (uses UniversalSeed).
 * Will be migrated to use kernel Seed types in a future phase.
 */

export { CMAES } from '../../evolution/cmaes';
export type { CMAESConfig, CMAESResult } from '../../evolution/cmaes';
