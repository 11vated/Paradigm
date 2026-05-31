import { StratumPredicates, StratumScore, Stratum } from './types';
import { CharacterArtifact } from '../domains/character';

export class SoundStratum implements StratumPredicates<CharacterArtifact> {
  readonly stratum: Stratum = 'Sound';

  evaluate(artifact: CharacterArtifact): StratumScore {
    const sound = artifact.strataScores.Sound ?? 0.5;
    const voiceDuration = artifact.voiceSampleDuration || 0;
    const score = sound * 0.7 + Math.min(voiceDuration / 5, 0.3);
    return {
      score: Math.min(1, score),
      confidence: 0.85,
      issues: sound < 0.8 ? ['Voice / audio quality insufficient'] : [],
    };
  }

  explain(artifact: CharacterArtifact): string {
    return `Sound stratum: ${((artifact.strataScores.Sound ?? 0) * 100).toFixed(1)}% — ${artifact.voiceSampleDuration}s voice samples.`;
  }
}

export const soundStratum = new SoundStratum();
