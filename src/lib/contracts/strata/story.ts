import { StratumPredicates, StratumScore, Stratum } from './types';
import { CharacterArtifact } from '../domains/character';

export class StoryStratum implements StratumPredicates<CharacterArtifact> {
  readonly stratum: Stratum = 'Story';

  evaluate(artifact: CharacterArtifact): StratumScore {
    const story = artifact.strataScores.Story ?? 0.5;
    return {
      score: story,
      confidence: 0.82,
      issues: story < 0.85 ? ['Narrative / character arc coherence below target'] : [],
    };
  }

  explain(artifact: CharacterArtifact): string {
    return `Story stratum: ${((artifact.strataScores.Story ?? 0) * 100).toFixed(1)}%. Transformation-aware narrative required.`;
  }
}

export const storyStratum = new StoryStratum();
