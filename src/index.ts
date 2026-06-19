/**
 * Paradigm Absolute — Public API barrel.
 *
 * Re-exports the canonical implementations from `src/lib/*`.
 * (Phase 0 cleanup: removed broken CommonJS `require()` wrappers and
 * references to the deprecated `src/kernel`, `src/gspl`, `src/evolution`,
 * `src/intelligence` legacy roots.)
 */

// Seed system
export { UniversalSeed } from './seeds/universal-seed';
export { GeneType } from './seeds/types';

// Kernel (canonical: src/lib/kernel)
export { Xoshiro256StarStar, rngFromHash } from './lib/kernel/rng';
export { growSeed, getAllDomains } from './lib/kernel/engines';
export type { Seed, Artifact, GeneratorOutput } from './lib/kernel/types';

// GSPL language (canonical: src/lib/kernel/gspl-*  — legacy src/lib/gspl/ deprecated)
export {
  GsplLexer,
  type Token,
  TokenType,
} from './lib/kernel/gspl-lexer';
export {
  GsplParser,
  type ASTNode,
  ASTNodeType,
} from './lib/kernel/gspl-parser';
export {
  GsplInterpreter,
  executeGspl,
} from './lib/kernel/gspl-interpreter';

// Evolution (canonical: src/lib/evolution)
export {
  GeneticAlgorithm,
  MAPElites,
  CMAES,
  POET,
  DQD,
  AURORA,
  NSLC,
  EVOLUTION_ALGORITHMS,
  type EvolutionAlgorithm,
} from './lib/evolution';

// Intelligence (canonical: src/lib/intelligence)
export { IntelligenceLayer } from './lib/intelligence';

// Composition (Phases 20-21)
export { toSeed, toSeedAsync, invertAll, listModalities, hasRealHandler, isInverseSuccess, ALL_MODALITIES } from './lib/composition/inverse-pipeline';
export type { Modality, InverseResult, InverseSuccess, InverseFailure, InverseCandidateBranch } from './lib/composition/inverse-pipeline';
export { routeOutput, getOutputType, listOutputTypes, listOutput20Domains, output20Matrix, getOutputRoute, listAllOutputs, OUTPUT_20_TYPES, OUTPUT_20_MODALITIES } from './lib/composition/output_routing';
export type { Output20Type, OutputModality, OutputRoute, OutputTypeRoute } from './lib/composition/output_routing';

// Platform metadata
export const VERSION = '1.0.0';
export const GENE_COUNT = 17;
export const ENGINE_COUNT = 26;
