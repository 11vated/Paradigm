/**
 * Game-v1 generator tests — multi-parent determinism + scene graph integrity.
 */
import { describe, it, expect } from 'vitest';
import { createFriendSeed } from '@/lib/friend/genesis';
import { createWorldSeed } from '@/lib/world/genesis';
import { generateWorld } from '@/lib/world/generator';
import { composeQuest } from '@/lib/world/quest';
import { createGameSeed, generateGame, hashArtifact } from '@/lib/game';

const friend = createFriendSeed('nori-the-curious');
const world = createWorldSeed('vellichor');
const worldArt = generateWorld(world);
const quest = composeQuest(friend, world);

describe('Game-v1 generator', () => {
  it('createGameSeed is deterministic by quest seed', () => {
    const a = createGameSeed(quest);
    const b = createGameSeed(quest);
    expect(a.seedHash).toBe(b.seedHash);
    expect(a.id).toBe(b.id);
  });

  it('different quests → different game seeds', () => {
    const otherQuest = composeQuest(friend, createWorldSeed('iron-marsh'));
    const a = createGameSeed(quest);
    const b = createGameSeed(otherQuest);
    expect(a.seedHash).not.toBe(b.seedHash);
  });

  it('salt produces different game seed but same quest parents', () => {
    const a = createGameSeed(quest, 'attempt-1');
    const b = createGameSeed(quest, 'attempt-2');
    expect(a.seedHash).not.toBe(b.seedHash);
    expect(a.parents.quest.seedHash).toBe(b.parents.quest.seedHash);
  });

  it('generateGame produces deterministic artifact', () => {
    const gameSeed = createGameSeed(quest);
    const a = generateGame(gameSeed, worldArt);
    const b = generateGame(gameSeed, worldArt);
    expect(hashArtifact(a)).toBe(hashArtifact(b));
  });

  it('scene graph has correct shape', () => {
    const gameSeed = createGameSeed(quest);
    const game = generateGame(gameSeed, worldArt);
    expect(game.scenes.length).toBe(gameSeed.actCount * gameSeed.scenesPerAct);
    expect(game.endings.length).toBe(gameSeed.endingCount);
    expect(game.startScene).toBe(game.scenes[0].id);
    expect(game.meta.averageChoicesPerScene).toBeGreaterThan(0);
  });

  it('scene text incorporates friend name and world location', () => {
    const gameSeed = createGameSeed(quest);
    const game = generateGame(gameSeed, worldArt);
    const allBody = game.scenes.map((s) => s.body).join(' ');
    expect(allBody).toContain(friend.name);
    const locationNames = worldArt.locations.map((l) => l.name);
    expect(locationNames.some((n) => allBody.includes(n))).toBe(true);
  });

  it('each scene has at least one choice', () => {
    const game = generateGame(createGameSeed(quest), worldArt);
    for (const scene of game.scenes) expect(scene.choices.length).toBeGreaterThan(0);
  });

  it('every choice nextScene points to a valid scene id or ending id', () => {
    const game = generateGame(createGameSeed(quest), worldArt);
    const validIds = new Set([...game.scenes.map((s) => s.id), ...game.endings.map((e) => e.id)]);
    for (const scene of game.scenes) for (const c of scene.choices) expect(validIds.has(c.nextScene)).toBe(true);
  });

  it('endings cover the full karma range [-1, 1]', () => {
    const game = generateGame(createGameSeed(quest), worldArt);
    const minMin = Math.min(...game.endings.map((e) => e.karmaRequirement.min));
    const maxMax = Math.max(...game.endings.map((e) => e.karmaRequirement.max));
    expect(minMin).toBeCloseTo(-1, 5);
    expect(maxMax).toBeCloseTo(1, 5);
  });

  it('artifact carries provenance back to friend and world', () => {
    const gameSeed = createGameSeed(quest);
    expect(gameSeed.parents.friend.id).toBe(friend.id);
    expect(gameSeed.parents.world.id).toBe(world.id);
    expect(gameSeed.parents.quest.seedHash).toBe(quest.seedHash);
  });
});
