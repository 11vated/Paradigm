/**
 * Sprite Quality Contract — wraps generateSpriteV3 with an in-memory
 * adapter so it satisfies all 5 clauses of the Paradigm Quality Contract.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSpriteV3 } from './sprite';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport } from '../quality-contract';

interface SpriteSeed { $hash: string; genes?: Record<string, { value: any }>; }
interface SpriteArtifact {
  pngBuffer: Buffer;
  metaJson: any;
  meta: { frames: number; resolution: number; paletteSize: number };
}

async function synthesize(seed: SpriteSeed): Promise<SpriteArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sprite-contract-'));
  const out = dir; // sprite-v3 treats outputPath as a directory
  try {
    const r = await generateSpriteV3(seed as any, out);
    const pngBuffer = await fs.readFile(r.filePath);
    const metaJson = JSON.parse(await fs.readFile(r.atlas, 'utf8'));
    return { pngBuffer, metaJson, meta: { frames: r.frames, resolution: r.resolution, paletteSize: r.paletteSize } };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

interface SpriteInverted { frames: number; resolution: number; paletteSize: number; pngBytes: number; }

function invert(a: SpriteArtifact): SpriteInverted {
  return {
    frames: a.meta.frames,
    resolution: a.meta.resolution,
    paletteSize: a.meta.paletteSize,
    pngBytes: a.pngBuffer.length,
  };
}

function rate(a: SpriteArtifact): QualityReport {
  const axes: Record<string, number> = {};
  axes.pngPresent = a.pngBuffer.length > 100 ? 1 : 0;
  axes.pngSignature = (a.pngBuffer[0] === 0x89 && a.pngBuffer[1] === 0x50 && a.pngBuffer[2] === 0x4e && a.pngBuffer[3] === 0x47) ? 1 : 0;
  axes.frames = a.meta.frames >= 1 && a.meta.frames <= 64 ? 1 : 0;
  axes.resolution = a.meta.resolution >= 16 && a.meta.resolution <= 2048 ? 1 : 0;
  axes.palette = a.meta.paletteSize >= 2 && a.meta.paletteSize <= 256 ? 1 : 0;
  axes.metaJsonWellFormed = a.metaJson && typeof a.metaJson === 'object' ? 1 : 0;
  const score = Object.values(axes).reduce((s, v) => s + v, 0) / Object.values(axes).length;
  return { score, axes, notes: [`sprite ${a.meta.resolution}x ${a.meta.frames}f palette=${a.meta.paletteSize} png=${a.pngBuffer.length}B`] };
}

const CURATED: readonly { id: string; name: string; seed: SpriteSeed; intent: string; tags: readonly string[] }[] = [
  { id: 'sprite-hero-walk', name: 'Hero Walk', intent: 'Curated sprite starter', tags: ['character', 'walk'], seed: { $hash: 'sprite-hero-walk-v1' } },
  { id: 'sprite-coin-spin', name: 'Coin Spin', intent: 'Curated sprite starter', tags: ['item', 'loop'], seed: { $hash: 'sprite-coin-spin-v1' } },
  { id: 'sprite-tile-set', name: 'Tile Set', intent: 'Curated sprite starter', tags: ['environment', 'tileable'], seed: { $hash: 'sprite-tileset-v1' } },
  { id: 'sprite-spell-fx', name: 'Spell FX', intent: 'Curated sprite starter', tags: ['effect', 'particle'], seed: { $hash: 'sprite-spell-fx-v1' } },
];

function hashArtifact(a: SpriteArtifact): string {
  return crypto.createHash('sha256').update(a.pngBuffer).update(JSON.stringify(a.meta)).digest('hex');
}

export const SpriteQualityContract: QualityContract<SpriteSeed, SpriteArtifact, SpriteInverted> = {
  domain: 'sprite',
  version: '3.0.0',
  synthesize,
  invert,
  rate,
  curated: () => CURATED,
  hashArtifact: hashArtifact,
};

// Gate registration on FUNCTIONAL canvas — the dep may be in node_modules but
// without a compiled native binary; probe with a 1x1 canvas to detect this.
let _canvasFunctional = false;
try {
  const c: any = await import('canvas');
  c.createCanvas(1, 1).getContext('2d');
  _canvasFunctional = true;
} catch { _canvasFunctional = false; }
if (_canvasFunctional) registerContract(SpriteQualityContract as any);
else console.warn('[contract] sprite: skipping registration — `canvas` native binary not built');
