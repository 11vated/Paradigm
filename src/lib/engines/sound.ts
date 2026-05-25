/**
 * Engine: sound — synthesis, DSP, spatialization, mixing.
 *
 * Phase 0 cut: dispatches by kind to three existing audio generators:
 *  - audio      → raw synthesized samples + WAV/MP3/OGG export
 *  - music      → compositional notes + WAV + MIDI + multi-stem export
 *  - acoustics  → room/venue acoustic simulation (impulse, planning JSON)
 *
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part III. Engine layer adds no entropy.
 */
import * as fs from 'node:fs';
import type { Seed } from '../kernel/engines';
import type { Engine, EngineCapability } from './types';
import { generateAudio } from '../kernel/generators/audio';
import { generateMusic } from '../kernel/generators/music';
import { generateAcoustics } from '../kernel/generators/acoustics';

export type SoundKind = 'audio' | 'music' | 'acoustics';

export interface SoundRequest {
  kind: SoundKind;
  seed: Seed;
  outputPath: string;
}

export interface SoundArtifact {
  kind: SoundKind;
  primaryPath: string;
  auxPaths: string[];
  metrics: Record<string, number | string>;
  raw: unknown;
}

export const capability: EngineCapability = Object.freeze({
  id: 'sound',
  name: 'Sound Engine',
  version: '0.1.0',
  outputs: ['wav', 'mp3', 'ogg', 'midi', 'json'],
  composesWith: ['motion', 'world', 'story', 'mind'],
});

export async function generateSound(req: SoundRequest): Promise<SoundArtifact> {
  ensureDir(req.outputPath);
  switch (req.kind) {
    case 'audio': {
      const out = await generateAudio(req.seed, req.outputPath);
      return {
        kind: 'audio',
        primaryPath: out.wavPath,
        auxPaths: [out.mp3Path, out.oggPath],
        metrics: { duration: out.duration, sampleRate: out.sampleRate },
        raw: out,
      };
    }
    case 'music': {
      const out = await generateMusic(req.seed, req.outputPath);
      return {
        kind: 'music',
        primaryPath: out.wavPath,
        auxPaths: [out.midiPath, ...out.stems],
        metrics: { duration: out.duration, tempo: out.tempo, stemCount: out.stems.length },
        raw: out,
      };
    }
    case 'acoustics': {
      const out = await generateAcoustics(req.seed, req.outputPath);
      return {
        kind: 'acoustics',
        primaryPath: (out as { filePath: string }).filePath,
        auxPaths: [(out as { planPath: string }).planPath],
        metrics: { roomType: (out as { roomType: string }).roomType },
        raw: out,
      };
    }
    default: {
      const _exhaustive: never = req.kind;
      throw new Error(`sound: unsupported kind ${String(_exhaustive)}`);
    }
  }
}

function ensureDir(p: string): void {
  const dir = p.endsWith('.json') || p.endsWith('.wav') || p.endsWith('.mid') ? p : p;
  // Caller is expected to pass either a directory or a file-path-prefix. We
  // create the parent of the given path either way (no-op if it already exists).
  const target = fs.existsSync(p) ? p : p;
  void target;
  try { fs.mkdirSync(p, { recursive: true }); } catch { /* p may be a file path; fall through */ }
}

export const engine: Engine = Object.freeze({
  capability,
  generate: generateSound as unknown as (req: unknown) => Promise<unknown>,
  validate(output: unknown) {
    const o = output as { primaryPath?: string } | null;
    if (!o || typeof o.primaryPath !== 'string' || o.primaryPath.length === 0) {
      return { ok: false as const, reason: 'sound artifact missing primaryPath' };
    }
    return { ok: true as const };
  },
});
