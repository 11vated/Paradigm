/**
 * Wearables Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateWearables } from './wearables';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'wearables'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const WearablesQualityContract: QualityContract<S, A, any> = {
  domain: 'wearables',
  version: '1.0.0',
  curated: () => [
    { id: 'wearables-default', name: 'Default wearables', intent: 'baseline', seed: { $domain: 'wearables', $name: 'wearables-default', genes: {} } },
    { id: 'wearables-bright', name: 'Bright wearables', intent: 'high-energy', seed: { $domain: 'wearables', $name: 'wearables-bright', genes: { energy: 0.9 } } },
    { id: 'wearables-quiet', name: 'Quiet wearables', intent: 'low-energy', seed: { $domain: 'wearables', $name: 'wearables-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'wearables-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateWearables(seed as any, out));
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
registerContract(WearablesQualityContract as any);
