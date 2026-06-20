/**
 * Mind Stratum — Base Predicate Implementation (Engineering Grade)
 * 
 * Mind covers behaviors, goals, decision depth, adaptability, learning, and memory.
 */

import { StratumPredicates, StratumScore, Stratum } from './types';
import { mindPredicate } from '../../kernel/quality/predicates';

export interface MindArtifact {
  behaviors: string[];
  goals: string[];
  noUnreachableStates: boolean;
  decisionDepth: number;
  adaptability: number;
  learningCapacity: number;
  goalCoherence: number;
  memoryUtilization: number;
}

export class MindStratum implements StratumPredicates<MindArtifact> {
  readonly stratum: Stratum = 'Mind';

  evaluate(artifact: MindArtifact): StratumScore {
    const result = mindPredicate(artifact);
    const score = result.passed ? result.score : Math.max(0.1, result.score);
    
    return {
      score,
      confidence: 0.88,
      subscores: this.parseDetails(result.details),
      issues: result.passed ? [] : ['Mind/behavior quality below flagship threshold'],
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

  explain(artifact: MindArtifact): string {
    return `Mind stratum: ${(this.evaluate(artifact).score * 100).toFixed(1)}% — ${mindPredicate(artifact).details}`;
  }
}

export const mindStratum = new MindStratum();
