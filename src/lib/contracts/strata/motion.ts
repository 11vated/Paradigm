/**
 * Motion Stratum — Base Predicate Implementation (Engineering Grade)
 * 
 * Motion covers joints, loop closure, ground contact, trajectory stability, collision fidelity, energy conservation, velocity smoothness, acceleration consistency, momentum preservation, and timing precision.
 */

import { StratumPredicates, StratumScore, Stratum } from './types';
import { motionPredicate } from '../../kernel/quality/predicates';

export interface MotionArtifact {
  joints: number;
  loopClosure: number;
  groundContact: boolean;
  trajectoryStability: number;
  noCollisions: boolean;
  energyConservation: number;
  velocitySmoothness: number;
  accelerationConsistency: number;
  momentumPreservation: number;
  timingPrecision: number;
}

export class MotionStratum implements StratumPredicates<MotionArtifact> {
  readonly stratum: Stratum = 'Motion';

  evaluate(artifact: MotionArtifact): StratumScore {
    const result = motionPredicate(artifact);
    const score = result.passed ? result.score : Math.max(0.1, result.score);
    
    return {
      score,
      confidence: 0.87,
      subscores: this.parseDetails(result.details),
      issues: result.passed ? [] : ['Motion/animation quality below flagship threshold'],
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

  explain(artifact: MotionArtifact): string {
    return `Motion stratum: ${(this.evaluate(artifact).score * 100).toFixed(1)}% — ${motionPredicate(artifact).details}`;
  }
}

export const motionStratum = new MotionStratum();
