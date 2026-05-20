/**
 * Game Quality Contract — the first MULTI-PARENT artifact in the
 * Paradigm Quality Contract registry. Pulls Friend + World together via
 * Quest, then synthesizes a scene graph.
 */
import { createFriendSeed } from '../friend/genesis';
import { createWorldSeed } from '../world/genesis';
import { composeQuest } from '../world/quest';
import { generateWorld } from '../world/generator';
import { registerContract, type QualityContract, type QualityReport, type CuratedSeed } from '../kernel/quality-contract';
import { createGameSeed, generateGame, hashArtifact, GAME_GENERATOR_VERSION } from './generator';
import type { GameSeedData, GameArtifact } from './types';

interface GameInverted {
  archetype: string;
  sceneCount: number;
  choiceCount: number;
  endingCount: number;
  actCount: number;
}

async function synthesize(s: GameSeedData): Promise<GameArtifact> {
  // The seed already contains parent provenance — we just need world locations
  // to enrich scenes. Re-derive the world from its hash by re-running genesis
  // (deterministic) using the world's name as the seed input.
  const world = generateWorld(createWorldSeed(s.parents.world.name));
  return generateGame(s, world);
}

function invert(a: GameArtifact): GameInverted {
  return {
    archetype: a.archetype,
    sceneCount: a.meta.sceneCount,
    choiceCount: a.meta.choiceCount,
    endingCount: a.endings.length,
    actCount: Math.max(...a.scenes.map((s) => s.act)) + 1,
  };
}

function rate(a: GameArtifact): QualityReport {
  // Quality axes: completeness (has scenes/endings), branching (>1 choice avg),
  // narrative shape (act count matches archetype), naming (friend+world appear)
  const completeness = a.scenes.length >= 6 && a.endings.length >= 2 ? 1 : 0.5;
  const branching = a.meta.averageChoicesPerScene >= 1.5 ? 1 : a.meta.averageChoicesPerScene / 1.5;
  const shape = Math.max(...a.scenes.map((s) => s.act)) >= 2 ? 1 : 0.6;
  const naming = a.title.includes(' of ') ? 1 : 0.5;
  const score = (completeness + branching + shape + naming) / 4;
  return {
    score,
    axes: { completeness, branching, shape, naming },
    notes: [`scenes=${a.scenes.length}`, `endings=${a.endings.length}`, `avgChoices=${a.meta.averageChoicesPerScene.toFixed(1)}`],
  };
}

function buildCurated(friendSeed: string, worldSeed: string, id: string, name: string, intent: string): CuratedSeed<GameSeedData> {
  const f = createFriendSeed(friendSeed);
  const w = createWorldSeed(worldSeed);
  const q = composeQuest(f, w);
  return { id, name, intent, seed: createGameSeed(q) };
}

const CURATED: ReadonlyArray<CuratedSeed<GameSeedData>> = [
  buildCurated('nori-the-curious',  'vellichor',     'game-mythic-quest',        'Mythic Quest',        'Hero in a slow mythic world'),
  buildCurated('atlas-the-bold',    'iron-marsh',    'game-iron-survival',       'Iron Survival',       'Bold protagonist in post-apoc tundra'),
  buildCurated('iris',              'thrice-fallen', 'game-spire-intrigue',      'Spire Intrigue',      'Sensitive sleuth in sci-fi politics'),
  buildCurated('sage',              'sun-quay',      'game-sun-mystery',         'Sun Quay Mystery',    'Patient detective on a tropical coast'),
  buildCurated('wren-the-quiet',    'lyrelm',        'game-lyrelm-redemption',   'Lyrelm Redemption',   'Quiet exile in a haunted realm'),
];

export const GameQualityContract: QualityContract<GameSeedData, GameArtifact, GameInverted> = {
  domain: 'game',
  version: GAME_GENERATOR_VERSION,
  synthesize,
  invert,
  rate,
  curated: () => CURATED,
  hashArtifact,
};

registerContract(GameQualityContract as any);
