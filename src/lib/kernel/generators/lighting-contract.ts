/**
 * Lighting Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateLighting } from './lighting';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'lighting'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const LightingQualityContract: QualityContract<S, A, any> = {
  domain: 'lighting',
  version: '1.0.0',
  curated: () => [
    { id: 'lighting-default', name: 'Default lighting', intent: 'baseline', seed: { $domain: 'lighting', $name: 'lighting-default', genes: {} } },
    { id: 'lighting-bright', name: 'Bright lighting', intent: 'high-energy', seed: { $domain: 'lighting', $name: 'lighting-bright', genes: { energy: 0.9 } } },
    { id: 'lighting-quiet', name: 'Quiet lighting', intent: 'low-energy', seed: { $domain: 'lighting', $name: 'lighting-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'lighting-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateLighting(seed as any, out));
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
registerContract(LightingQualityContract as any);
