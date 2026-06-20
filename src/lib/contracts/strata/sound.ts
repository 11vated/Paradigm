/**
 * Sound Stratum — Base Predicate Implementation (Engineering Grade)
 * 
 * Sound covers audio quality, stems, LUFS, spectral balance, and rhythm.
 */

import { StratumPredicates, StratumScore, Stratum } from './types';
import { soundPredicate } from '../../kernel/quality/predicates';

export interface SoundArtifact {
  lufs: number;
  truePeak: number;
  stems: string[];
  bpm: number;
  language?: string;
  spectralBalance: number;
  dynamicRange: number;
  rhythmClarity: number;
  timbralRichness: number;
  harmonyConsonance: number;
}

export class SoundStratum implements StratumPredicates<SoundArtifact> {
  readonly stratum: Stratum = 'Sound';

  evaluate(artifact: SoundArtifact): StratumScore {
    const result = soundPredicate(artifact);
    const score = result.passed ? result.score : Math.max(0.1, result.score);
    
    return {
      score,
      confidence: 0.85,
      subscores: this.parseDetails(result.details),
      issues: result.passed ? [] : ['Audio quality below flagship threshold'],
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

  explain(artifact: SoundArtifact): string {
    return `Sound stratum: ${(this.evaluate(artifact).score * 100).toFixed(1)}% — ${soundPredicate(artifact).details}`;
  }
}

export const soundStratum = new SoundStratum();
