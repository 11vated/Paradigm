import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateField } from './field';
import { registerContract } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';
import type { QualityContract, QualityReport, Stratum } from '../quality-contract';
import { computeRatingScore } from '../quality/rating';

interface FSeed { $hash: string; genes?: Record<string, any>; }
interface FArtifact {
  svg: string;
  fieldData: any;
  sourceType: string;
  gridSize: number;
  peakMagnitude: number;
  energyDensity: number;
  previewData?: string;
  visual?: {
    type: 'svg' | 'json' | 'text';
    previewData?: string;
  };
  emergent_assets?: {
    preview?: {
      type: 'svg' | 'json' | 'text';
      data?: string;
      path?: string;
    };
  };
}
interface FInverted { gridSize: number; peakMagnitude: number; energyDensity: number; svgHash: string; }

async function synthesize(seed: FSeed): Promise<FArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-fd-'));
  try {
    const r = await generateField(seed as any, dir) as any;
    const svg = await fs.readFile(r.svgPath, 'utf8').catch(() => '');
    const json = JSON.parse(await fs.readFile(r.jsonPath, 'utf8').catch(() => '{}'));
    const peakMagnitude = json.peakMagnitude ?? 0;
    const energyDensity = json.energyDensity ?? 0;
    const previewData = svg;
    return {
      svg, fieldData: json, sourceType: json.fieldType ?? '',
      gridSize: json.gridSize ?? 64, peakMagnitude, energyDensity,
      previewData,
      visual: { type: 'svg', previewData },
      emergent_assets: {
        preview: { type: 'svg', data: previewData, path: r.svgPath },
      },
    };
  } finally { await fs.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

function invert(a: FArtifact): FInverted {
  return { gridSize: a.gridSize, peakMagnitude: a.peakMagnitude, energyDensity: a.energyDensity,
    svgHash: crypto.createHash('sha256').update(a.svg).digest('hex').slice(0, 16) };
}

function rate(a: FArtifact): QualityReport {
  const axes: Record<string, number> = {
    hasSvg:   a.svg.length > 200 ? 1 : 0,
    hasField: a.peakMagnitude > 0 || a.energyDensity > 0 ? 1 : 0,
    gridSize: Math.min(1, a.gridSize / 64),
    physicallyValid: isFinite(a.peakMagnitude) && isFinite(a.energyDensity) ? 1 : 0,
  };
  const { score } = computeRatingScore({ axes, artifact: a as any });
  return { score, axes, notes: [`${a.sourceType}, grid=${a.gridSize}, peakMag=${a.peakMagnitude.toFixed(3)}`] };
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
registerContract(FieldQualityContract);

