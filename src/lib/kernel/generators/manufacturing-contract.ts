/**
 * Manufacturing Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateManufacturing } from './manufacturing';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'manufacturing'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ManufacturingQualityContract: QualityContract<S, A, any> = {
  domain: 'manufacturing',
  version: '1.0.0',
  curated: () => [
    { id: 'manufacturing-default', name: 'Default manufacturing', intent: 'baseline', seed: { $domain: 'manufacturing', $name: 'manufacturing-default', genes: {} } },
    { id: 'manufacturing-bright', name: 'Bright manufacturing', intent: 'high-energy', seed: { $domain: 'manufacturing', $name: 'manufacturing-bright', genes: { energy: 0.9 } } },
    { id: 'manufacturing-quiet', name: 'Quiet manufacturing', intent: 'low-energy', seed: { $domain: 'manufacturing', $name: 'manufacturing-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'manufacturing-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateManufacturing(seed as any, out));
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
registerContract(ManufacturingQualityContract as any);
