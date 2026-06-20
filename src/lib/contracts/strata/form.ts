/**
 * Form Stratum — Base Predicate Implementation (Engineering Grade)
 * 
 * Form covers physical geometry, mesh, materials, proportions, and visual body.
 */

import { StratumPredicates, StratumScore, Stratum } from './types';
import { formPredicate } from '../../kernel/quality/predicates';

export interface FormArtifact {
  geometry: {
    vertices: number;
    faces: number;
    manifold: boolean;
    watertight: boolean;
    genus: number;
  };
  uvCoverage: number;
  materials: string[];
  boundingBox: { min: number[]; max: number[] };
}

export class FormStratum implements StratumPredicates<FormArtifact> {
  readonly stratum: Stratum = 'Form';

  evaluate(artifact: FormArtifact): StratumScore {
    const result = formPredicate(artifact);
    const score = result.passed ? result.score : Math.max(0.1, result.score);
    
    const subscores = this.parseDetails(result.details);
    
    return {
      score,
      confidence: 0.92,
      subscores,
      issues: result.passed ? [] : ['Form quality below flagship threshold'],
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

  explain(artifact: FormArtifact): string {
    return `Form stratum score: ${(this.evaluate(artifact).score * 100).toFixed(1)}%. ${formPredicate(artifact).details}`;
  }
}

export const formStratum = new FormStratum();
