/**
 * Landscaping Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateLandscaping } from './landscaping';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'landscaping'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const LandscapingQualityContract: QualityContract<S, A, any> = {
  domain: 'landscaping',
  version: '1.0.0',
  curated: () => [
    { id: 'landscaping-default', name: 'Default landscaping', intent: 'baseline', seed: { $domain: 'landscaping', $name: 'landscaping-default', genes: {} } },
    { id: 'landscaping-bright', name: 'Bright landscaping', intent: 'high-energy', seed: { $domain: 'landscaping', $name: 'landscaping-bright', genes: { energy: 0.9 } } },
    { id: 'landscaping-quiet', name: 'Quiet landscaping', intent: 'low-energy', seed: { $domain: 'landscaping', $name: 'landscaping-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'landscaping-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateLandscaping(seed as any, out));
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
registerContract(LandscapingQualityContract as any);
