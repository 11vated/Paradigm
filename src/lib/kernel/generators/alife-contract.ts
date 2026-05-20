/**
 * Alife Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAlife } from './alife';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'alife'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const AlifeQualityContract: QualityContract<S, A, any> = {
  domain: 'alife',
  version: '1.0.0',
  curated: () => [
    { id: 'alife-default', name: 'Default alife', intent: 'baseline', seed: { $domain: 'alife', $name: 'alife-default', genes: {} } },
    { id: 'alife-bright', name: 'Bright alife', intent: 'high-energy', seed: { $domain: 'alife', $name: 'alife-bright', genes: { energy: 0.9 } } },
    { id: 'alife-quiet', name: 'Quiet alife', intent: 'low-energy', seed: { $domain: 'alife', $name: 'alife-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'alife-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateAlife(seed as any, out));
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
registerContract(AlifeQualityContract as any);
