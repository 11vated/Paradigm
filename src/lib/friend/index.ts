/**
 * Paradigm Friend — public surface.
 *
 * The Friend is Paradigm's first sovereign digital companion: a typed
 * composite seed (body, face, voice, persona, memory, bond), grown
 * deterministically into a FriendArtifact, breedable with other friends,
 * mutable, and owned by the user via the sovereignty layer.
 *
 * See:
 *   - Documents/Paradigm-Vision/02_THE_FRIEND.md (vision spec)
 *   - src/lib/friend/types.ts        (FriendSeedData / FriendArtifact types)
 *   - src/lib/friend/genesis.ts      (createFriendSeed)
 *   - src/lib/friend/breeding.ts     (breedFriends / mutateFriend)
 *   - src/lib/friend/generator.ts    (generateFriend → FriendArtifact)
 */

export * from './types';
export { createFriendSeed } from './genesis';
export { breedFriends, mutateFriend } from './breeding';
export { generateFriend, hashArtifact } from './generator';
