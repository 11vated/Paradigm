/**
 * Vr Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateVR } from './vr';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'vr'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const VrQualityContract: QualityContract<S, A, any> = {
  domain: 'vr',
  version: '1.0.0',
  curated: () => [
    { id: 'vr-default', name: 'Default vr', intent: 'baseline', seed: { $domain: 'vr', $name: 'vr-default', genes: {} } },
    { id: 'vr-bright', name: 'Bright vr', intent: 'high-energy', seed: { $domain: 'vr', $name: 'vr-bright', genes: { energy: 0.9 } } },
    { id: 'vr-quiet', name: 'Quiet vr', intent: 'low-energy', seed: { $domain: 'vr', $name: 'vr-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vr-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateVR(seed as any, out));
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
registerContract(VrQualityContract as any);
