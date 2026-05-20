/**
 * Fitness Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateFitness } from './fitness';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'fitness'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const FitnessQualityContract: QualityContract<S, A, any> = {
  domain: 'fitness',
  version: '1.0.0',
  curated: () => [
    { id: 'fitness-default', name: 'Default fitness', intent: 'baseline', seed: { $domain: 'fitness', $name: 'fitness-default', genes: {} } },
    { id: 'fitness-bright', name: 'Bright fitness', intent: 'high-energy', seed: { $domain: 'fitness', $name: 'fitness-bright', genes: { energy: 0.9 } } },
    { id: 'fitness-quiet', name: 'Quiet fitness', intent: 'low-energy', seed: { $domain: 'fitness', $name: 'fitness-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'fitness-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateFitness(seed as any, out));
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
};
registerContract(FitnessQualityContract as any);
