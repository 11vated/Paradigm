/**
 * Jewelry Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateJewelry } from './jewelry';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'jewelry'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const JewelryQualityContract: QualityContract<S, A, any> = {
  domain: 'jewelry',
  version: '1.0.0',
  curated: () => [
    { id: 'jewelry-default', name: 'Default jewelry', intent: 'baseline', seed: { $domain: 'jewelry', $name: 'jewelry-default', genes: {} } },
    { id: 'jewelry-bright', name: 'Bright jewelry', intent: 'high-energy', seed: { $domain: 'jewelry', $name: 'jewelry-bright', genes: { energy: 0.9 } } },
    { id: 'jewelry-quiet', name: 'Quiet jewelry', intent: 'low-energy', seed: { $domain: 'jewelry', $name: 'jewelry-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'jewelry-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateJewelry(seed as any, out));
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
registerContract(JewelryQualityContract as any);
