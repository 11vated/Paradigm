/**
 * Finance Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateFinance } from './finance';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'finance'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const FinanceQualityContract: QualityContract<S, A, any> = {
  domain: 'finance',
  version: '1.0.0',
  curated: () => [
    { id: 'finance-default', name: 'Default finance', intent: 'baseline', seed: { $domain: 'finance', $name: 'finance-default', genes: {} } },
    { id: 'finance-bright', name: 'Bright finance', intent: 'high-energy', seed: { $domain: 'finance', $name: 'finance-bright', genes: { energy: 0.9 } } },
    { id: 'finance-quiet', name: 'Quiet finance', intent: 'low-energy', seed: { $domain: 'finance', $name: 'finance-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'finance-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateFinance(seed, out));
    const filePath = r.filePath ?? out;
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: {} };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
  strata: ['Field', 'Story', 'Mind'] as const,
  engineOwner: 'Finance Engine',
  manifest() {
    return {
      domain: 'finance',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(FinanceQualityContract);
