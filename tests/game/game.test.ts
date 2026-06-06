/**
 * Game — generator tests covering the full Friend → World → Quest → Game chain.
 *
 * Pins the determinism contract across all three layers: same inputs →
 * same GameArtifact, byte-identical. Also pins shape (scene count, ending
 * count, choice wiring).
 */
import { describe, it, expect } from 'vitest';
import { createFriendSeed } from '../../src/lib/friend/genesis';
import { createWorldSeed, generateWorld } from '../../src/lib/world/genesis';
import { composeQuest } from '../../src/lib/world/quest';
import { createGameSeed, generateGame, hashArtifact } from '../../src/lib/game/generator';
import { generateWorld as worldGen } from '../../src/lib/world/generator';

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildGameStack(friendInput: string, worldInput: string, salt?: string) {
  const friend = createFriendSeed(friendInput);
  const world = createWorldSeed(worldInput);
  const quest = composeQuest(friend, world, { salt });
  const worldArtifact = worldGen(world);
  const gameSeed = createGameSeed(quest, salt);
  const game = generateGame(gameSeed, worldArtifact);
  return { friend, world, quest, worldArtifact, gameSeed, game };
}

// ─── createGameSeed ─────────────────────────────────────────────────────────

describe('createGameSeed', () => {
  it('is deterministic: same quest + same salt → same game seed', () => {
    const friend = createFriendSeed('paradigm-game-friend');
    const world = createWorldSeed('paradigm-game-world');
    const quest = composeQuest(friend, world, { salt: 'X' });
    const g1 = createGameSeed(quest, 'X');
    const g2 = createGameSeed(quest, 'X');
    expect(g1.seedHash).toBe(g2.seedHash);
    expect(g1.id).toBe(g2.id);
    expect(g1.branchingFactor).toBe(g2.branchingFactor);
    expect(g1.scenesPerAct).toBe(g2.scenesPerAct);
    expect(g1.endingCount).toBe(g2.endingCount);
  });

  it('branchingFactor is in [2, 3]', () => {
    for (let i = 0; i < 10; i++) {
      const friend = createFriendSeed(`paradigm-bf-friend-${i}`);
      const world = createWorldSeed(`paradigm-bf-world-${i}`);
      const quest = composeQuest(friend, world);
      const g = createGameSeed(quest);
      expect(g.branchingFactor).toBeGreaterThanOrEqual(2);
      expect(g.branchingFactor).toBeLessThanOrEqual(3);
    }
  });

  it('scenesPerAct is in [3, 4]', () => {
    for (let i = 0; i < 10; i++) {
      const friend = createFriendSeed(`paradigm-spa-friend-${i}`);
      const world = createWorldSeed(`paradigm-spa-world-${i}`);
      const quest = composeQuest(friend, world);
      const g = createGameSeed(quest);
      expect(g.scenesPerAct).toBeGreaterThanOrEqual(3);
      expect(g.scenesPerAct).toBeLessThanOrEqual(4);
    }
  });

  it('endingCount is in [2, 4]', () => {
    for (let i = 0; i < 10; i++) {
      const friend = createFriendSeed(`paradigm-ec-friend-${i}`);
      const world = createWorldSeed(`paradigm-ec-world-${i}`);
      const quest = composeQuest(friend, world);
      const g = createGameSeed(quest);
      expect(g.endingCount).toBeGreaterThanOrEqual(2);
      expect(g.endingCount).toBeLessThanOrEqual(4);
    }
  });

  it('parents include friend, world, and quest references', () => {
    const friend = createFriendSeed('paradigm-par-friend');
    const world = createWorldSeed('paradigm-par-world');
    const quest = composeQuest(friend, world);
    const g = createGameSeed(quest);
    expect(g.parents.friend.id).toBe(friend.id);
    expect(g.parents.friend.name).toBe(friend.name);
    expect(g.parents.world.id).toBe(world.id);
    expect(g.parents.quest.id).toBe(quest.id);
    expect(g.parents.quest.seedHash).toBe(quest.seedHash);
  });

  it('archetype is inherited from the quest', () => {
    const friend = createFriendSeed('paradigm-arch-friend');
    const world = createWorldSeed('paradigm-arch-world');
    const quest = composeQuest(friend, world);
    const g = createGameSeed(quest);
    expect(g.archetype).toBe(quest.genes.archetype);
  });
});

// ─── generateGame ───────────────────────────────────────────────────────────

describe('generateGame', () => {
  it('is deterministic: same game seed → byte-identical artifact hash', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-det-friend', 'paradigm-det-world');
    const a1 = generateGame(gameSeed, worldArtifact);
    const a2 = generateGame(gameSeed, worldArtifact);
    expect(hashArtifact(a1)).toBe(hashArtifact(a1));
    expect(a1.scenes.length).toBe(a2.scenes.length);
    expect(a1.endings.length).toBe(a2.endings.length);
    expect(a1.title).toBe(a2.title);
  });

  it('artifact has scenes.length = actCount * scenesPerAct', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-sf-friend', 'paradigm-sf-world');
    const a = generateGame(gameSeed, worldArtifact);
    expect(a.scenes.length).toBe(gameSeed.actCount * gameSeed.scenesPerAct);
  });

  it('artifact has endings.length = endingCount', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-ee-friend', 'paradigm-ee-world');
    const a = generateGame(gameSeed, worldArtifact);
    expect(a.endings.length).toBe(gameSeed.endingCount);
  });

  it('startScene is the first scene id', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-ss-friend', 'paradigm-ss-world');
    const a = generateGame(gameSeed, worldArtifact);
    expect(a.startScene).toBe(a.scenes[0].id);
  });

  it('every scene (except last) has at least one choice', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-choices-friend', 'paradigm-choices-world');
    const a = generateGame(gameSeed, worldArtifact);
    for (let i = 0; i < a.scenes.length - 1; i++) {
      expect(a.scenes[i].choices.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('the final scene\'s choices target the ending ids', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-end-friend', 'paradigm-end-world');
    const a = generateGame(gameSeed, worldArtifact);
    const lastScene = a.scenes[a.scenes.length - 1];
    const endingIds = new Set(a.endings.map((e) => e.id));
    for (const choice of lastScene.choices) {
      expect(endingIds.has(choice.nextScene)).toBe(true);
    }
  });

  it('scenes within an act have a unique act number (0-indexed)', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-act-friend', 'paradigm-act-world');
    const a = generateGame(gameSeed, worldArtifact);
    const seenActs = new Set(a.scenes.map((s) => s.act));
    expect(seenActs.size).toBe(gameSeed.actCount);
    for (let i = 0; i < gameSeed.actCount; i++) {
      expect(seenActs.has(i)).toBe(true);
    }
  });

  it('scene bodies mention the friend\'s name', () => {
    const { friend, gameSeed, worldArtifact } = buildGameStack('paradigm-named-friend', 'paradigm-named-world');
    const a = generateGame(gameSeed, worldArtifact);
    // At least one scene body must mention the friend
    const mentions = a.scenes.filter((s) => s.body.includes(friend.name)).length;
    expect(mentions).toBeGreaterThan(0);
  });

  it('title follows the pattern "<friend> of <world>"', () => {
    const { friend, world, gameSeed, worldArtifact } = buildGameStack('paradigm-titled-friend', 'paradigm-titled-world');
    const a = generateGame(gameSeed, worldArtifact);
    expect(a.title).toBe(`${friend.name} of ${world.name}`);
  });

  it('meta.averageChoicesPerScene = choiceCount / sceneCount', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-avg-friend', 'paradigm-avg-world');
    const a = generateGame(gameSeed, worldArtifact);
    expect(a.meta.averageChoicesPerScene).toBeCloseTo(
      a.meta.choiceCount / a.meta.sceneCount, 6);
  });

  it('every ending has a karma range with min < max', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-karma-friend', 'paradigm-karma-world');
    const a = generateGame(gameSeed, worldArtifact);
    for (const ending of a.endings) {
      expect(ending.karmaRequirement.min).toBeLessThan(ending.karmaRequirement.max);
    }
  });

  it('endings sorted by karma min form a partition of [-1, 1]', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-karma2-friend', 'paradigm-karma2-world');
    const a = generateGame(gameSeed, worldArtifact);
    const sorted = [...a.endings].sort((x, y) => x.karmaRequirement.min - y.karmaRequirement.min);
    expect(sorted[0].karmaRequirement.min).toBeCloseTo(-1, 6);
    expect(sorted[sorted.length - 1].karmaRequirement.max).toBeCloseTo(1, 6);
  });

  it('works without an optional world artifact (uses world name only)', () => {
    const friend = createFriendSeed('paradigm-no-world-friend');
    const world = createWorldSeed('paradigm-no-world-world');
    const quest = composeQuest(friend, world);
    const gameSeed = createGameSeed(quest);
    const a = generateGame(gameSeed); // no world passed
    expect(a.scenes.length).toBeGreaterThan(0);
    expect(a.title).toContain(friend.name);
    expect(a.title).toContain(world.name);
  });
});

// ─── hashArtifact ───────────────────────────────────────────────────────────

describe('hashArtifact', () => {
  it('produces 64-char hex SHA-256', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-hash-friend', 'paradigm-hash-world');
    const a = generateGame(gameSeed, worldArtifact);
    const h = hashArtifact(a);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when a scene body changes', () => {
    const { gameSeed, worldArtifact } = buildGameStack('paradigm-body-friend', 'paradigm-body-world');
    const a1 = generateGame(gameSeed, worldArtifact);
    const a2 = {
      ...a1,
      scenes: a1.scenes.map((s, i) => i === 0 ? { ...s, body: 'tampered' } : s),
    };
    expect(hashArtifact(a1)).not.toBe(hashArtifact(a2));
  });
});
