/**
 * Procedural Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateProcedural } from './procedural';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'procedural'; $name?: string; genes?: Record<string, unknown> }
interface A {
  heightmapPath: string;
  jsonPath: string;
  htmlPath: string;
  biomeCount: number;
  filePath: string; // legacy interop: holds json content for hash compat in some runners
  meta: Record<string, unknown>;
}
interface I { size: number; biomeCount: number }

function hashArtifact(a: A): string {
  const payload = a.heightmapPath + '|' + a.jsonPath + '|' + a.htmlPath + '|' + a.biomeCount + '|' + (a.filePath || '');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'procedural-'));
  const _out = path.join(dir, 'procedural.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateProcedural(seed as any, dir)) as {
    heightmapPath: string; jsonPath: string; htmlPath: string; biomeCount: number;
  };
  const jsonContent = await fsp.readFile(r.jsonPath, 'utf-8').catch(() => '{}');
  // Read PNG as base64 for rich manifest (real valid image bytes)
  const pngBytes = await fsp.readFile(r.heightmapPath).catch(() => Buffer.alloc(0));
  const pngB64 = pngBytes.toString('base64');
  return {
    heightmapPath: r.heightmapPath,
    jsonPath: r.jsonPath,
    htmlPath: r.htmlPath,
    biomeCount: r.biomeCount,
    filePath: jsonContent,
    meta: {
      biomeCount: r.biomeCount,
      pngBase64Head: pngB64.slice(0, 128), // evidence of real PNG (starts with iVBORw0KGgo= for valid)
      pngSize: pngBytes.length,
      jsonSize: jsonContent.length,
      htmlSize: (await fsp.readFile(r.htmlPath, 'utf-8').catch(() => '')).length
    }
  };
}

function invert(a: A): I {
  return { size: (a.filePath || '').length + (a.meta?.pngSize as number || 0), biomeCount: a.biomeCount };
}

function rate(a: A): QualityReport {
  const jsonLen = (a.filePath || '').length;
  const pngSize = (a.meta?.pngSize as number) || 0;
  const bCount = a.biomeCount || 0;
  // Rich scoring: penalize tiny outputs, reward biome variety + substantial image data (real raster)
  const sizeScore = Math.min(1, (jsonLen + pngSize) / 120000);
  const biomeScore = Math.min(1, bCount / 8);
  const pngReal = pngSize > 800 && (a.meta?.pngBase64Head as string || '').startsWith('iVBOR') ? 1 : 0.6;
  const score = (sizeScore * 0.4 + biomeScore * 0.35 + pngReal * 0.25);
  const axes: Record<string, number> = {
    hasOutput: jsonLen > 0 ? 1 : 0,
    biomeDiversity: biomeScore,
    rasterSize: Math.min(1, pngSize / 80000),
    pngValidMagic: pngReal,
    totalArtifactBytes: Math.min(1, (jsonLen + pngSize) / 200000)
  };
  const notes = [
    `biomes=${bCount} png=${pngSize}B json=${jsonLen}B`,
    `pngMagic=${pngReal ? 'valid' : 'check'}`
  ];
  return { score: Math.max(0, Math.min(1, score)), axes, notes };
}

export const ProceduralQualityContract: QualityContract<S, A, I> = {
  domain: 'procedural',
  version: '1.0.0',
  strata: ['Form', 'World', 'Field'] as const,
  engineOwner: 'Procedural Generation Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'procedural-default', name: 'Default procedural', intent: 'baseline', seed: { $domain: 'procedural', $name: 'procedural-default', genes: {} } as S },
    { id: 'procedural-bright', name: 'Bright procedural', intent: 'high-energy', seed: { $domain: 'procedural', $name: 'procedural-bright', genes: { energy: 0.9 } } as S },
    { id: 'procedural-quiet', name: 'Quiet procedural', intent: 'low-energy', seed: { $domain: 'procedural', $name: 'procedural-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'procedural',
      version: '1.0.0',
      strata: ['Form', 'World', 'Field'],
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      outputs: ['PNG (valid raster terrain)', 'JSON (world params + height + biomes)', 'HTML (interactive viz)'],
      notes: 'Real canvas-generated PNG with biome-colored shaded heightmap + contours; complete valid output.'
    };
  },
};
registerContract(ProceduralQualityContract);
