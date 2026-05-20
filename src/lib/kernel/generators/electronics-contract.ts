/**
 * Electronics Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateElectronics } from './electronics';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'electronics'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ElectronicsQualityContract: QualityContract<S, A, any> = {
  domain: 'electronics',
  version: '1.0.0',
  curated: () => [
    { id: 'electronics-default', name: 'Default electronics', intent: 'baseline', seed: { $domain: 'electronics', $name: 'electronics-default', genes: {} } },
    { id: 'electronics-bright', name: 'Bright electronics', intent: 'high-energy', seed: { $domain: 'electronics', $name: 'electronics-bright', genes: { energy: 0.9 } } },
    { id: 'electronics-quiet', name: 'Quiet electronics', intent: 'low-energy', seed: { $domain: 'electronics', $name: 'electronics-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'electronics-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateElectronics(seed as any, out));
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
registerContract(ElectronicsQualityContract as any);
