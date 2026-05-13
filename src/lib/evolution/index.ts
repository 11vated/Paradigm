/**
 * Evolution Module — Canonical exports
 *
 * GA and MAP-Elites: native implementations using kernel Seed types.
 * CMA-ES and Functors: re-exported from `src/evolution/` for compatibility
 * (these use UniversalSeed and will be migrated in a future phase).
 */

export { GeneticAlgorithm } from './ga';
export type { GAConfig, GAResult, GenerationRecord } from './ga';
export { MAPElites } from './map-elites';
export type { MapElitesConfig, EvolutionResult, Cell } from './map-elites';
