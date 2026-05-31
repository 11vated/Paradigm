import { StratumPredicates, StratumScore, Stratum } from './types';
import { CharacterArtifact } from '../domains/character';

export class CultureStratum implements StratumPredicates<CharacterArtifact> {
  readonly stratum: Stratum = 'Culture';

  evaluate(artifact: CharacterArtifact): StratumScore {
    const culture = artifact.strataScores.Culture ?? 0.5;
    return {
      score: culture,
      confidence: 0.78,
      issues: culture < 0.75 ? ['Cultural identity / code integration insufficient'] : [],
    };
  }

  explain(artifact: CharacterArtifact): string {
    return `Culture stratum: ${((artifact.strataScores.Culture ?? 0) * 100).toFixed(1)}%.`;
  }
}

export const cultureStratum = new CultureStratum();
