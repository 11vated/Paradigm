/**
 * World Stratum — Base Predicate Implementation (Engineering Grade)
 * 
 * World covers biomes, locations, factions, navigation, and world coherence.
 */

import { StratumPredicates, StratumScore, Stratum } from './types';
import { worldPredicate } from '../../kernel/quality/predicates';

export interface WorldArtifact {
  biomes: string[];
  locations: any[];
  factions: string[];
  navmeshContinuous: boolean;
  ecologicalCoherence: number;
  agentDensity: number;
  spatialConnectivity: number;
  temporalCoherence: number;
  resourceBalance: number;
  conflictRichness: number;
}

export class WorldStratum implements StratumPredicates<WorldArtifact> {
  readonly stratum: Stratum = 'World';

  evaluate(artifact: WorldArtifact): StratumScore {
    const result = worldPredicate(artifact);
    const score = result.passed ? result.score : Math.max(0.1, result.score);
    
    return {
      score,
      confidence: 0.9,
      subscores: this.parseDetails(result.details),
      issues: result.passed ? [] : ['World coherence below flagship threshold'],
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

  explain(artifact: WorldArtifact): string {
    return `World stratum: ${(this.evaluate(artifact).score * 100).toFixed(1)}% — ${worldPredicate(artifact).details}`;
  }
}

export const worldStratum = new WorldStratum();
