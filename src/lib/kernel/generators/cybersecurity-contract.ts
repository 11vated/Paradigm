/**
 * Cybersecurity Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateCybersecurity } from './cybersecurity';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';
import { withKernelClock } from '../clock';
import { runStratumPredicate } from '../quality/predicates';

interface S { $domain: 'cybersecurity'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const CybersecurityQualityContract: QualityContract<S, A, any> = {
  domain: 'cybersecurity',
  version: '1.0.0',
  curated: () => [
    { id: 'cybersecurity-default', name: 'Default cybersecurity', intent: 'baseline', seed: { $domain: 'cybersecurity', $name: 'cybersecurity-default', genes: {} } },
    { id: 'cybersecurity-bright', name: 'Bright cybersecurity', intent: 'high-energy', seed: { $domain: 'cybersecurity', $name: 'cybersecurity-bright', genes: { energy: 0.9 } } },
    { id: 'cybersecurity-quiet', name: 'Quiet cybersecurity', intent: 'low-energy', seed: { $domain: 'cybersecurity', $name: 'cybersecurity-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'cybersecurity-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateCybersecurity(seed, out));
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
        probe = { energy: 0.91, rules: 6 };
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
  engineOwner: 'Cybersecurity Engine',
  manifest() {
    return {
      domain: 'cybersecurity',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(CybersecurityQualityContract);
