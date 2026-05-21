/**
 * MechanicsAgent — game mechanics, balance, difficulty.
 *
 * Maps the 12-D vector to game-design gene values:
 *   mechanics.coreLoop          (combat, exploration, puzzle, social, builder, rhythm)
 *   mechanics.difficulty        (0–1, baseline challenge)
 *   mechanics.difficultyCurve   (linear, exponential, sawtooth, plateau, sigmoid)
 *   mechanics.permadeath        (boolean)
 *   mechanics.coop              (boolean)
 *   mechanics.timeLimit         (none | hard | soft)
 *   mechanics.resourceScarcity  (0–1)
 *   mechanics.agency            (0–1, how much choice the player has)
 */

import type { SubAgentInput, SubAgentOutput } from '../types';
import { BaseSubAgent, emit, intentVector, mapTo, projectAxis } from './base';

const LOOPS = ['combat', 'exploration', 'puzzle', 'social', 'builder', 'rhythm'] as const;
const CURVES = ['linear', 'exponential', 'sawtooth', 'plateau', 'sigmoid'] as const;

export class MechanicsAgent extends BaseSubAgent {
  readonly id = 'mechanics';
  readonly domain = 'game';

  shouldRun(intent: { domains: string[] }): boolean {
    return ['game', 'mechanics', 'gameplay', 'level', 'quest', 'all'].some((d) =>
      intent.domains.includes(d),
    );
  }

  async run(input: SubAgentInput): Promise<SubAgentOutput> {
    const vec = intentVector(input.intent.adjectives);
    const valence = projectAxis(vec, 'valence');
    const arousal = projectAxis(vec, 'arousal');
    const dominance = projectAxis(vec, 'dominance');
    const novelty = projectAxis(vec, 'novelty');
    const hardness = projectAxis(vec, 'hardness');
    const density = projectAxis(vec, 'density');
    const speed = projectAxis(vec, 'speed');
    const formality = projectAxis(vec, 'formality');
    const warmth = projectAxis(vec, 'warmth');

    // Core loop selection — score each, pick top
    const loopScores: Record<typeof LOOPS[number], number> = {
      combat:      arousal + hardness + dominance,
      exploration: novelty + (1 - arousal) * 0.5 + 0.3,
      puzzle:      formality + (1 - arousal) + novelty * 0.3,
      social:      warmth + (1 - hardness) + valence,
      builder:     formality + (1 - speed) + (1 - hardness),
      rhythm:      speed + arousal + valence * 0.3,
    };
    const coreLoop = (Object.entries(loopScores).sort((a, b) => b[1] - a[1])[0][0]) as typeof LOOPS[number];

    const difficulty = Math.max(0.1, Math.min(0.95, mapTo((hardness + arousal) / 2, 0.2, 0.9)));

    const difficultyCurve =
      arousal > 0.6 ? 'exponential' :
      novelty > 0.5 ? 'sawtooth' :
      density > 0.5 ? 'sigmoid' :
      hardness < -0.2 ? 'plateau' :
      'linear';

    const permadeath = hardness > 0.5 && valence < 0.0;
    const coop = warmth > 0.3 && valence > 0.2;

    const timeLimit: 'none' | 'soft' | 'hard' =
      speed > 0.6 ? 'hard' :
      speed > 0.2 ? 'soft' :
      'none';

    const resourceScarcity = Math.max(0, Math.min(1, mapTo((hardness - warmth) / 2 + 0.5, 0.1, 0.85)));

    const agency = Math.max(0, Math.min(1, mapTo((novelty + dominance) / 2, 0.2, 0.95)));

    return {
      produced: [
        emit(this.id, 'mechanics.coreLoop', coreLoop, 0.8),
        emit(this.id, 'mechanics.difficulty', difficulty, 0.85),
        emit(this.id, 'mechanics.difficultyCurve', difficultyCurve, 0.7),
        emit(this.id, 'mechanics.permadeath', permadeath ? 1 : 0, 0.7),
        emit(this.id, 'mechanics.coop', coop ? 1 : 0, 0.7),
        emit(this.id, 'mechanics.timeLimit', timeLimit, 0.75),
        emit(this.id, 'mechanics.resourceScarcity', resourceScarcity, 0.75),
        emit(this.id, 'mechanics.agency', agency, 0.8),
      ],
    };
  }
}
