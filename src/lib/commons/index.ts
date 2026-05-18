export {
  COMMONS_ROOT, SEEDS_DIR, INDEX_PATH,
  loadIndex, saveIndex, addToIndex,
  findByDomain, findByTags, searchSeeds,
  seedFilePath, computeSeedHash,
  listDomains, countByDomain, randomSeed,
} from './commons-index';
export type { CanonicalSeedEntry, CommonsIndex } from './commons-index';

export { MemorySystem } from './memory/memory-system';
export { WorkingMemory } from './memory/working-memory';
export { ExemplarMemory } from './memory/exemplar-memory';
export { EpisodicMemory } from './memory/episodic-memory';
export { SubstrateMemory } from './memory/substrate-memory';
export type { UserPreference, SessionContext } from './memory/working-memory';
export type { ExemplarEntry } from './memory/exemplar-memory';
export type { Episode, EpisodeSession } from './memory/episodic-memory';
export type { SubstrateQuery, SubstrateResult, LibraryModule, InventoryBatch } from './memory/substrate-memory';

export { VerificationGate, defaultVerificationGate, getDomainChecker, DOMAIN_CHECKERS } from './verification';
export type { VerificationGateConfig, VerificationResult, CheckerResult, DomainChecker } from './verification';