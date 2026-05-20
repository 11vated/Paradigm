/**
 * SmartGrid Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSmartGrid } from './smart-grid';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'smart-grid'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const SmartGridQualityContract: QualityContract<S, A, any> = {
  domain: 'smart-grid',
  version: '1.0.0',
  curated: () => [
    { id: 'smart-grid-default', name: 'Default smart-grid', intent: 'baseline', seed: { $domain: 'smart-grid', $name: 'smart-grid-default', genes: {} } },
    { id: 'smart-grid-bright', name: 'Bright smart-grid', intent: 'high-energy', seed: { $domain: 'smart-grid', $name: 'smart-grid-bright', genes: { energy: 0.9 } } },
    { id: 'smart-grid-quiet', name: 'Quiet smart-grid', intent: 'low-energy', seed: { $domain: 'smart-grid', $name: 'smart-grid-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-grid-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateSmartGrid(seed as any, out));
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
registerContract(SmartGridQualityContract as any);
