/**
 * Paradigm World — public surface.
 */
export * from './types';
export { createWorldSeed } from './genesis';
export { generateWorld, hashArtifact } from './generator';
export { composeQuest, questBrief, QUEST_GENERATOR_VERSION } from './quest';
export type { QuestSeedData, QuestArchetype } from './quest';
export { WorldQualityContract } from './contract';

// ─── Phase 10 — World breeding ───────────────────────────────────────────────
export { breedWorlds, mutateWorld } from './breeding';
