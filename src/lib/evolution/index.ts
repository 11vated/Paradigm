/**
 * Evolution Module — Canonical exports
 *
 * 7 algorithms: GA, MAP-Elites, CMA-ES, POET, DQD, AURORA, NSLC
 */

export { GeneticAlgorithm } from './ga';
export type { GAConfig, GAResult, GenerationRecord } from './ga';
export { MAPElites } from './map-elites';
export type { MapElitesConfig, EvolutionResult, Cell } from './map-elites';
export { CMAES, createCMAES } from './cmaes-full';
export type { CMAESConfig, CMAESResult } from './cmaes-full';
export { POET, createPOET } from './poet';
export type { POETConfig, POETResult } from './poet';
export { DQD, createDQD } from './dqd';
export type { DQDConfig, DQDResult } from './dqd';
export { AURORA, createAURORA } from './aurora';
export type { AURORAConfig, AURORAResult } from './aurora';
export { NSLC, createNSLC } from './nslc';
export type { NSLCConfig, NSLCResult } from './nslc';

export const EVOLUTION_ALGORITHMS = ['ga', 'map-elites', 'cmaes', 'poet', 'dqd', 'aurora', 'nslc'] as const;
export type EvolutionAlgorithm = typeof EVOLUTION_ALGORITHMS[number];
