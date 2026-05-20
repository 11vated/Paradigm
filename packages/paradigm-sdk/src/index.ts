/**
 * Paradigm SDK — full deterministic substrate surface.
 *
 *   import { createFriendSeed, generateFriend } from '@paradigm/sdk/friend';
 *   import { createWorldSeed, composeQuest } from '@paradigm/sdk/world';
 *   import { generateGame, evaluateGame, evolveGames } from '@paradigm/sdk/game';
 *
 * All functions are pure + deterministic w.r.t. their seed inputs.
 */
export * from './friend';
export * from './world';
export * from './game';
