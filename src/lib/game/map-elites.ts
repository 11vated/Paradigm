import { createHash } from 'crypto';
import { createFriendSeed } from '../friend/genesis';
import { createWorldSeed } from '../world/genesis';
import { composeQuest } from '../world/quest';
import { createGameSeed, generateGame } from './generator';
import { evaluate } from './oracle';
import type { FriendSeedData } from '../friend';
import type { WorldSeedData } from '../world';

const ARCHETYPES = ['heroic', 'mystery', 'survival', 'discovery', 'political', 'redemption'] as const;
type Archetype = typeof ARCHETYPES[number];

export interface Cell {
  archetype: Archetype;
  paceBin: number;
  friendSeed: string;
  worldSeed: string;
  score: number;
  completability: number;
  branching: number;
  ending: string;
  archetypeFound: string;
}

export interface MapEliteResult {
  cells: Map<string, Cell>;
  best: Cell | null;
  grid: { archetype: Archetype; paceBin: number; cell: Cell | null }[];
  filled: number;
  total: number;
  generations: number;
}

function rngFromHash(h: string): () => number {
  const b = createHash('sha256').update(h).digest();
  let s = (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3];
  return () => {
    s = Math.imul(s ^ (s >>> 15), 2246822507);
    s = Math.imul(s ^ (s >>> 13), 3266489909);
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0xffffffff;
  };
}

function evalPair(friendSeed: string, worldSeed: string) {
  const f = createFriendSeed(friendSeed);
  const w = createWorldSeed(worldSeed);
  const q = composeQuest(f, w);
  const art = generateGame(createGameSeed(q));
  const r = evaluate(art);
  return { friend: f, world: w, art, report: r };
}

function paceBin(report: ReturnType<typeof evaluate>, bins: number): number {
  // Use overall score's variance vs choiceDensity proxy
  const v = (1 - report.axes.paceVariance);
  return Math.min(bins - 1, Math.max(0, Math.floor(v * bins)));
}

function inferArchetype(art: { archetype?: string }): Archetype {
  const a = String(art.archetype || 'heroic').toLowerCase();
  return (ARCHETYPES as readonly string[]).includes(a) ? (a as Archetype) : 'heroic';
}

function key(arch: Archetype, bin: number): string {
  return `${arch}@${bin}`;
}

export interface MapEliteOptions {
  initialSeed: string;
  paceBins?: number;       // default 4
  iterations?: number;     // default 60
  randomFraction?: number; // default 0.3 — share of iterations that are pure-random vs mutation
}

export function mapElitesGames(opts: MapEliteOptions): MapEliteResult {
  const paceBins = opts.paceBins ?? 4;
  const iterations = opts.iterations ?? 60;
  const randomFraction = opts.randomFraction ?? 0.3;
  const rng = rngFromHash(opts.initialSeed);
  const cells = new Map<string, Cell>();

  function consider(friendSeed: string, worldSeed: string) {
    const { art, report } = evalPair(friendSeed, worldSeed);
    const arch = inferArchetype(art as any);
    const bin = paceBin(report, paceBins);
    const k = key(arch, bin);
    const prev = cells.get(k);
    if (!prev || report.score > prev.score) {
      cells.set(k, {
        archetype: arch,
        paceBin: bin,
        friendSeed,
        worldSeed,
        score: report.score,
        completability: report.axes.completability,
        branching: report.axes.branchingHealth,
        ending: String(report.paths[0]?.steps ?? 0) ?? '?',
        archetypeFound: arch,
      });
    }
  }

  // Seed pool with N random pairs
  const seedPool: { f: string; w: string }[] = [];
  for (let i = 0; i < iterations; i++) {
    let f: string, w: string;
    if (i < Math.ceil(iterations * randomFraction) || seedPool.length === 0) {
      f = `f-${Math.floor(rng() * 1e9)}`;
      w = `w-${Math.floor(rng() * 1e9)}`;
    } else {
      // Pick a random elite, derive variations
      const elite = [...cells.values()][Math.floor(rng() * cells.size)];
      f = elite.friendSeed + '-mut' + Math.floor(rng() * 1e6);
      w = elite.worldSeed + '-mut' + Math.floor(rng() * 1e6);
    }
    consider(f, w);
    seedPool.push({ f, w });
  }

  // Build grid
  const grid: { archetype: Archetype; paceBin: number; cell: Cell | null }[] = [];
  for (const arch of ARCHETYPES) {
    for (let b = 0; b < paceBins; b++) {
      grid.push({ archetype: arch, paceBin: b, cell: cells.get(key(arch, b)) ?? null });
    }
  }

  let best: Cell | null = null;
  for (const c of cells.values()) {
    if (!best || c.score > best.score) best = c;
  }

  return {
    cells,
    best,
    grid,
    filled: cells.size,
    total: ARCHETYPES.length * paceBins,
    generations: iterations,
  };
}
