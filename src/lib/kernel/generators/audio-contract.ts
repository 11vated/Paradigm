/**
 * Audio Quality Contract — wraps generateAudio (WAV) with in-memory adapter.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAudio } from './audio';
import { registerContract, type QualityContract } from '../quality-contract';

interface AudioSeed { $hash?: string; $name?: string; genes?: any; }
interface AudioArtifact { wav: Buffer; meta: { duration: number; sampleRate: number; size: number }; }
interface AudioInverted { sampleRate: number; durationS: number; bytes: number; }

async function synth(seed: AudioSeed): Promise<AudioArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'audio-q-'));
  try {
    const r = await generateAudio(seed as any, path.join(dir, "audio.wav"));
    const wav = await fs.readFile(r.filePath);
    return { wav, meta: { duration: r.duration, sampleRate: r.sampleRate, size: wav.length } };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function fingerprint(a: AudioArtifact): string { return crypto.createHash('sha256').update(a.wav).digest('hex'); }

export const AudioQualityContract: QualityContract<AudioSeed, AudioArtifact, AudioInverted> = {
  domain: 'audio',
  version: '1.0.0',
  synthesize: synth,
  invert: (a) => ({ sampleRate: a.meta.sampleRate, durationS: a.meta.duration, bytes: a.meta.size }),
  rate: (a) => {
    const ok = a.wav.length > 44 && a.wav.slice(0, 4).toString() === 'RIFF';
    return {
      score: ok ? 0.9 : 0,
      axes: { isWav: ok ? 1 : 0, hasContent: a.wav.length > 1000 ? 1 : 0 },
      notes: [ok ? 'Valid WAV header' : 'Invalid WAV'],
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
};

registerContract(AudioQualityContract as any);
