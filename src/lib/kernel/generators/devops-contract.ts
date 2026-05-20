/**
 * Devops Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateDevOps } from './devops';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'devops'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const DevopsQualityContract: QualityContract<S, A, any> = {
  domain: 'devops',
  version: '1.0.0',
  curated: () => [
    { id: 'devops-default', name: 'Default devops', intent: 'baseline', seed: { $domain: 'devops', $name: 'devops-default', genes: {} } },
    { id: 'devops-bright', name: 'Bright devops', intent: 'high-energy', seed: { $domain: 'devops', $name: 'devops-bright', genes: { energy: 0.9 } } },
    { id: 'devops-quiet', name: 'Quiet devops', intent: 'low-energy', seed: { $domain: 'devops', $name: 'devops-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'devops-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateDevOps(seed as any, out));
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
registerContract(DevopsQualityContract as any);
