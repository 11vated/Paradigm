/**
 * Game evolution loop — search the (Friend × World) space against
 * the oracle. Deterministic GA over composite seed pairs.
 */
import { createHash } from 'crypto';
import { createFriendSeed } from '../friend/genesis';
import { createWorldSeed } from '../world/genesis';
import { composeQuest } from '../world/quest';
import { generateGame, createGameSeed } from './generator';
import { evaluate, type FitnessReport } from './oracle';
import type { FriendSeedData } from '../friend/types';
import type { WorldSeedData } from '../world/types';

export interface Candidate {
  friendSeed: string;
  worldSeed: string;
  gameSeed: string;
  fitness: FitnessReport;
}

export interface EvolveOptions {
  pop: number;
  generations: number;
  initialSeed: string;
  elitism?: number;
}

function rngFromHash(hash: string): () => number {
  const h = createHash('sha256').update(hash).digest();
  let s = (h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3];
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    s ^= s >>> 16;
    return ((s >>> 0) % 1_000_000_000) / 1_000_000_000;
  };
}

function evaluateCandidate(friendSeed: string, worldSeed: string, gameSalt: string): Candidate {
  const f = createFriendSeed(friendSeed);
  const w = createWorldSeed(worldSeed);
  const q = composeQuest(f, w, { salt: gameSalt });
  const g = generateGame(createGameSeed(q));
  const fitness = evaluate(g);
  return { friendSeed, worldSeed, gameSeed: gameSalt, fitness };
}

function mutate(seed: string, rng: () => number, suffix: string): string {
  return `${seed}-${suffix}-${Math.floor(rng() * 1_000_000)}`;
}

export function evolveGames(opts: EvolveOptions): {
  best: Candidate;
  history: { gen: number; bestScore: number; meanScore: number }[];
  topK: Candidate[];
} {
  const rng = rngFromHash(opts.initialSeed);
  const elitism = opts.elitism ?? 2;

  // Gen 0 — random population
  let pop: Candidate[] = [];
  for (let i = 0; i < opts.pop; i++) {
    const fs = `friend-${opts.initialSeed}-${i}-${Math.floor(rng() * 1e9)}`;
    const ws = `world-${opts.initialSeed}-${i}-${Math.floor(rng() * 1e9)}`;
    const gs = `gen0-${i}`;
    pop.push(evaluateCandidate(fs, ws, gs));
  }
  pop.sort((a, b) => b.fitness.score - a.fitness.score);
  const history = [{ gen: 0, bestScore: pop[0].fitness.score, meanScore: pop.reduce((s, c) => s + c.fitness.score, 0) / pop.length }];

  for (let g = 1; g < opts.generations; g++) {
    const next: Candidate[] = pop.slice(0, elitism);
    while (next.length < opts.pop) {
      const a = pop[Math.floor(rng() * elitism * 2)] || pop[0];
      const b = pop[Math.floor(rng() * elitism * 2)] || pop[0];
      const child = evaluateCandidate(
        rng() < 0.5 ? a.friendSeed : b.friendSeed,
        rng() < 0.5 ? a.worldSeed : b.worldSeed,
        `g${g}-${next.length}`,
      );
      if (rng() < 0.3) {
        const mutated = evaluateCandidate(
          mutate(child.friendSeed, rng, 'f'),
          rng() < 0.5 ? child.worldSeed : mutate(child.worldSeed, rng, 'w'),
          `g${g}m-${next.length}`,
        );
        next.push(mutated.fitness.score > child.fitness.score ? mutated : child);
      } else {
        next.push(child);
      }
    }
    pop = next.sort((a, b) => b.fitness.score - a.fitness.score);
    history.push({
      gen: g,
      bestScore: pop[0].fitness.score,
      meanScore: pop.reduce((s, c) => s + c.fitness.score, 0) / pop.length,
    });
  }

  return { best: pop[0], history, topK: pop.slice(0, Math.min(10, pop.length)) };
}
