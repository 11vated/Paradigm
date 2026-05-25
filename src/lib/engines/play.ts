/**
 * Engine: play — the crown jewel.
 *
 * Generates complete, expertly-designed, unique, playable, mod-friendly
 * games. Phase 0 cut: dispatches by kind to two existing game generators
 * that already produce real playable HTML5 output:
 *  - game      → single-screen playable game (rules + components + HTML)
 *  - fullgame  → multi-level packaged HTML5 game (levels + play loop)
 *
 * Subsequent phases compose:
 *  - play ⊗ form    → 3D characters as game protagonists
 *  - play ⊗ motion  → physics-driven mechanics
 *  - play ⊗ sound   → adaptive music + SFX
 *  - play ⊗ story   → narrative-driven campaigns
 *  - play ⊗ mind    → AI directors, NPC dialogue, theory-of-mind enemies
 *  - play ⊗ world   → procedurally generated open worlds
 *  - play ⊗ field   → quantum/EM puzzle mechanics (the Unseen genre)
 *  - play ⊗ matter  → chemistry-puzzle game where solutions are molecules
 *
 * That composition stack is the Multiverse Director from
 * `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part IV. This adapter is the first surface for it to land on.
 */
import * as fs from 'node:fs';
import type { Seed } from '../kernel/engines';
import type { Engine, EngineCapability } from './types';
import { generateGame } from '../kernel/generators/game';
import { generateFullGame } from '../kernel/generators/fullgame';

export type PlayKind = 'game' | 'game-strategy' | 'game-rpg' | 'game-puzzle' | 'game-card' | 'game-board' | 'fullgame';

export interface PlayRequest {
  kind: PlayKind;
  seed: Seed;
  outputPath: string;
}

export interface PlayArtifact {
  kind: PlayKind;
  primaryPath: string;
  auxPaths: string[];
  metrics: Record<string, number | string>;
  raw: unknown;
}

export const capability: EngineCapability = Object.freeze({
  id: 'play',
  name: 'Play Engine',
  version: '0.1.0',
  outputs: ['html', 'json'],
  composesWith: ['form', 'motion', 'sound', 'story', 'mind', 'world', 'field', 'matter'],
});

export async function generatePlay(req: PlayRequest): Promise<PlayArtifact> {
  ensureDir(req.outputPath);
  // Game-genre kinds inject a 'genre' gene before dispatching to game.ts
  const GENRE_MAP: Record<string, string | undefined> = {
    'game': undefined,
    'game-strategy': 'strategy',
    'game-rpg': 'rpg',
    'game-puzzle': 'puzzle',
    'game-card': 'card',
    'game-board': 'board',
  };
  if (req.kind in GENRE_MAP) {
    const genre = GENRE_MAP[req.kind];
    const seedForGame = genre
      ? { ...req.seed, genes: { ...(req.seed.genes ?? {}), genre: { value: genre, type: 'genre' } as any } }
      : req.seed;
    const out = await generateGame(seedForGame, req.outputPath);
    return {
      kind: req.kind,
      primaryPath: out.htmlPath,
      auxPaths: [out.jsonPath],
      metrics: { ruleCount: out.ruleCount, componentCount: out.componentCount },
      raw: out,
    };
  }
  switch (req.kind) {
    case 'fullgame': {
      const out = await generateFullGame(req.seed, req.outputPath);
      return {
        kind: 'fullgame',
        primaryPath: out.htmlPath,
        auxPaths: [],
        metrics: { levels: out.levels, fileSize: out.fileSize, loadTime: out.loadTime },
        raw: out,
      };
    }
    default: {
      throw new Error(`play: unsupported kind ${String(req.kind)}`);
    }
  }
}

function ensureDir(p: string): void {
  try { fs.mkdirSync(p, { recursive: true }); } catch { /* p may be a file path */ }
}

export const engine: Engine = Object.freeze({
  capability,
  generate: generatePlay as unknown as (req: unknown) => Promise<unknown>,
  validate(output: unknown) {
    const o = output as { primaryPath?: string } | null;
    if (!o || typeof o.primaryPath !== 'string' || o.primaryPath.length === 0) {
      return { ok: false as const, reason: 'play artifact missing primaryPath' };
    }
    if (!o.primaryPath.endsWith('.html')) {
      return { ok: false as const, reason: 'play artifact must be a playable HTML file' };
    }
    return { ok: true as const };
  },
});
