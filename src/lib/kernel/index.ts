/**
 * Paradigm Absolute — Kernel Module
 * Exports the core platform infrastructure:
 * - xoshiro256** deterministic RNG
 * - 17-type gene system with 4 operators each
 * - 26 domain engines
 * - Cross-domain composition with 9 functor bridges
 */

export { Xoshiro256StarStar, rngFromHash } from './rng.js';
export {
  GENE_TYPES, validateGene, mutateGene, crossoverGene, distanceGene, getGeneTypeInfo
} from './gene_system.js';
export {
  ENGINES, growSeed, getAllDomains
} from './engines.js';
export {
  getFunctor, findCompositionPath, composeSeed, getCompositionGraph
} from './composition.js';
