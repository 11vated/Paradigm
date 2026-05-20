/**
 * Edtech Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateEdTech } from './edtech';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'edtech'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const EdtechQualityContract: QualityContract<S, A, any> = {
  domain: 'edtech',
  version: '1.0.0',
  curated: () => [
    { id: 'edtech-default', name: 'Default edtech', intent: 'baseline', seed: { $domain: 'edtech', $name: 'edtech-default', genes: {} } },
    { id: 'edtech-bright', name: 'Bright edtech', intent: 'high-energy', seed: { $domain: 'edtech', $name: 'edtech-bright', genes: { energy: 0.9 } } },
    { id: 'edtech-quiet', name: 'Quiet edtech', intent: 'low-energy', seed: { $domain: 'edtech', $name: 'edtech-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'edtech-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateEdTech(seed as any, out));
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
registerContract(EdtechQualityContract as any);
