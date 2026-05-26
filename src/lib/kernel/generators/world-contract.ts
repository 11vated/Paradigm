import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateWorld } from './world';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport } from '../quality-contract';

interface WdSeed { $hash: string; genes?: Record<string, any>; }
interface WdArtifact { svg: string; biomeCount: number; cityCount: number; riverCount: number; plateCount: number; byteSize: number; }
interface WdInverted { biomeCount: number; cityCount: number; riverCount: number; svgHash: string; }

async function synthesize(seed: WdSeed): Promise<WdArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-wd-'));
  try {
    const r = await generateWorld(seed as any, dir) as any;
    const svg = await fs.readFile(r.svgPath, 'utf8').catch(() => '');
    const meta = JSON.parse(await fs.readFile(r.jsonPath, 'utf8').catch(() => '{}')).world ?? {};
    return { svg, biomeCount: meta.regions ?? r.regionCount ?? 0, cityCount: meta.cities ?? r.cityCount ?? 0,
      riverCount: meta.rivers ?? r.riverCount ?? 0, plateCount: meta.plates ?? 0, byteSize: svg.length };
  } finally { await fs.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

function invert(a: WdArtifact): WdInverted {
  return { biomeCount: a.biomeCount, cityCount: a.cityCount, riverCount: a.riverCount,
    svgHash: crypto.createHash('sha256').update(a.svg).digest('hex').slice(0, 16) };
}

function rate(a: WdArtifact): QualityReport {
  const axes: Record<string, number> = {
    hasSvg:   a.svg.length > 500 ? 1 : 0,
    biomes:   Math.min(1, a.biomeCount / 6),
    cities:   Math.min(1, a.cityCount / 8),
    rivers:   Math.min(1, a.riverCount / 4),
    plates:   Math.min(1, a.plateCount / 5),
  };
  const score = Object.values(axes).reduce((a, b) => a + b, 0) / Object.keys(axes).length;
  return { score, axes, notes: [`biomes=${a.biomeCount}, cities=${a.cityCount}, rivers=${a.riverCount}`] };
}

function hashArtifact(a: WdArtifact): string {
  return crypto.createHash('sha256').update(a.svg).digest('hex');
}

const CURATED = [
  { id: 'world-continental',   name: 'Continental', intent: 'Classic continental landmass world',  tags: ['world','map'],
    seed: { $hash: 'wd-cont',  genes: { worldType: { value: 'continental' } } } as WdSeed },
  { id: 'world-archipelago',   name: 'Archipelago', intent: 'Island archipelago world',            tags: ['world','islands'],
    seed: { $hash: 'wd-arch',  genes: { worldType: { value: 'archipelago' } } } as WdSeed },
  { id: 'world-pangaea',       name: 'Pangaea',     intent: 'Single supercontinent world',         tags: ['world','pangaea'],
    seed: { $hash: 'wd-pang',  genes: { worldType: { value: 'pangaea'    } } } as WdSeed },
];

export const WorldQualityContract: QualityContract<WdSeed, WdArtifact, WdInverted> = {
  domain: 'world', version: '1.0.0', synthesize, invert, rate, curated: () => CURATED, hashArtifact,
};
registerContract(WorldQualityContract as any);
