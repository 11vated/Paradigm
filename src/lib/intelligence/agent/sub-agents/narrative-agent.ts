/**
 * NarrativeAgent — story structure, tone, pacing.
 *
 * Maps the 12-D vector into gene values for narrative seeds:
 *   narrative.structure  (three-act, kishōtenketsu, hero's-journey, vignette, mosaic)
 *   narrative.tone       (tragic, heroic, comedic, romantic, melancholic, satirical)
 *   narrative.pacing     (0–1: slow … breakneck)
 *   narrative.pov        (first, third-limited, third-omniscient)
 *   narrative.tension.curve (rising, falling, oscillating, plateau)
 *   narrative.themes     (selected from a canonical list, up to 3)
 */

import type { SubAgentInput, SubAgentOutput } from '../types';
import { BaseSubAgent, emit, intentVector, mapTo, projectAxis } from './base';

type STRUCTURE = 'three-act' | 'kishotenketsu' | 'heros-journey' | 'vignette' | 'mosaic';
type POV = 'first' | 'third-limited' | 'third-omniscient';
type CURVE = 'rising' | 'falling' | 'oscillating' | 'plateau';
type THEME =
  | 'love' | 'loss' | 'redemption' | 'power' | 'identity' | 'freedom' | 'duty'
  | 'justice' | 'revenge' | 'family' | 'survival' | 'discovery' | 'corruption'
  | 'sacrifice' | 'transformation' | 'belonging';

const POVS = ['first', 'third-limited', 'third-omniscient'] as const;
const CURVES = ['rising', 'falling', 'oscillating', 'plateau'] as const;
const THEMES = [
  'love', 'loss', 'redemption', 'power', 'identity', 'freedom', 'duty',
  'justice', 'revenge', 'family', 'survival', 'discovery', 'corruption',
  'sacrifice', 'transformation', 'belonging'
] as const;

export class NarrativeAgent extends BaseSubAgent {
  readonly id = 'narrative';
  readonly domain = 'narrative';

  shouldRun(intent: { domains: string[] }): boolean {
    return ['narrative', 'story', 'quest', 'character', 'game', 'all'].some((d) =>
      intent.domains.includes(d),
    );
  }

  async run(input: SubAgentInput): Promise<SubAgentOutput> {
    const vec = intentVector(input.intent.adjectives);
    const valence = projectAxis(vec, 'valence');
    const arousal = projectAxis(vec, 'arousal');
    const novelty = projectAxis(vec, 'novelty');
    const formality = projectAxis(vec, 'formality');
    const warmth = projectAxis(vec, 'warmth');
    const speed = projectAxis(vec, 'speed');

    const structure =
      novelty > 0.55 ? 'mosaic'
      : formality > 0.4 ? 'three-act'
      : warmth > 0.4 && valence > 0 ? 'heros-journey'
      : arousal < -0.2 ? 'vignette'
      : 'kishotenketsu';

    let tone: string;
    if (valence > 0.4 && arousal > 0.3) tone = 'heroic';
    else if (valence < -0.4 && arousal < 0.0) tone = 'tragic';
    else if (valence > 0.4 && warmth > 0.3) tone = 'romantic';
    else if (valence > 0.3 && arousal > 0.5) tone = 'comedic';
    else if (valence < -0.3) tone = 'melancholic';
    else tone = 'satirical';

    const pacing = Math.max(0.05, Math.min(1, mapTo((arousal + speed) / 2, 0.15, 0.95)));

    const pov: typeof POVS[number] =
      formality > 0.4 ? 'third-omniscient' :
      warmth > 0.2 ? 'first' :
      'third-limited';

    const curve: typeof CURVES[number] =
      arousal > 0.5 ? 'rising' :
      valence < -0.4 ? 'falling' :
      novelty > 0.5 ? 'oscillating' :
      'plateau';

    // Theme picker — score each theme by axis alignment, pick top 3
    const themeScores: Array<[string, number]> = THEMES.map((t) => [t, themeScore(t, vec)]);
    themeScores.sort((a, b) => b[1] - a[1]);
    const themes = themeScores.slice(0, 3).map(([t]) => t);

    return {
      produced: [
        emit(this.id, 'narrative.structure', structure, 0.7),
        emit(this.id, 'narrative.tone', tone, 0.8),
        emit(this.id, 'narrative.pacing', pacing, 0.8),
        emit(this.id, 'narrative.pov', pov, 0.6),
        emit(this.id, 'narrative.tension.curve', curve, 0.7),
        emit(this.id, 'narrative.themes', themes, 0.75),
      ],
    };
  }
}

function themeScore(theme: string, vec: number[]): number {
  const [v, a, d, w, b, h, /*den*/, /*sm*/, /*sp*/, n, f, o] = vec;
  const m: Record<string, number> = {
    love: w + v - h * 0.5,
    loss: -v - a * 0.5,
    redemption: -v * 0.5 + w + f * 0.3,
    power: d + h - w * 0.3,
    identity: n + Math.abs(v) * 0.3,
    freedom: a + n - f,
    duty: f + d * 0.5 + (1 - n),
    justice: f + d * 0.5,
    revenge: -v + a + d * 0.5,
    family: w + o + v * 0.3,
    survival: -v + h + a * 0.3,
    discovery: n + a * 0.5 + b * 0.3,
    corruption: -v + d - f,
    sacrifice: -v + w + f * 0.3,
    transformation: n + Math.abs(a) * 0.3,
    belonging: w + o + (1 - n) * 0.3,
  };
  return m[theme] ?? 0;
}
