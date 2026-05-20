/**
 * Paradigm Game — types. A Game is a third-tier artifact: derived from a
 * QuestSeed (Friend × World), it is a deterministic, playable scene graph.
 */

export interface GameSeedData {
  id: string;
  seedHash: string;
  questSeedHash: string;
  parents: {
    friend: { id: string; name: string; seedHash: string };
    world: { id: string; name: string; seedHash: string };
    quest: { id: string; seedHash: string };
  };
  archetype: string;
  actCount: number;
  branchingFactor: number;
  scenesPerAct: number;
  endingCount: number;
}

export interface SceneChoice {
  text: string;
  nextScene: string;
  /** -1..1 — how this choice nudges karma/morality */
  karma: number;
  /** boolean tag that future generators can branch on */
  endsAct: boolean;
}

export interface GameScene {
  id: string;
  act: number;
  title: string;
  body: string;
  setting: string;
  choices: SceneChoice[];
}

export interface GameEnding {
  id: string;
  title: string;
  body: string;
  karmaRequirement: { min: number; max: number };
}

export interface GameArtifact {
  seedId: string;
  seedHash: string;
  title: string;
  pitch: string;
  archetype: string;
  startScene: string;
  scenes: GameScene[];
  endings: GameEnding[];
  meta: {
    generatorVersion: string;
    sceneCount: number;
    choiceCount: number;
    averageChoicesPerScene: number;
  };
}

export const GAME_GENERATOR_VERSION = '1.0.0';
