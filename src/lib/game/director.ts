/**
 * Director Agent — natural-language → game spec.
 *
 * Translates a freeform brief into structured targets that MAP-Elites
 * (or evolveGames) can match against. Pure heuristic — keyword-based,
 * deterministic, no LLM call. The LLM-augmented variant is future work.
 */
import { createHash } from 'crypto';

export type Archetype = 'heroic' | 'mystery' | 'survival' | 'discovery' | 'political' | 'redemption';

export interface DirectorSpec {
  /** Preferred archetype, or null = let evolution decide. */
  archetype: Archetype | null;
  /** Target pace, 0..1 (0 = contemplative, 1 = frenetic). */
  pace: number;
  /** Target tone, 0..1 (0 = light, 1 = dark). */
  mood: number;
  /** Difficulty, 0..1 (0 = forgiving, 1 = punishing). */
  difficulty: number;
  /** Soft minimum branching health, 0..1. */
  minBranching: number;
  /** Soft minimum completability, 0..1. */
  minCompletability: number;
  /** A deterministic seed phrase derived from the brief. */
  seed: string;
  /** Human-readable explanation of what was matched. */
  rationale: string[];
}

const ARCHETYPE_KEYWORDS: Record<Archetype, string[]> = {
  heroic:     ['hero', 'champion', 'epic', 'glorious', 'valiant', 'rescue', 'save the'],
  mystery:    ['mystery', 'detective', 'noir', 'puzzle', 'investigate', 'whodunit', 'clue', 'cipher'],
  survival:   ['survival', 'wilderness', 'starve', 'hunger', 'cold', 'apocalypse', 'wasteland', 'storm'],
  discovery:  ['discovery', 'explore', 'wonder', 'map', 'uncharted', 'find', 'expedition', 'voyage'],
  political:  ['political', 'intrigue', 'court', 'spy', 'betrayal', 'conspiracy', 'faction', 'diplomat'],
  redemption: ['redemption', 'forgiveness', 'atone', 'guilt', 'second chance', 'broken', 'mend'],
};

const PACE_LOW  = ['calm', 'slow', 'contemplative', 'meditative', 'gentle', 'quiet', 'patient'];
const PACE_HIGH = ['fast', 'frenetic', 'intense', 'breakneck', 'urgent', 'action', 'kinetic'];
const MOOD_LIGHT = ['light', 'hopeful', 'bright', 'cheerful', 'warm', 'sunny', 'cozy'];
const MOOD_DARK  = ['dark', 'grim', 'bleak', 'sombre', 'tragic', 'haunting', 'shadow'];
const DIFF_EASY  = ['easy', 'forgiving', 'casual', 'gentle', 'accessible'];
const DIFF_HARD  = ['hard', 'punishing', 'brutal', 'difficult', 'unforgiving', 'soulslike'];

function any(text: string, keywords: string[]): boolean {
  const t = text.toLowerCase();
  return keywords.some(k => t.includes(k));
}

/**
 * Translate a natural-language brief into a DirectorSpec.
 * Pure, deterministic, no I/O.
 */
export function directorBrief(brief: string): DirectorSpec {
  const t = brief.toLowerCase();
  const rationale: string[] = [];

  // Archetype
  let archetype: Archetype | null = null;
  let bestScore = 0;
  for (const [arch, keywords] of Object.entries(ARCHETYPE_KEYWORDS) as [Archetype, string[]][]) {
    const score = keywords.filter(k => t.includes(k)).length;
    if (score > bestScore) { bestScore = score; archetype = arch; }
  }
  if (archetype) rationale.push(`archetype="${archetype}" (matched ${bestScore} keyword(s))`);

  // Pace
  let pace = 0.5;
  if (any(t, PACE_LOW))  { pace = 0.2; rationale.push('pace=low (calm/contemplative)'); }
  if (any(t, PACE_HIGH)) { pace = 0.8; rationale.push('pace=high (frenetic/intense)'); }

  // Mood
  let mood = 0.5;
  if (any(t, MOOD_LIGHT)) { mood = 0.25; rationale.push('mood=light'); }
  if (any(t, MOOD_DARK))  { mood = 0.85; rationale.push('mood=dark'); }

  // Difficulty
  let difficulty = 0.5;
  if (any(t, DIFF_EASY)) { difficulty = 0.25; rationale.push('difficulty=easy'); }
  if (any(t, DIFF_HARD)) { difficulty = 0.85; rationale.push('difficulty=hard'); }

  // Structural soft floors
  const minBranching      = any(t, ['linear', 'on rails']) ? 0.1 : 0.4;
  const minCompletability = any(t, ['impossible', 'soulslike']) ? 0.3 : 0.6;

  const seed = createHash('sha256').update('director:' + brief.trim().toLowerCase()).digest('hex').slice(0, 16);

  if (rationale.length === 0) rationale.push('no keywords matched — using defaults');

  return { archetype, pace, mood, difficulty, minBranching, minCompletability, seed, rationale };
}

import { mapElitesGames, type Cell as MeCell } from './map-elites';

/**
 * Run MAP-Elites with the brief, then pick the cell that best matches the spec.
 * Falls back to overall best if no cell matches archetype.
 */
export function directedSearch(brief: string, opts?: { iterations?: number; paceBins?: number }): {
  spec: DirectorSpec;
  chosen: MeCell | null;
  alternatives: MeCell[];
} {
  const spec = directorBrief(brief);
  const r = mapElitesGames({
    initialSeed: spec.seed,
    paceBins: opts?.paceBins ?? 4,
    iterations: opts?.iterations ?? 40,
  });
  const candidates = [...r.cells.values()].filter(c => {
    if (spec.archetype && c.archetype !== spec.archetype) return false;
    if (c.completability < spec.minCompletability - 0.15) return false;
    if (c.branching     < spec.minBranching     - 0.15) return false;
    return true;
  });
  const sorted = candidates.sort((a, b) => b.score - a.score);
  const chosen = sorted[0] ?? r.best;
  return { spec, chosen, alternatives: sorted.slice(1, 5) };
}
