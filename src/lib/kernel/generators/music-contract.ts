/**
 * Music Quality Contract — wraps generateMusicV2 with an in-memory adapter.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMusicV2 } from './music-v2';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport } from '../quality-contract';

interface MusicSeed { $hash: string; genes?: Record<string, { value: any }>; }
interface MusicArtifact {
  wavBuffer: Buffer;
  meta: { duration: number; tempo: number; key: string; sampleRate: number };
}

async function synthesize(seed: MusicSeed): Promise<MusicArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'music-contract-'));
  const out = path.join(dir, 'music');
  try {
    const r: any = await generateMusicV2(seed as any, out);
    const wavPath = r.filePath || (r.wavPath) || path.join(dir, 'music.wav');
    const wavBuffer = await fs.readFile(wavPath);
    return {
      wavBuffer,
      meta: {
        duration: r.duration ?? 0,
        tempo: r.tempo ?? 120,
        key: r.key ?? 'C major',
        sampleRate: r.sampleRate ?? 44100,
      },
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

interface MusicInverted { wavBytes: number; sampleRate: number; tempo: number; key: string; durationSec: number; }

function invert(a: MusicArtifact): MusicInverted {
  return {
    wavBytes: a.wavBuffer.length,
    sampleRate: a.meta.sampleRate,
    tempo: a.meta.tempo,
    key: a.meta.key,
    durationSec: a.meta.duration,
  };
}

import { analyzePcm, audioQualityAxes } from '../quality/audio-features';

function rate(a: MusicArtifact): QualityReport {
  const axes: Record<string, number> = {};
  const riff = a.wavBuffer.slice(0, 4).toString('ascii');
  const wave = a.wavBuffer.slice(8, 12).toString('ascii');
  axes.wavSignature = (riff === 'RIFF' && wave === 'WAVE') ? 1 : 0;
  axes.wavSize = a.wavBuffer.length > 44 ? 1 : 0;
  axes.tempoInRange = a.meta.tempo >= 40 && a.meta.tempo <= 220 ? 1 : 0;
  axes.sampleRateValid = [22050, 44100, 48000].includes(a.meta.sampleRate) ? 1 : 0;
  axes.durationPositive = a.meta.duration > 0 ? 1 : 0;
  axes.keyPresent = typeof a.meta.key === 'string' && a.meta.key.length > 0 ? 1 : 0;
  // Content-aware: actually decode the PCM and inspect.
  const stats = analyzePcm(a.wavBuffer);
  const notes = [`music ${a.meta.tempo}bpm ${a.meta.key} ${a.meta.duration.toFixed(1)}s wav=${a.wavBuffer.length}B`];
  if (stats) {
    Object.assign(axes, audioQualityAxes(stats));
    notes.push(`rms=${stats.rms.toFixed(3)} crest=${stats.crestFactor.toFixed(2)} centroidHz=${stats.spectralCentroidHz.toFixed(0)} silence=${(stats.silenceRatio*100).toFixed(1)}%`);
  } else {
    axes.pcmAnalyzable = 0;
  }
  const score = Object.values(axes).reduce((s, v) => s + v, 0) / Object.values(axes).length;
  return { score, axes, notes };
}

const CURATED: readonly { id: string; name: string; seed: MusicSeed; intent: string; tags: readonly string[] }[] = [
  { id: 'music-ambient-drift', name: 'Ambient Drift', intent: 'Curated music starter', tags: ['ambient', 'pad'], seed: { $hash: 'music-ambient-drift-v1', genes: { genre: { value: 'ambient' }, duration: { value: 30 } } } },
  { id: 'music-classical-sonata-fragment', name: 'Classical Sonata Fragment', intent: 'Curated music starter', tags: ['classical', 'piano'], seed: { $hash: 'music-classical-sonata-v1', genes: { genre: { value: 'classical' }, duration: { value: 20 } } } },
  { id: 'music-jazz-walking-bass', name: 'Jazz Walking Bass', intent: 'Curated music starter', tags: ['jazz', 'bass'], seed: { $hash: 'music-jazz-walking-v1', genes: { genre: { value: 'jazz' }, duration: { value: 25 } } } },
  { id: 'music-electronic-pulse', name: 'Electronic Pulse', intent: 'Curated music starter', tags: ['electronic', 'rhythmic'], seed: { $hash: 'music-electro-pulse-v1', genes: { genre: { value: 'electronic' }, duration: { value: 20 } } } },
];

function hashArtifact(a: MusicArtifact): string {
  return crypto.createHash('sha256').update(a.wavBuffer).update(JSON.stringify(a.meta)).digest('hex');
}

export const MusicQualityContract: QualityContract<MusicSeed, MusicArtifact, MusicInverted> = {
  domain: 'music',
  version: '2.0.0',
  synthesize,
  invert,
  rate,
  curated: () => CURATED,
  hashArtifact: hashArtifact,

  // Doctrine v2 Part VI.10 — declared strata for the Substrate Conformance Index.
  strata: ['sound', 'time'] as const,
  engineOwner: 'music engine custodian',
};

registerContract(MusicQualityContract);
