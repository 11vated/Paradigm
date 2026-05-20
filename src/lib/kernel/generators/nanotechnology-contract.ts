/**
 * Nanotechnology Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateNanotechnology } from './nanotechnology';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'nanotechnology'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const NanotechnologyQualityContract: QualityContract<S, A, any> = {
  domain: 'nanotechnology',
  version: '1.0.0',
  curated: () => [
    { id: 'nanotechnology-default', name: 'Default nanotechnology', intent: 'baseline', seed: { $domain: 'nanotechnology', $name: 'nanotechnology-default', genes: {} } },
    { id: 'nanotechnology-bright', name: 'Bright nanotechnology', intent: 'high-energy', seed: { $domain: 'nanotechnology', $name: 'nanotechnology-bright', genes: { energy: 0.9 } } },
    { id: 'nanotechnology-quiet', name: 'Quiet nanotechnology', intent: 'low-energy', seed: { $domain: 'nanotechnology', $name: 'nanotechnology-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'nanotechnology-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateNanotechnology(seed as any, out));
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
registerContract(NanotechnologyQualityContract as any);
