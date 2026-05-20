/**
 * Fashion Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateFashion } from './fashion';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'fashion'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const FashionQualityContract: QualityContract<S, A, any> = {
  domain: 'fashion',
  version: '1.0.0',
  curated: () => [
    { id: 'fashion-default', name: 'Default fashion', intent: 'baseline', seed: { $domain: 'fashion', $name: 'fashion-default', genes: {} } },
    { id: 'fashion-bright', name: 'Bright fashion', intent: 'high-energy', seed: { $domain: 'fashion', $name: 'fashion-bright', genes: { energy: 0.9 } } },
    { id: 'fashion-quiet', name: 'Quiet fashion', intent: 'low-energy', seed: { $domain: 'fashion', $name: 'fashion-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'fashion-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateFashion(seed as any, out));
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
registerContract(FashionQualityContract as any);
