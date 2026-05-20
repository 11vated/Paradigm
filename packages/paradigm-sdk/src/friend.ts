/** Paradigm SDK — Friend surface. Stable subset of the substrate API. */
export {
  createFriendSeed,
  breedFriends,
  mutateFriend,
  generateFriend,
  hashArtifact as hashFriendArtifact,
} from '../../../src/lib/friend';
export type {
  FriendSeedData,
  FriendArtifact,
  BodyGene,
  FaceGene,
  VoiceGene,
  PersonaGene,
  MemoryGene,
  BondGene,
  FriendSovereignty,
} from '../../../src/lib/friend/types';
