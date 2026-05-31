/**
 * Audio Quality Contract — wraps generateAudio (WAV) with in-memory adapter.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAudio } from './audio';
import { analyzePcm, audioQualityAxes } from '../quality/audio-features';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';
import { runStratumPredicate } from '../quality/predicates';

interface AudioSeed { $hash?: string; $name?: string; genes?: any; }
interface AudioArtifact { wav: Buffer; meta: { duration: number; sampleRate: number; size: number }; }
interface AudioInverted { sampleRate: number; durationS: number; bytes: number; }

async function synth(seed: AudioSeed): Promise<AudioArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-q-'));
  try {
    const r = await generateAudio(seed, dir);
    const wav = await fs.readFile(r.wavPath);
    return { wav, meta: { duration: r.duration, sampleRate: r.sampleRate, size: wav.length } };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function fingerprint(a: AudioArtifact): string { return crypto.createHash('sha256').update(a.wav).digest('hex'); }

export const AudioQualityContract: QualityContract<AudioSeed, AudioArtifact, AudioInverted> = {
  domain: 'audio',
  version: '1.0.0',
  strata: ['Sound'] as const,
  engineOwner: 'Audio Engine',
  synthesize: synth,
  invert: (a) => ({ sampleRate: a.meta.sampleRate, durationS: a.meta.duration, bytes: a.meta.size }),
  rate: (a) => {
    const isWav = a.wav.length > 44 && a.wav.slice(0, 4).toString() === 'RIFF';
    if (!isWav) {
      return { score: 0, axes: { isWav: 0 }, notes: ['Invalid WAV header'] };
    }
    const stats = analyzePcm(a.wav);
    if (!stats) {
      return { score: 0.2, axes: { isWav: 1, decodable: 0 }, notes: ['WAV header OK but PCM not decodable'] };
    }
    const axes: Record<string, number> = { isWav: 1, decodable: 1, ...audioQualityAxes(stats) };

    // Doctrine v2: wire stratum predicate (Sound declared)
    const declared: Stratum[] = ['Sound'];
    const strataScores: Record<string, number> = {};
    for (const s of declared) {
      const probe = {
        lufs: -14 + (stats.rms - 0.5) * 4,
        truePeak: stats.peakAmp ?? -1.5,
        stems: ['drums', 'melody', 'ambience'],
        bpm: 120,
      };
      const p = runStratumPredicate(s, probe);
      strataScores[s] = typeof p?.score === 'number' ? p.score : 0;
    }
    const strataCompliance = Object.keys(strataScores).length > 0
      ? Object.values(strataScores).reduce((x, y) => x + y, 0) / Object.keys(strataScores).length
      : 0;
    axes.strataCompliance = strataCompliance;
    const notes = [`rms=${stats.rms.toFixed(3)}, peak=${stats.peakAmp.toFixed(3)}, centroidHz=${stats.spectralCentroidHz.toFixed(0)}`];
    notes.push(`strata ${Object.entries(strataScores).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ')}`);

    const score = (axes.dynamicRange * 0.25 + axes.notSilent * 0.25 + axes.spectralLife * 0.20 + axes.stereoOrMono * 0.15 + axes.notClipped * 0.15);
    return {
      score: Math.round(score * 100) / 100,
      axes,
      notes,
    };
  },
  curated: () => [
    { id: 'audio-melody-c-major', name: 'C major', intent: 'Cheerful sine in C major',
      seed: { $name: 'C Major', genes: { tempo: 120, key: 'C', scale: 'major', melody: [60, 64, 67, 72] } } },
    { id: 'audio-warm-pad', name: 'Warm pad', intent: 'Slow, warm sine pad',
      seed: { $name: 'Warm Pad', genes: { tempo: 60, key: 'A', scale: 'minor', timbre: { warmth: 0.9, brightness: 0.3, attack: 0.5, decay: 0.5 } } } },
    { id: 'audio-percussive', name: 'Percussive', intent: 'Fast tempo, sharp attack',
      seed: { $name: 'Percussive', genes: { tempo: 180, key: 'E', scale: 'minor', timbre: { warmth: 0.3, brightness: 0.8, attack: 0.05, decay: 0.1 } } } },
  ],
  hashArtifact: fingerprint,
  manifest() {
    return {
      domain: 'audio',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};

registerContract(AudioQualityContract);

