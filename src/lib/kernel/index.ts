/**
 * Paradigm Absolute — Kernel Module
 * Exports the core platform infrastructure:
 * - xoshiro256** deterministic RNG
 * - 17-type gene system with 4 operators each
 * - 103+ domain engines (Beyond Omega)
 * - Cross-domain composition with 9 functor bridges
 */

export { Xoshiro256StarStar as Xoshiro256Star, rngFromHash } from './rng.js';
export {
  GENE_TYPES, validateGene, validateGeneWithDetails, mutateGene, crossoverGene, distanceGene, getGeneTypeInfo
} from './gene_system.js';
export {
  ENGINES, growSeed, growSeedSync, getAllDomains
} from './engines.js';
export { buildC2PAManifest, verifyC2PAManifest, encodeC2PAManifest } from './c2pa-manifest.js';
export type { C2PAClaim } from './c2pa-manifest.js';
export {
  getFunctor, findCompositionPath, composeSeed, getCompositionGraph
} from './composition.js';

// Beyond Omega: 103+ domain engine dispatcher
export {
  dispatch, getDomains, hasDomain, DOMAIN_MAP
} from './engine-dispatcher';

// Phase 1: Gene Type Registry (hierarchical type system)
export {
  geneTypeRegistry, GENE_TYPES as REGISTRY_GENE_TYPES, GENE_TYPE_LIST,
  type TypeNode, type LawResults,
} from './gene-type-registry.js';
