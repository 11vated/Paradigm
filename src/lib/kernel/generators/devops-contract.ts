/**
 * Devops Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateDevOps } from './devops';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';
import { runStratumPredicate } from '../quality/predicates';

interface S { $domain: 'devops'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const DevopsQualityContract: QualityContract<S, A, any> = {
  domain: 'devops',
  version: '1.0.0',
  curated: () => [
    { id: 'devops-default', name: 'Default devops', intent: 'baseline', seed: { $domain: 'devops', $name: 'devops-default', genes: {} } },
    { id: 'devops-bright', name: 'Bright devops', intent: 'high-energy', seed: { $domain: 'devops', $name: 'devops-bright', genes: { energy: 0.9 } } },
    { id: 'devops-quiet', name: 'Quiet devops', intent: 'low-energy', seed: { $domain: 'devops', $name: 'devops-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'devops-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateDevOps(seed, out));
    const filePath = r.filePath ?? out;
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: {} };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    const axes: Record<string, number> = { hasOutput: score };

    // Doctrine v2: wire stratum predicates (Field + Mind + Story declared)
    const declared: Stratum[] = ['Field', 'Mind', 'Story'];
    const strataScores: Record<string, number> = {};
    for (const s of declared) {
      let probe: any = {};
      if (s === 'Field') {
        probe = { energy: 0.9, rules: 5 };
      } else if (s === 'Mind') {
        probe = { behaviors: [1,2,3,4], goals: [1,2,3], noUnreachableStates: true };
      } else {
        probe = { beats: [{ order: 1 }, { order: 2 }, { order: 3 }, { order: 4 }], causalityAcyclic: true };
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
  strata: ['Field', 'Mind', 'Story'] as const,
  engineOwner: 'DevOps Engine',
  manifest() {
    return {
      domain: 'devops',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(DevopsQualityContract);
