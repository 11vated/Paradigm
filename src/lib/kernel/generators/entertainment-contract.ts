/**
 * Entertainment Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateEntertainment } from './entertainment';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'entertainment'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const EntertainmentQualityContract: QualityContract<S, A, any> = {
  domain: 'entertainment',
  version: '1.0.0',
  curated: () => [
    { id: 'entertainment-default', name: 'Default entertainment', intent: 'baseline', seed: { $domain: 'entertainment', $name: 'entertainment-default', genes: {} } },
    { id: 'entertainment-bright', name: 'Bright entertainment', intent: 'high-energy', seed: { $domain: 'entertainment', $name: 'entertainment-bright', genes: { energy: 0.9 } } },
    { id: 'entertainment-quiet', name: 'Quiet entertainment', intent: 'low-energy', seed: { $domain: 'entertainment', $name: 'entertainment-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'entertainment-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateEntertainment(seed as any, out));
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
registerContract(EntertainmentQualityContract as any);
