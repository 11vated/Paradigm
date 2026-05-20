/**
 * Construction Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateConstruction } from './construction';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'construction'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ConstructionQualityContract: QualityContract<S, A, any> = {
  domain: 'construction',
  version: '1.0.0',
  curated: () => [
    { id: 'construction-default', name: 'Default construction', intent: 'baseline', seed: { $domain: 'construction', $name: 'construction-default', genes: {} } },
    { id: 'construction-bright', name: 'Bright construction', intent: 'high-energy', seed: { $domain: 'construction', $name: 'construction-bright', genes: { energy: 0.9 } } },
    { id: 'construction-quiet', name: 'Quiet construction', intent: 'low-energy', seed: { $domain: 'construction', $name: 'construction-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'construction-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateConstruction(seed as any, out));
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
registerContract(ConstructionQualityContract as any);
