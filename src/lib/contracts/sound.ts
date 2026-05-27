/**
 * Sound stratum contract — Doctrine v2 Part VI.3 (Phase 3 partial).
 *
 * Pure / deterministic / IO-free predicates over a `SoundArtifact`.
 *
 * Broadcast LUFS targets (ITU-R BS.1770-4 family):
 *   - 'streaming' → -14 LUFS (Spotify, Apple Music, YouTube Music)
 *   - 'broadcast' → -23 LUFS (EBU R128, ATSC A/85)
 *   - 'film'      → -27 LUFS (cinema mix)
 *
 * Absent fields return `unimplemented` (engine has not opted in).
 */
import {
  defineStratum,
  type ContractPredicate,
  type PredicateResult,
  type StratumContract,
} from './types';

export interface SoundArtifact {
  /** Integrated loudness (LUFS). */
  readonly lufs?: number;
  /** True-peak (dBTP). */
  readonly truePeakDbtp?: number;
  /** Declared stems. */
  readonly stems?: ReadonlyArray<'vocals' | 'drums' | 'bass' | 'harmonic' | 'other'>;
  /** Sum of stem RMS values, used to verify they reconstruct the master. */
  readonly stemSumMasterDeltaDb?: number;
  /** BPM lineage if present (null = un-seeded). */
  readonly bpm?: number | null;
  /** Beat onsets in seconds. */
  readonly onsetsSec?: ReadonlyArray<number>;
  /** Sample rate in Hz. */
  readonly sampleRateHz?: number;
  /** Canonical sample rate the engine claims to produce. */
  readonly canonicalSampleRateHz?: number;
  /** Declared language (BCP-47) for voice content. */
  readonly language?: string;
  /** IPA phoneme sequence for voice content. */
  readonly ipa?: string;
  /** Loudness target band the artifact is mixed for. */
  readonly loudnessTarget?: 'streaming' | 'broadcast' | 'film';
}

const ABSENT: PredicateResult = {
  kind: 'unimplemented',
  reason: 'Engine has not declared this property on the SoundArtifact.',
};

const LUFS_TARGETS: Record<NonNullable<SoundArtifact['loudnessTarget']>, number> = {
  streaming: -14,
  broadcast: -23,
  film: -27,
};
const LUFS_TOLERANCE = 1; // ±1 LU
const TRUE_PEAK_MAX_DBTP = -1.0;
const STEM_SUM_TOLERANCE_DB = 0.5;
const BPM_BEAT_TOLERANCE_SEC = 0.02; // 20ms

// Pattern: language → permitted IPA character set (broad strokes; the
// goal is "obviously wrong" rejection, not full phonological audit).
const IPA_BASE = "[\u0250-\u02AF\u02B0-\u02FF\u0300-\u036F\u1D00-\u1D7Fa-zæøœɑɒəɛɪɔʊʌ\\s\\.\\-ˈˌːˑ]";

function pred(
  id: string,
  description: string,
  body: (a: SoundArtifact) => PredicateResult,
): ContractPredicate<SoundArtifact> {
  return { id, description, evaluate: body };
}

const lufsPredicate = pred(
  'sound.lufsTarget',
  'Integrated loudness within ±1 LU of declared broadcast target.',
  (a) => {
    if (a.lufs === undefined) return ABSENT;
    if (!a.loudnessTarget) {
      return {
        kind: 'unimplemented',
        reason: 'LUFS declared but loudnessTarget missing; cannot evaluate.',
      };
    }
    if (!Number.isFinite(a.lufs)) {
      return { kind: 'fail', reason: `lufs ${a.lufs} is not finite.` };
    }
    const target = LUFS_TARGETS[a.loudnessTarget];
    const delta = Math.abs(a.lufs - target);
    return delta <= LUFS_TOLERANCE
      ? { kind: 'pass' }
      : {
          kind: 'fail',
          reason: `lufs ${a.lufs.toFixed(2)} is ${delta.toFixed(2)}LU from ${a.loudnessTarget} target ${target}; tol ±${LUFS_TOLERANCE}.`,
        };
  },
);

const truePeakPredicate = pred(
  'sound.truePeak',
  'True-peak ≤ -1.0 dBTP.',
  (a) => {
    if (a.truePeakDbtp === undefined) return ABSENT;
    if (!Number.isFinite(a.truePeakDbtp)) {
      return { kind: 'fail', reason: `truePeakDbtp ${a.truePeakDbtp} is not finite.` };
    }
    return a.truePeakDbtp <= TRUE_PEAK_MAX_DBTP
      ? { kind: 'pass' }
      : {
          kind: 'fail',
          reason: `truePeakDbtp ${a.truePeakDbtp.toFixed(2)} exceeds ${TRUE_PEAK_MAX_DBTP} dBTP cap.`,
        };
  },
);

const stemSeparabilityPredicate = pred(
  'sound.stemSeparability',
  'Declared stems sum back to the master within ±0.5 dB.',
  (a) => {
    if (a.stems === undefined) return ABSENT;
    if (a.stems.length === 0) {
      return { kind: 'fail', reason: 'stems array is empty.' };
    }
    const validStems = new Set(['vocals', 'drums', 'bass', 'harmonic', 'other']);
    for (const s of a.stems) {
      if (!validStems.has(s)) {
        return { kind: 'fail', reason: `unknown stem kind: ${s}` };
      }
    }
    if (a.stemSumMasterDeltaDb === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'stems declared but stemSumMasterDeltaDb missing; cannot verify reconstruction.',
      };
    }
    if (!Number.isFinite(a.stemSumMasterDeltaDb)) {
      return { kind: 'fail', reason: `stemSumMasterDeltaDb ${a.stemSumMasterDeltaDb} is not finite.` };
    }
    return Math.abs(a.stemSumMasterDeltaDb) <= STEM_SUM_TOLERANCE_DB
      ? { kind: 'pass' }
      : {
          kind: 'fail',
          reason: `Stem sum deviates from master by ${a.stemSumMasterDeltaDb.toFixed(2)} dB (tol ±${STEM_SUM_TOLERANCE_DB}).`,
        };
  },
);

const bpmGridPredicate = pred(
  'sound.bpmGrid',
  'Onsets align to declared BPM grid within 20ms.',
  (a) => {
    if (a.bpm === undefined) return ABSENT;
    if (a.bpm === null) return { kind: 'pass' };
    if (!Number.isFinite(a.bpm) || a.bpm <= 0) {
      return { kind: 'fail', reason: `bpm ${a.bpm} is not a positive finite number.` };
    }
    if (a.onsetsSec === undefined) {
      return { kind: 'fail', reason: 'BPM declared but onsetsSec missing; cannot evaluate.' };
    }
    const beatPeriod = 60 / a.bpm;
    for (const onset of a.onsetsSec) {
      if (!Number.isFinite(onset) || onset < 0) {
        return { kind: 'fail', reason: `onset ${onset} invalid.` };
      }
      const phase = onset % beatPeriod;
      const distance = Math.min(phase, beatPeriod - phase);
      if (distance > BPM_BEAT_TOLERANCE_SEC) {
        return {
          kind: 'fail',
          reason: `onset ${onset.toFixed(4)}s is ${(distance * 1000).toFixed(1)}ms off ${a.bpm}bpm grid.`,
        };
      }
    }
    return { kind: 'pass' };
  },
);

const phonologyPredicate = pred(
  'sound.phonologicalCoherence',
  'Voice content matches declared language phonotactics (IPA character set sanity).',
  (a) => {
    if (a.language === undefined) return ABSENT;
    if (!a.ipa) {
      return { kind: 'fail', reason: 'language declared but ipa missing; cannot evaluate.' };
    }
    // BCP-47 superficial check.
    if (!/^[a-z]{2,3}(-[A-Z][a-zA-Z]{1,3})?(-[A-Z]{2})?$/.test(a.language)) {
      return { kind: 'fail', reason: `language tag "${a.language}" does not look like BCP-47.` };
    }
    const re = new RegExp(`^${IPA_BASE}+$`, 'u');
    if (!re.test(a.ipa)) {
      return {
        kind: 'fail',
        reason: 'ipa contains characters outside the broad IPA + diacritics set.',
      };
    }
    return { kind: 'pass' };
  },
);

const sampleRatePredicate = pred(
  'sound.sampleRateCanonical',
  'Sample rate matches declared canonical value.',
  (a) => {
    if (a.sampleRateHz === undefined) return ABSENT;
    if (!Number.isFinite(a.sampleRateHz) || a.sampleRateHz <= 0) {
      return { kind: 'fail', reason: `sampleRateHz ${a.sampleRateHz} invalid.` };
    }
    if (a.canonicalSampleRateHz === undefined) {
      return {
        kind: 'unimplemented',
        reason: 'sampleRateHz declared but canonicalSampleRateHz missing; cannot evaluate.',
      };
    }
    return a.sampleRateHz === a.canonicalSampleRateHz
      ? { kind: 'pass' }
      : {
          kind: 'fail',
          reason: `sampleRateHz ${a.sampleRateHz} ≠ canonical ${a.canonicalSampleRateHz}.`,
        };
  },
);

export const soundContract: StratumContract<SoundArtifact> = defineStratum<SoundArtifact>(
  'sound',
  '0.2.0',
  [
    lufsPredicate,
    truePeakPredicate,
    stemSeparabilityPredicate,
    bpmGridPredicate,
    phonologyPredicate,
    sampleRatePredicate,
  ],
);
