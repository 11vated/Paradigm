/**
 * Retail Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateRetail } from './retail';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'retail'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const RetailQualityContract: QualityContract<S, A, any> = {
  domain: 'retail',
  version: '1.0.0',
  curated: () => [
    { id: 'retail-default', name: 'Default retail', intent: 'baseline', seed: { $domain: 'retail', $name: 'retail-default', genes: {} } },
    { id: 'retail-bright', name: 'Bright retail', intent: 'high-energy', seed: { $domain: 'retail', $name: 'retail-bright', genes: { energy: 0.9 } } },
    { id: 'retail-quiet', name: 'Quiet retail', intent: 'low-energy', seed: { $domain: 'retail', $name: 'retail-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'retail-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateRetail(seed as any, out));
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
registerContract(RetailQualityContract as any);
