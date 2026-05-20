/**
 * Paradigm Friend — public surface.
 *
 * The Friend is Paradigm's first sovereign digital companion: a typed
 * composite seed (body, face, voice, persona, memory, bond), grown
 * deterministically into a FriendArtifact, breedable with other friends,
 * mutable, owned by the user via the sovereignty layer, and persisted
 * via FriendStore.
 *
 * See:
 *   - Documents/Paradigm-Vision/02_THE_FRIEND.md   (vision spec)
 *   - src/lib/friend/types.ts                       (FriendSeedData / FriendArtifact types)
 *   - src/lib/friend/genesis.ts                     (createFriendSeed)
 *   - src/lib/friend/breeding.ts                    (breedFriends / mutateFriend)
 *   - src/lib/friend/generator.ts                   (generateFriend, hashArtifact)
 *   - src/lib/friend/store.ts                       (FriendStore — persistence + lineage)
 */

export type {
  BodyArchetype, BodyGene, FaceGene, VoiceGene, PersonaGene, BigFive,
  SpeechStyle, MemoryGene, BondGene, FriendSeedData, FriendArtifact,
  FriendPhenotype, VoiceRendering, FriendGenerationOptions,
  FriendRng, FriendSovereignty,
} from './types';

export { createFriendSeed } from './genesis';
export { breedFriends, mutateFriend } from './breeding';
export { generateFriend, hashArtifact } from './generator';
export { FriendStore, getFriendStore, __resetFriendStoreForTests } from './store';
export type { LineageNode, FriendStoreStats } from './store';
export {
  generateFriendKeyPair, signFriendSeed, verifyFriendSovereignty,
  friendPayloadHash, canonicalFriendJson,
} from './sovereignty';
export type { FriendKeyPair, VerifyResult } from './sovereignty';

// ─── Phase 1 (7/n) — on-chain anchoring ──────────────────────────────────────
export {
  prepareFriendMint, anchorFriendOnChain, verifyFriendAnchor,
} from './onchain';
export type { FriendOnChainAnchor, AnchorRequest, AnchorResult, PreparedAnchor, FriendNftMetadata } from './onchain';

// ─── Phase 2 (1/n) — Quality Contract ────────────────────────────────────────
export { FriendQualityContract } from './contract';
export type { FriendInvertedGenes } from './contract';

// ─── Phase 3 (1/n) — Composition bridges ─────────────────────────────────────
export { composeFriend, registerFriendBridges, FRIEND_BRIDGES } from './composition';

// ─── Phase 6 (2/n) — marketplace listing preparation ─────────────────────────
export { prepareList, prepareDelist, prepareBuy } from './marketplace';
export type { ListingPrep } from './marketplace';

// ─── Tier 1 — Voice synthesis ────────────────────────────────────────────────
export { speakAs, isSpeechAvailable, genePitch, geneRate, geneVolume, pickVoice } from './voice';

// ─── Tier 1 — Conversation engine ────────────────────────────────────────────
export { generateReply, greetingFor } from './converse';
export type { Turn, ReplyContext } from './converse';
