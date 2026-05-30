/**
 * Drug Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateDrug } from './drug';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'drug'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const DrugQualityContract: QualityContract<S, A, any> = {
  domain: 'drug',
  version: '1.0.0',
  curated: () => [
    { id: 'drug-default', name: 'Default drug', intent: 'baseline', seed: { $domain: 'drug', $name: 'drug-default', genes: {} } },
    { id: 'drug-bright', name: 'Bright drug', intent: 'high-energy', seed: { $domain: 'drug', $name: 'drug-bright', genes: { energy: 0.9 } } },
    { id: 'drug-quiet', name: 'Quiet drug', intent: 'low-energy', seed: { $domain: 'drug', $name: 'drug-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'drug-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateDrug(seed, out));
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
  strata: ['Form', 'Field'] as const,
  engineOwner: 'Drug Discovery Engine',
  manifest() {
    return {
      domain: 'drug',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(DrugQualityContract);
