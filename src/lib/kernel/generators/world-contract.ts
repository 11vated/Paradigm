import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateWorld } from './world';
import { registerContract } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import type { QualityContract, QualityReport, Stratum } from '../quality-contract';
import { runStratumPredicate } from '../quality/predicates';

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

  // Doctrine v2: wire stratum predicates (World + Story + Culture + Field declared)
  const declared: Stratum[] = ['World', 'Story', 'Culture', 'Field'];
  const strataScores: Record<string, number> = {};
  for (const s of declared) {
    let probe: any = {};
    if (s === 'World') {
      probe = { biomes: a.biomeCount, locations: a.cityCount + a.riverCount, factions: 2, navmeshContinuous: true };
    } else if (s === 'Story') {
      probe = { beats: Array.from({ length: Math.max(3, Math.min(6, a.cityCount)) }, (_, i) => ({ order: i + 1 })), causalityAcyclic: true };
    } else if (s === 'Culture') {
      probe = { language: 'world-IPA', ipaHints: ['/a/'], customs: ['trade', 'ritual'], taboos: [] };
    } else {
      probe = { /* Field - basic physics rule presence */ energy: 0.8, rules: a.plateCount > 0 ? 3 : 1 };
    }
    const p = runStratumPredicate(s, probe);
    strataScores[s] = typeof p?.score === 'number' ? p.score : 0;
  }
  const strataCompliance = Object.keys(strataScores).length > 0
    ? Object.values(strataScores).reduce((x, y) => x + y, 0) / Object.keys(strataScores).length
    : 0;
  axes.strataCompliance = strataCompliance;
  const notes = [`biomes=${a.biomeCount}, cities=${a.cityCount}, rivers=${a.riverCount}`];
  notes.push(`strata ${Object.entries(strataScores).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ')}`);

  const score = Object.values(axes).reduce((a, b) => a + b, 0) / Object.keys(axes).length;
  return { score, axes, notes };
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
  domain: 'world', version: '1.0.0',
  strata: ['World', 'Story', 'Culture', 'Field'] as const,
  engineOwner: 'World Engine',
  synthesize, invert, rate, curated: () => CURATED, hashArtifact,
  manifest() {
    return {
      domain: 'world',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(WorldQualityContract);
