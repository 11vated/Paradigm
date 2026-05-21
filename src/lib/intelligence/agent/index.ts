/**
 * Sovereign Agent — public barrel.
 *
 * Entry points:
 *   - `createSovereignAgent({ llm, memory })` to instantiate
 *   - `SovereignAgent.run(raw, opts)` to drive a single end-to-end pass
 */

export * from './types';
export { INTENT_TAXONOMY, INTENT_MAP, buildIntentTaxonomyPrompt } from './intent-taxonomy';
export {
  ADJECTIVE_LEXICON,
  VAD_AXES,
  cosine12,
  blendVectors,
  scaleVector,
  normalizeAdjective,
} from './adjective-normalization';

export { parse } from './stages/stage-1-parse';
export { resolve } from './stages/stage-2-resolve';
export { plan } from './stages/stage-3-plan';
export { assemble } from './stages/stage-4-assemble';
export { validate, defaultOracle } from './stages/stage-5-validate';

export {
  BaseSubAgent,
  VisionAgent,
  PersonalityAgent,
  MusicTheoryAgent,
  NarrativeAgent,
  MechanicsAgent,
  PhysicsAgent,
  StyleAgent,
  CritiqueAgent,
  defaultSubAgents,
} from './sub-agents';

export { SovereignAgent, createSovereignAgent } from './orchestrator';
export type { RunOptions, AgentRunReport } from './orchestrator';

export type { Oracle, Signer } from './stages/stage-5-validate';
export { archive as archiveStage6, type ArchiveOptions, type ArchiveReceipt } from './stages/stage-6-archive';
