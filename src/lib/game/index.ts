/**
 * Paradigm Game — public surface.
 */
export * from './types';
export { createGameSeed, generateGame, hashArtifact } from './generator';
export { GameQualityContract } from './contract';

// ─── Phase 7 — Playability Oracle ────────────────────────────────────────────
export { evaluate as evaluateGame } from './oracle';
export type { FitnessReport, PathSummary } from './oracle';

// ─── Phase 9 — Evolutionary game search ──────────────────────────────────────
export { evolveGames } from './evolution';
export type { Candidate, EvolveOptions } from './evolution';
export { mapElitesGames } from './map-elites';
export type { Cell as MapEliteCell, MapEliteResult, MapEliteOptions } from './map-elites';
