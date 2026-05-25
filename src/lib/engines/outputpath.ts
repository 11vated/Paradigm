/**
 * Output-path normalization for the substrate.
 *
 * Existing generators in src/lib/kernel/generators/ have inconsistent
 * outputPath expectations: some treat it as a directory (typography, world,
 * play, story, matter, field), some as a file path with .json suffix
 * (motion/dance, sound/acoustics, mind/neuroscience). This fragmentation
 * leaks into engine composition (WS20) and the Director executor (WS21).
 *
 * This module is the canonical normalizer. Each engine kind declares its
 * outputPath SHAPE (directory | json-file | txt-file | bin-file) and a
 * canonical default basename. The composition + executor layers call
 * normalizeForEngine(engineId, kind, outDir) to derive the right path
 * shape for the underlying generator from a single shared output directory.
 *
 * Added by paradigm-infinite/ws-26.
 * Doctrine: 12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md Part III.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { EngineId } from './index';

export type OutputShape = 'directory' | 'json-file' | 'txt-file' | 'bin-file';

interface KindOutputSpec {
  shape: OutputShape;
  basename: string;
}

const SHAPE_MAP: Record<string, Record<string, KindOutputSpec>> = {
  form: {
    character: { shape: 'directory', basename: '' },
    sprite:    { shape: 'directory', basename: '' },
    typography:{ shape: 'directory', basename: '' },
  },
  motion: {
    physics:  { shape: 'directory', basename: '' },
    particle: { shape: 'directory', basename: '' },
    dance:    { shape: 'json-file', basename: 'choreo.json' },
  },
  sound: {
    audio:     { shape: 'directory', basename: '' },
    music:     { shape: 'directory', basename: '' },
    acoustics: { shape: 'json-file', basename: 'acoustics.json' },
  },
  world: {
    world:     { shape: 'directory', basename: '' },
    ecosystem: { shape: 'directory', basename: '' },
  },
  mind: {
    agent:        { shape: 'directory', basename: '' },
    neuroscience: { shape: 'json-file', basename: 'study.json' },
  },
  play: {
    game:     { shape: 'directory', basename: '' },
    fullgame: { shape: 'directory', basename: '' },
  },
  story: {
    narrative: { shape: 'directory', basename: '' },
    film:      { shape: 'directory', basename: '' },
    theater:   { shape: 'directory', basename: '' },
  },
  matter: {
    molecule: { shape: 'directory', basename: '' },
    protein:  { shape: 'directory', basename: '' },
    material: { shape: 'directory', basename: '' },
  },
  field: {
    electromagnetic: { shape: 'directory', basename: '' },
    quantum:         { shape: 'directory', basename: '' },
    cosmology:       { shape: 'directory', basename: '' },
  },
};

const DEFAULT_DIR_NAME = 'out';

/**
 * Given a shared output directory + engine + kind, produce the outputPath
 * the underlying generator expects.
 *
 * Side effect: ensures the directory portion exists (mkdir -p). The kernel
 * generators all expect their parent dir to be ready.
 */
export function normalizeForEngine(
  engineId: EngineId,
  kind: string,
  baseDir: string,
): string {
  const engineSpec = SHAPE_MAP[engineId];
  const kindSpec = engineSpec?.[kind];
  if (!kindSpec) {
    // Unknown kind: default to directory shape; the engine will likely error
    // but at least the path is well-formed.
    fs.mkdirSync(baseDir, { recursive: true });
    return baseDir;
  }
  if (kindSpec.shape === 'directory') {
    fs.mkdirSync(baseDir, { recursive: true });
    return baseDir;
  }
  // file shape — ensure parent dir exists, append basename
  fs.mkdirSync(baseDir, { recursive: true });
  return path.join(baseDir, kindSpec.basename);
}

export function getOutputShape(engineId: EngineId, kind: string): OutputShape | null {
  return SHAPE_MAP[engineId]?.[kind]?.shape ?? null;
}

export function listKindsForEngine(engineId: EngineId): string[] {
  return Object.keys(SHAPE_MAP[engineId] ?? {});
}

export { SHAPE_MAP as _OUTPUT_SHAPE_MAP_INTERNAL };
