/**
 * Game Playability Oracle — deterministic playthrough + multi-axis scoring.
 *
 * Walks the scene graph from start with three strategies (greedy-low-karma,
 * greedy-high-karma, balanced) and scores the artifact on five axes:
 *
 *   completability  — does start reach an ending under each strategy?
 *   branchingHealth — choices per scene, dead-ends, loop ratio
 *   karmaArc        — does karma actually span its range across paths?
 *   paceVariance    — variance in scene text length (storytelling rhythm)
 *   endingDiversity — do different paths produce different endings?
 *
 * Pure function, no entropy, no I/O. Re-running on the same artifact
 * always produces the same FitnessReport bit-for-bit.
 */

import { createHash } from 'crypto';
import type { GameArtifact, GameScene, SceneChoice } from './types';

export interface FitnessReport {
  /** Overall 0..1 — geometric mean of the axes. */
  score: number;
  axes: {
    completability: number;
    branchingHealth: number;
    karmaArc: number;
    paceVariance: number;
    endingDiversity: number;
  };
  /** Per-strategy playthrough summaries. */
  paths: PathSummary[];
  /** Deterministic hash of this report (excluding nothing — fully reproducible). */
  hash: string;
}

export interface PathSummary {
  strategy: 'low' | 'high' | 'balanced';
  visited: string[];
  finalKarma: number;
  endingId: string | null;
  steps: number;
  reachedEnd: boolean;
}

const MAX_STEPS = 100;

function sceneIndex(art: GameArtifact): Map<string, GameScene> {
  const m = new Map<string, GameScene>();
  for (const s of art.scenes) m.set(s.id, s);
  return m;
}

function pickChoice(choices: readonly SceneChoice[], strategy: 'low' | 'high' | 'balanced'): SceneChoice {
  if (strategy === 'low') {
    // prefer most-negative karma
    return [...choices].sort((a, b) => (a.karma ?? 0) - (b.karma ?? 0))[0];
  }
  if (strategy === 'high') {
    return [...choices].sort((a, b) => (b.karma ?? 0) - (a.karma ?? 0))[0];
  }
  // balanced: deterministic mid-element
  return choices[Math.floor(choices.length / 2)];
}

function play(art: GameArtifact, strategy: 'low' | 'high' | 'balanced'): PathSummary {
  const idx = sceneIndex(art);
  const endingIds = new Set(art.endings.map(e => e.id));
  let current: GameScene | undefined = idx.get(art.startScene);
  let karma = 0;
  const visited: string[] = [];
  let endingId: string | null = null;

  for (let step = 0; step < MAX_STEPS && current; step++) {
    visited.push(current.id);
    if (endingIds.has(current.id)) { endingId = current.id; break; }
    if (!current.choices || current.choices.length === 0) break;
    const choice = pickChoice(current.choices, strategy);
    karma += choice.karma ?? 0;
    if (endingIds.has(choice.nextScene)) { endingId = choice.nextScene; visited.push(choice.nextScene); break; }
    current = idx.get(choice.nextScene);
  }
  return {
    strategy,
    visited,
    finalKarma: karma,
    endingId,
    steps: visited.length,
    reachedEnd: endingId !== null,
  };
}

function variance(xs: number[]): number {
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return xs.reduce((s, x) => s + (x - mean) * (x - mean), 0) / xs.length;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function evaluate(art: GameArtifact): FitnessReport {
  const paths = (['low', 'high', 'balanced'] as const).map(s => play(art, s));

  // completability — fraction of strategies that reached an ending
  const completability = paths.filter(p => p.reachedEnd).length / paths.length;

  // branchingHealth — fraction of non-ending scenes with >= 2 choices
  const endingIds = new Set(art.endings.map(e => e.id));
  const branching = art.scenes.filter(s => !endingIds.has(s.id));
  const withChoices = branching.filter(s => (s.choices?.length ?? 0) >= 2).length;
  const branchingHealth = branching.length === 0 ? 1 : withChoices / branching.length;

  // karmaArc — does final karma actually differ across strategies?
  const karmas = paths.map(p => p.finalKarma);
  const karmaRange = Math.max(...karmas) - Math.min(...karmas);
  const karmaArc = clamp01(karmaRange / 6); // 6 = strong spread

  // paceVariance — variance in scene body length, normalized
  const lens = art.scenes.map(s => (s.body ?? '').length);
  const pv = variance(lens);
  const paceVariance = clamp01(pv / 1500); // empirical normalizer

  // endingDiversity — distinct endings across strategies
  const distinct = new Set(paths.map(p => p.endingId).filter(Boolean)).size;
  const endingDiversity = paths.length === 0 ? 0 : distinct / paths.length;

  const axes = { completability, branchingHealth, karmaArc, paceVariance, endingDiversity };

  // geometric mean (gives heavy penalty for any near-zero axis)
  const product = Object.values(axes).reduce((a, b) => a * Math.max(b, 0.01), 1);
  const score = Math.pow(product, 1 / Object.values(axes).length);

  const partial = { score, axes, paths };
  const hash = createHash('sha256').update(JSON.stringify(partial)).digest('hex');
  return { ...partial, hash };
}
