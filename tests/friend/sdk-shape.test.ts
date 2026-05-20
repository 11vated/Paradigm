/**
 * SDK shape lock — guards the stable subset of the substrate surface.
 *
 * If any of these symbols disappear or change kind, this test fails.
 * Use to detect inadvertent breaking changes to the public API.
 */
import { describe, it, expect } from 'vitest';
import * as friendApi from '../../packages/paradigm-sdk/src/friend';
import * as worldApi from '../../packages/paradigm-sdk/src/world';
import * as gameApi from '../../packages/paradigm-sdk/src/game';
import * as sdk from '../../packages/paradigm-sdk/src/index';

describe('SDK shape', () => {
  it('friend subentry exposes the expected functions', () => {
    for (const k of ['createFriendSeed', 'breedFriends', 'mutateFriend', 'generateFriend', 'hashFriendArtifact']) {
      expect(typeof (friendApi as any)[k]).toBe('function');
    }
  });

  it('world subentry exposes the expected functions', () => {
    for (const k of ['createWorldSeed', 'generateWorld', 'hashWorldArtifact', 'breedWorlds', 'mutateWorld', 'composeQuest', 'questBrief']) {
      expect(typeof (worldApi as any)[k]).toBe('function');
    }
  });

  it('game subentry exposes the expected functions', () => {
    for (const k of ['createGameSeed', 'generateGame', 'hashGameArtifact', 'evaluateGame', 'evolveGames']) {
      expect(typeof (gameApi as any)[k]).toBe('function');
    }
  });

  it('root barrel re-exports everything', () => {
    expect(typeof (sdk as any).createFriendSeed).toBe('function');
    expect(typeof (sdk as any).createWorldSeed).toBe('function');
    expect(typeof (sdk as any).generateGame).toBe('function');
    expect(typeof (sdk as any).evolveGames).toBe('function');
  });
});
