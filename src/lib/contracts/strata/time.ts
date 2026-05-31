import { StratumPredicates, StratumScore, Stratum } from './types';
import { CharacterArtifact } from '../domains/character';

export class TimeStratum implements StratumPredicates<CharacterArtifact> {
  readonly stratum: Stratum = 'Time';

  evaluate(artifact: CharacterArtifact): StratumScore {
    const time = artifact.strataScores.Time ?? 0.5;
    return {
      score: time,
      confidence: 0.8,
      issues: time < 0.8 ? ['Timeline / transformation history coherence low'] : [],
    };
  }

  explain(artifact: CharacterArtifact): string {
    return `Time stratum: ${((artifact.strataScores.Time ?? 0) * 100).toFixed(1)}%. Transformation history visibility.`;
  }
}

export const timeStratum = new TimeStratum();
