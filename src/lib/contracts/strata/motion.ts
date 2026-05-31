import { StratumPredicates, StratumScore, Stratum } from './types';
import { CharacterArtifact } from '../domains/character';

export class MotionStratum implements StratumPredicates<CharacterArtifact> {
  readonly stratum: Stratum = 'Motion';

  evaluate(artifact: CharacterArtifact): StratumScore {
    const motion = artifact.strataScores.Motion ?? 0.5;
    const score = motion * 0.9 + (artifact.animationLibrarySize > 1000 ? 0.1 : 0);
    return {
      score: Math.min(1, score),
      confidence: 0.87,
      issues: motion < 0.85 ? ['Motion/animation quality below flagship'] : [],
    };
  }

  explain(artifact: CharacterArtifact): string {
    return `Motion stratum: ${((artifact.strataScores.Motion ?? 0) * 100).toFixed(1)}% with ${artifact.animationLibrarySize} animation clips.`;
  }
}

export const motionStratum = new MotionStratum();
