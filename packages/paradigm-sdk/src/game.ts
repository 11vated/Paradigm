/** Paradigm SDK — Game surface. */
export {
  createGameSeed,
  generateGame,
  hashArtifact as hashGameArtifact,
  evaluateGame,
  evolveGames,
} from '../../../src/lib/game';
export type {
  GameSeedData,
  GameArtifact,
  GameScene,
  SceneChoice,
  GameEnding,
  FitnessReport,
  PathSummary,
  Candidate,
  EvolveOptions,
} from '../../../src/lib/game';
