/**
 * Tea Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateTea } from './tea';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'tea'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const TeaQualityContract: QualityContract<S, A, any> = {
  domain: 'tea',
  version: '1.0.0',
  curated: () => [
    { id: 'tea-default', name: 'Default tea', intent: 'baseline', seed: { $domain: 'tea', $name: 'tea-default', genes: {} } },
    { id: 'tea-bright', name: 'Bright tea', intent: 'high-energy', seed: { $domain: 'tea', $name: 'tea-bright', genes: { energy: 0.9 } } },
    { id: 'tea-quiet', name: 'Quiet tea', intent: 'low-energy', seed: { $domain: 'tea', $name: 'tea-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'tea-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateTea(seed as any, out));
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
registerContract(TeaQualityContract as any);
