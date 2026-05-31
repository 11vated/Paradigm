/**
 * Mind Stratum — Base Predicate Implementation (Engineering Grade)
 * 
 * Covers intelligence, agency, personality, decision making, and behavior.
 */

import { StratumPredicates, StratumScore, Stratum } from './types';
import { CharacterArtifact } from '../domains/character';

export class MindStratum implements StratumPredicates<CharacterArtifact> {
  readonly stratum: Stratum = 'Mind';

  evaluate(artifact: CharacterArtifact): StratumScore {
    const mindScore = artifact.strataScores.Mind ?? 0.5;
    const fieldScore = artifact.strataScores.Field ?? 0.5;

    // Mind is heavily weighted toward personality coherence and decision quality
    const score = (mindScore * 0.65) + (fieldScore * 0.35);

    return {
      score: Math.max(0, Math.min(1, score)),
      confidence: 0.88,
      subscores: { personality: mindScore, fieldInfluence: fieldScore },
      issues: mindScore < 0.9 ? ['Mind coherence below flagship threshold'] : [],
    };
  }

  explain(artifact: CharacterArtifact): string {
    return `Mind stratum score: ${((artifact.strataScores.Mind ?? 0) * 100).toFixed(1)}%. ` +
           `Strong personality + Field integration required for hero characters.`;
  }
}

export const mindStratum = new MindStratum();
