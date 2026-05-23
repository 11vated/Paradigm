import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateField } from './field';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport } from '../quality-contract';

interface FSeed { $hash: string; genes?: Record<string, any>; }
interface FArtifact { svg: string; fieldData: any; sourceType: string; gridSize: number; maxE: number; maxH: number; }
interface FInverted { gridSize: number; maxE: number; maxH: number; svgHash: string; }

async function synthesize(seed: FSeed): Promise<FArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-fd-'));
  try {
    const r = await generateField(seed as any, dir) as any;
    const svg = await fs.readFile(r.svgPath, 'utf8').catch(() => '');
    const fd  = JSON.parse(await fs.readFile(r.jsonPath, 'utf8').catch(() => '{}')).fieldSnapshot ?? {};
    return { svg, fieldData: fd, sourceType: r.sourceType ?? '', gridSize: r.gridSize ?? 0, maxE: fd.maxE ?? 0, maxH: fd.maxH ?? 0 };
  } finally { await fs.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

function invert(a: FArtifact): FInverted {
  return { gridSize: a.gridSize, maxE: a.maxE, maxH: a.maxH,
    svgHash: crypto.createHash('sha256').update(a.svg).digest('hex').slice(0, 16) };
}

function rate(a: FArtifact): QualityReport {
  const axes: Record<string, number> = {
    hasSvg:   a.svg.length > 200 ? 1 : 0,
    hasField: a.maxE > 0 || a.maxH > 0 ? 1 : 0,
    gridSize: Math.min(1, a.gridSize / 64),
    physicallyValid: isFinite(a.maxE) && isFinite(a.maxH) ? 1 : 0,
  };
  const score = Object.values(axes).reduce((a, b) => a + b, 0) / Object.keys(axes).length;
  return { score, axes, notes: [`${a.sourceType}, grid=${a.gridSize}, maxE=${a.maxE.toFixed(3)}`] };
}

function hashArtifact(a: FArtifact): string {
  return crypto.createHash('sha256').update(a.svg).digest('hex');
}

const CURATED = [
  { id: 'field-dipole',     name: 'Dipole',      intent: 'Electric dipole field',   tags: ['em','dipole'],
    seed: { $hash: 'fd-dipole', genes: { sourceType: { value: 'dipole' } } } as FSeed },
  { id: 'field-plane-wave', name: 'Plane Wave',  intent: 'EM plane wave propagation', tags: ['em','wave'],
    seed: { $hash: 'fd-plane', genes: { sourceType: { value: 'plane_wave' } } } as FSeed },
  { id: 'field-gaussian',   name: 'Gaussian',    intent: 'Gaussian beam propagation', tags: ['em','gaussian'],
    seed: { $hash: 'fd-gauss', genes: { sourceType: { value: 'gaussian_beam' } } } as FSeed },
];

export const FieldQualityContract: QualityContract<FSeed, FArtifact, FInverted> = {
  domain: 'field', version: '1.0.0', synthesize, invert, rate, curated: () => CURATED, hashArtifact,
};
registerContract(FieldQualityContract as any);
