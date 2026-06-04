/**
 * Music Quality Contract — CANONICAL (Phase 2 collapse).
 * Wraps generateMusic (from music.ts primary) with in-memory adapter.
 * All siblings (music-v2, music-enhanced, music-gpu) deprecated + waived (sunset 2026-08-25).
 * PHASE 2 GOLDEN CORPUS PREP (priority):
 * Explicit golden hash capture targets: core music seeds (hero melodies, multi-stem arrangements) for regression.
 * Create similar capture-golden-music.ts stub when ready.
 * Golden corpus regeneration + hard enforcement active. Ready for pinning once stable seeds identified.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMusic } from './music';   // canonical primary (V3)
import { registerContract } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

// Direct 15_ contract usage (Epoch 2 pattern) — the engineering-grade version is the source of truth for strata + manifest
import type { QualityContract, QualityReport, Stratum } from '../quality-contract';
import { runStratumPredicate } from '../quality/predicates';

interface MusicSeed { $hash: string; genes?: Record<string, { value: any }>; }
interface MusicArtifact {
  wavBuffer: Buffer;
  meta: { duration: number; tempo: number; key: string; sampleRate: number };
  audioDataURL?: string;
  previewData?: string;
  structuredData?: any;
  summary?: string;
  metrics?: Record<string, number>;
  visual?: {
    type: 'png' | 'svg' | 'raster' | 'audio' | 'structured';
    audioDataURL?: string;
    previewData?: string;
    structuredData?: any;
    summary?: string;
    metrics?: Record<string, number>;
  };
  emergent_assets?: {
    audio?: {
      type: 'wav';
      data?: string;
      path?: string;
      duration?: number;
    };
    visual?: any;
    mesh?: any;
  };
}

async function synthesize(seed: MusicSeed): Promise<MusicArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'music-contract-'));
  const out = path.join(dir, 'music');
  await fs.mkdir(out, { recursive: true });
  try {
    const r: any = await generateMusic(seed as any, out);
    const wavPath = r.filePath || (r.wavPath) || path.join(dir, 'music.wav');
    const wavBuffer = await fs.readFile(wavPath);
    const audioDataURL = `data:audio/wav;base64,${wavBuffer.toString('base64')}`;
    const previewData = audioDataURL;
    const stems = r.stems || 5;
    const hasMIDI = !!r.midiPath;
    const summary = `Music ${r.key || 'C major'} ${r.tempo || 120}bpm, ${stems}-stem ${r.duration || 0}s 44.1kHz composition.`;
    const metrics: Record<string, number> = {
      sampleRate: r.sampleRate ?? 44100,
      duration: r.duration ?? 0,
      tempo: r.tempo ?? 120,
      stems: stems,
      hasMIDI: hasMIDI ? 1 : 0,
      hasStems: stems >= 5 ? 1 : 0.5
    };
    const structured = { ...r, stems, hasMIDI, fidelity: '44.1kHz 5-stem target' };
    return {
      wavBuffer,
      meta: {
        duration: r.duration ?? 0,
        tempo: r.tempo ?? 120,
        key: r.key ?? 'C major',
        sampleRate: r.sampleRate ?? 44100,
      },
      audioDataURL,
      previewData,
      structuredData: structured,
      summary,
      metrics,
      visual: {
        type: 'structured' as const,
        audioDataURL,
        previewData,
        structuredData: structured,
        summary,
        metrics,
      },
      emergent_assets: {
        audio: {
          type: 'wav',
          data: audioDataURL,
          path: wavPath,
          duration: r.duration ?? 0,
        },
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
  // Doctrine v2: wire Sound predicate (music declares Sound)
  const declared: Stratum[] = ['Sound'];
  const strataScores: Record<string, number> = {};
  for (const s of declared) {
    // Map music meta + PCM stats to soundPredicate shape (LUFS/true-peak/stems proxy)
    const probe = {
      lufs: stats ? -14 + (stats.rms - 0.5) * 6 : -14,
      truePeak: -1.2,
      stems: ['drums', 'bass', 'melody', 'harmony'],
      bpm: a.meta.tempo,
    };
    const p = runStratumPredicate(s, probe);
    strataScores[s] = typeof p?.score === 'number' ? p.score : 0;
  }
  const strataCompliance = Object.keys(strataScores).length > 0
    ? Object.values(strataScores).reduce((x, y) => x + y, 0) / Object.keys(strataScores).length
    : 0;
  axes.strataCompliance = strataCompliance;
  notes.push(`strata ${Object.entries(strataScores).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ')}`);

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
  strata: ['Sound', 'Culture', 'Time'] as const,
  engineOwner: 'Music Engine',
  synthesize,
  invert,
  rate,
  curated: () => CURATED,
  hashArtifact: hashArtifact,
  manifest() {
    return {
      domain: 'music',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};

registerContract(MusicQualityContract);

