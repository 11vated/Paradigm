/**
 * Healthcare Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateHealthcare } from './healthcare';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'healthcare'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const HealthcareQualityContract: QualityContract<S, A, any> = {
  domain: 'healthcare',
  version: '1.0.0',
  curated: () => [
    { id: 'healthcare-default', name: 'Default healthcare', intent: 'baseline', seed: { $domain: 'healthcare', $name: 'healthcare-default', genes: {} } },
    { id: 'healthcare-bright', name: 'Bright healthcare', intent: 'high-energy', seed: { $domain: 'healthcare', $name: 'healthcare-bright', genes: { energy: 0.9 } } },
    { id: 'healthcare-quiet', name: 'Quiet healthcare', intent: 'low-energy', seed: { $domain: 'healthcare', $name: 'healthcare-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'healthcare-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateHealthcare(seed, out));
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
  strata: ['Form', 'Field', 'Mind'] as const,
  engineOwner: 'Healthcare Engine',
  manifest() {
    return {
      domain: 'healthcare',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(HealthcareQualityContract);
