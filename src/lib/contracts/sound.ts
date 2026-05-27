/**
 * Sound stratum contract — Doctrine v2 Part VI.3.
 *
 * - LUFS normalization to canonical broadcast targets.
 * - True-peak ≤ -1.0 dBTP.
 * - Stem separability declared.
 * - Timing grid aligned to BPM lineage.
 * - Phonological coherence for voice (language declared; IPA validated).
 */
import { defineStratum, todoPredicate, type StratumContract } from './types';

export interface SoundArtifact {
  /** Integrated loudness (LUFS). */
  readonly lufs?: number;
  /** True-peak (dBTP). */
  readonly truePeakDbtp?: number;
  /** Declared stems. */
  readonly stems?: ReadonlyArray<'vocals' | 'drums' | 'bass' | 'harmonic' | 'other'>;
  /** BPM lineage if present. */
  readonly bpm?: number | null;
  /** Sample rate in Hz. */
  readonly sampleRateHz?: number;
  /** Declared language (BCP-47) for voice content. */
  readonly language?: string;
  /** IPA phoneme sequence for voice content. */
  readonly ipa?: string;
}

export const soundContract: StratumContract<SoundArtifact> = defineStratum<SoundArtifact>(
  'sound',
  '0.1.0',
  [
    todoPredicate('sound.lufsTarget', 'Integrated loudness is within ±1 LU of declared broadcast target.'),
    todoPredicate('sound.truePeak', 'True-peak ≤ -1.0 dBTP.'),
    todoPredicate('sound.stemSeparability', 'Declared stems sum back to the master within numerical tolerance.'),
    todoPredicate('sound.bpmGrid', 'Onsets align to declared BPM grid.'),
    todoPredicate('sound.phonologicalCoherence', 'Voice content matches declared language phonotactics.'),
    todoPredicate('sound.sampleRateCanonical', 'Sample rate matches declared canonical value.'),
  ],
);
