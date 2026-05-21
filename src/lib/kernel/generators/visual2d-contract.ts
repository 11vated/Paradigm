/**
 * Visual2D Quality Contract — wraps generateVisual2DV3.
 *
 * The artifact is the deterministic SVG text (PNG byte-identity isn't guaranteed
 * across canvas encoder builds, so we hash the SVG which is canonical text).
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateVisual2DV3 } from './visual2d';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport } from '../quality-contract';

interface V2Seed { $hash: string; genes?: Record<string, any>; }
interface V2Inverted { resolution: number; layers: number; svgChars: number; svgHash: string; }
interface V2Artifact { svg: string; meta: { pngPath: string; resolution: number; layers: number; ssim: number } }

async function synthesize(seed: V2Seed): Promise<V2Artifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-v2-'));
  try {
    const r = await generateVisual2DV3(seed as any, dir);
    const svg = await fs.readFile(r.svgPath, 'utf8');
    return { svg, meta: { pngPath: r.pngPath, resolution: r.resolution, layers: r.layers, ssim: r.ssim } };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function invert(artifact: V2Artifact): V2Inverted {
  return {
    resolution: artifact.meta.resolution,
    layers: artifact.meta.layers,
    svgChars: artifact.svg.length,
    svgHash: crypto.createHash('sha256').update(artifact.svg).digest('hex').slice(0, 16),
  };
}

function rate(artifact: V2Artifact): QualityReport {
  const axes: Record<string, number> = {};
  axes.hasSvg = artifact.svg.length > 100 ? 1 : 0;
  axes.layered = artifact.meta.layers >= 3 ? 1 : 0;
  axes.resolution = artifact.meta.resolution >= 256 ? 1 : artifact.meta.resolution / 256;
  axes.ssim = Math.max(0, Math.min(1, artifact.meta.ssim ?? 0));
  const values = Object.values(axes);
  const score = values.reduce((a, b) => a + b, 0) / values.length;
  return { score, axes, notes: [`SVG ${artifact.svg.length}b, ${artifact.meta.layers} layers, ${artifact.meta.resolution}px`] };
}

const CURATED = [
  { id: 'v2-architectural', name: 'Architectural', intent: 'Architectural line art',
    tags: ['lines', 'precise'], seed: { $hash: 'v2-arch', genes: { style: { value: 'architectural' }, layers: { value: 5 }, resolution: { value: 0.5 } } } as V2Seed },
  { id: 'v2-organic',   name: 'Organic',   intent: 'Organic shapes', tags: ['curves', 'soft'],
    seed: { $hash: 'v2-org', genes: { style: { value: 'organic' }, layers: { value: 7 }, resolution: { value: 0.3 } } } as V2Seed },
  { id: 'v2-glyph',     name: 'Glyph',     intent: 'Glyph / sigil', tags: ['symbol'],
    seed: { $hash: 'v2-gly', genes: { style: { value: 'glyph' }, layers: { value: 4 }, resolution: { value: 0.3 } } } as V2Seed },
];

function hashArtifact(a: V2Artifact): string {
  return crypto.createHash('sha256').update(a.svg).digest('hex');
}

export const Visual2DQualityContract: QualityContract<V2Seed, V2Artifact, V2Inverted> = {
  domain: 'visual2d',
  version: '3.0.0',
  synthesize,
  invert,
  rate,
  curated: () => CURATED,
  hashArtifact,
};

registerContract(Visual2DQualityContract as any);
