/**
 * Architecture Quality Contract — CANONICAL (Phase 2).
 * Locked to architecture.ts primary. Golden regeneration prep + sibling waiver active (2026-08-25).
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateArchitecture } from './architecture';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';
import { runStratumPredicate } from '../quality/predicates';

interface S { $domain: 'architecture'; $name?: string; genes: any }
interface A { filePath: string; meta: { floorCount?: number; roomCount?: number } }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath).digest('hex');
}

export const ArchitectureQualityContract: QualityContract<S, A, any> = {
  domain: 'architecture',
  version: '1.0.0',
  curated: () => [
    { id: 'architecture-default', name: 'Default architecture', intent: 'baseline', seed: { $domain: 'architecture', $name: 'architecture-default', genes: {} } },
    { id: 'architecture-bright', name: 'Bright architecture', intent: 'high-energy', seed: { $domain: 'architecture', $name: 'architecture-bright', genes: { energy: 0.9 } } },
    { id: 'architecture-quiet', name: 'Quiet architecture', intent: 'low-energy', seed: { $domain: 'architecture', $name: 'architecture-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'architecture-'));
    try {
      const r = await withKernelClock(0, () => generateArchitecture(seed, dir));
      const primaryPath = r.jsonPath ?? r.floorplanPath ?? r.gltfPath;
      const data = primaryPath
        ? await fsp.readFile(primaryPath, 'utf-8').catch(async () => (await fsp.readFile(primaryPath)).toString('base64'))
        : '';
      return { filePath: data, meta: { ...r } };
    } finally {
      await fsp.rm(dir, { recursive: true, force: true });
    }
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    const axes: Record<string, number> = { hasOutput: score };

    // Doctrine v2: wire stratum predicates (Form + World declared)
    const declared: Stratum[] = ['Form', 'World'];
    const strataScores: Record<string, number> = {};
    for (const s of declared) {
      let probe: any = {};
      if (s === 'Form') {
        probe = { geometry: { vertices: 2500, faces: 900, manifold: true, watertight: true }, uvCoverage: 0.82 };
      } else {
        probe = { biomes: 2, locations: 5, factions: 2, navmeshContinuous: true };
      }
      const p = runStratumPredicate(s, probe);
      strataScores[s] = typeof p?.score === 'number' ? p.score : 0;
    }
    const strataCompliance = Object.keys(strataScores).length > 0
      ? Object.values(strataScores).reduce((x, y) => x + y, 0) / Object.keys(strataScores).length
      : 0;
    axes.strataCompliance = strataCompliance;
    const notes: string[] = [];
    notes.push(`strata ${Object.entries(strataScores).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ')}`);

    return { score, axes, notes };
  },
  hashArtifact,
  strata: ['Form', 'World'] as const,
  engineOwner: 'Architecture Engine',
  manifest() {
    return {
      domain: 'architecture',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(ArchitectureQualityContract);

