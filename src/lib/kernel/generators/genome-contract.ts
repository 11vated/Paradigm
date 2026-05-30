/**
 * Genome Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateGenome } from './genome';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'genome'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const GenomeQualityContract: QualityContract<S, A, any> = {
  domain: 'genome',
  version: '1.0.0',
  curated: () => [
    { id: 'genome-default', name: 'Default genome', intent: 'baseline', seed: { $domain: 'genome', $name: 'genome-default', genes: {} } },
    { id: 'genome-bright', name: 'Bright genome', intent: 'high-energy', seed: { $domain: 'genome', $name: 'genome-bright', genes: { energy: 0.9 } } },
    { id: 'genome-quiet', name: 'Quiet genome', intent: 'low-energy', seed: { $domain: 'genome', $name: 'genome-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'genome-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateGenome(seed, out));
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
  engineOwner: 'Genome Engine',
  manifest() {
    return {
      domain: 'genome',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(GenomeQualityContract);
