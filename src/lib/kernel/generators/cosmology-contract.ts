import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateCosmology } from './cosmology';
import { registerContract } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';
import type { QualityContract, QualityReport, Stratum } from '../quality-contract';

interface CoSeed { $hash: string; genes?: Record<string, any>; }
interface CoArtifact {
  svg: string;
  bodyCount: number;
  scenario: string;
  finalEnergy: number;
  conserved: boolean;
  steps: number;
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
interface CoInverted { bodyCount: number; scenario: string; conserved: boolean; }

async function synthesize(seed: CoSeed): Promise<CoArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-cos-'));
  try {
    const r = await generateCosmology(seed as any, dir) as any;
    const svg  = await fs.readFile(r.svgPath, 'utf8').catch(() => '');
    const meta = JSON.parse(await fs.readFile(r.jsonPath, 'utf8').catch(() => '{}')).cosmology ?? {};
    const previewData = svg || JSON.stringify({ bodyCount: r.bodyCount, scenario: r.scenario });
    return {
      svg,
      bodyCount: r.bodyCount ?? 0,
      scenario: r.scenario ?? '',
      finalEnergy: meta.totalEnergy ?? 0,
      conserved: meta.energyConserved ?? false,
      steps: meta.steps ?? 0,
      previewData,
      visual: { type: 'svg', previewData },
      emergent_assets: {
        preview: { type: 'svg', data: previewData, path: r.svgPath }
      }
    };
  } finally { await fs.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

function invert(a: CoArtifact): CoInverted {
  return { bodyCount: a.bodyCount, scenario: a.scenario, conserved: a.conserved };
}

function rate(a: CoArtifact): QualityReport {
  const axes: Record<string, number> = {
    hasSvg:    a.svg.length > 200 ? 1 : 0,
    hasBodies: a.bodyCount >= 3 ? 1 : a.bodyCount / 3,
    conserved: a.conserved ? 1 : 0.5,
    hasSteps:  a.steps >= 100 ? 1 : a.steps / 100,
    finite:    isFinite(a.finalEnergy) ? 1 : 0,
  };
  const score = Object.values(axes).reduce((a, b) => a + b, 0) / Object.keys(axes).length;
  return { score, axes, notes: [`${a.scenario}, n=${a.bodyCount}, steps=${a.steps}, conserved=${a.conserved}`] };
}

function hashArtifact(a: CoArtifact): string {
  return crypto.createHash('sha256').update(a.svg).digest('hex');
}

const CURATED = [
  { id: 'cosmology-galaxy-default',   name: 'Galaxy',    intent: 'Spiral galaxy simulation',      tags: ['cosmology','galaxy'],
    seed: { $hash: 'cos-galaxy',   genes: { scenario: { value: 'galaxy'           } } } as CoSeed },
  { id: 'cosmology-collision',        name: 'Collision', intent: 'Galaxy collision merger',        tags: ['cosmology','collision'],
    seed: { $hash: 'cos-collide',  genes: { scenario: { value: 'galaxy_collision' } } } as CoSeed },
  { id: 'cosmology-solar-system',     name: 'Solar',     intent: 'Solar system orbital mechanics', tags: ['cosmology','solar'],
    seed: { $hash: 'cos-solar',    genes: { scenario: { value: 'solar_system'     } } } as CoSeed },
];

export const CosmologyQualityContract: QualityContract<CoSeed, CoArtifact, CoInverted> = {
  domain: 'cosmology', version: '1.0.0', 
  strata: ['World', 'Field', 'Time'] as const,
  engineOwner: 'Cosmology Engine',
  synthesize, invert, rate, curated: () => CURATED, hashArtifact,
  manifest() {
    return { World: 'N-body trajectories', Field: 'Gravity + softening rules', Time: 'Leapfrog integration timeline' };
  },
};
registerContract(CosmologyQualityContract);

