/**
 * Story Stratum — Base Predicate Implementation (Engineering Grade)
 * 
 * Story covers narrative beats, causality, voice consistency, character growth, and thematic coherence.
 */

import { StratumPredicates, StratumScore, Stratum } from './types';
import { storyPredicate } from '../../kernel/quality/predicates';

export interface StoryArtifact {
  beats: any[];
  causalityAcyclic: boolean;
  voiceConsistency: number;
  characterGrowth: number;
  thematicCoherence: number;
  tensionArc: number;
  resolutionQuality: number;
  subplotIntegration: number;
}

export class StoryStratum implements StratumPredicates<StoryArtifact> {
  readonly stratum: Stratum = 'Story';

  evaluate(artifact: StoryArtifact): StratumScore {
    const result = storyPredicate(artifact);
    const score = result.passed ? result.score : Math.max(0.1, result.score);
    
    return {
      score,
      confidence: 0.87,
      subscores: this.parseDetails(result.details),
      issues: result.passed ? [] : ['Story/narrative quality below flagship threshold'],
    };
  }

  private parseDetails(details: string): Record<string, number> {
    const result: Record<string, number> = {};
    details.split(', ').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        const num = parseFloat(value);
        if (!isNaN(num)) result[key.trim()] = num;
      }
    });
    return result;
  }

  explain(artifact: StoryArtifact): string {
    return `Story stratum: ${(this.evaluate(artifact).score * 100).toFixed(1)}% — ${storyPredicate(artifact).details}`;
  }
}

export const storyStratum = new StoryStratum();
