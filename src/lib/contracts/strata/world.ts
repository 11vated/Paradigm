import { StratumPredicates, StratumScore, Stratum } from './types';
import { CharacterArtifact } from '../domains/character';

export class WorldStratum implements StratumPredicates<CharacterArtifact> {
  readonly stratum: Stratum = 'World';

  evaluate(artifact: CharacterArtifact): StratumScore {
    const world = artifact.strataScores.World ?? 0.5;
    return {
      score: world,
      confidence: 0.8,
      issues: world < 0.7 ? ['World integration / environmental coherence low'] : [],
    };
  }

  explain(artifact: CharacterArtifact): string {
    return `World stratum: ${((artifact.strataScores.World ?? 0) * 100).toFixed(1)}%.`;
  }
}

export const worldStratum = new WorldStratum();
