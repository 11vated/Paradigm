/**
 * Gaming Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateGaming } from './gaming';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'gaming'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const GamingQualityContract: QualityContract<S, A, any> = {
  domain: 'gaming',
  version: '1.0.0',
  curated: () => [
    { id: 'gaming-default', name: 'Default gaming', intent: 'baseline', seed: { $domain: 'gaming', $name: 'gaming-default', genes: {} } },
    { id: 'gaming-bright', name: 'Bright gaming', intent: 'high-energy', seed: { $domain: 'gaming', $name: 'gaming-bright', genes: { energy: 0.9 } } },
    { id: 'gaming-quiet', name: 'Quiet gaming', intent: 'low-energy', seed: { $domain: 'gaming', $name: 'gaming-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'gaming-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateGaming(seed as any, out));
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
registerContract(GamingQualityContract as any);
