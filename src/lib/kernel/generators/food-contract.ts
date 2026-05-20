/**
 * Food Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateFood } from './food';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'food'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const FoodQualityContract: QualityContract<S, A, any> = {
  domain: 'food',
  version: '1.0.0',
  curated: () => [
    { id: 'food-default', name: 'Default food', intent: 'baseline', seed: { $domain: 'food', $name: 'food-default', genes: {} } },
    { id: 'food-bright', name: 'Bright food', intent: 'high-energy', seed: { $domain: 'food', $name: 'food-bright', genes: { energy: 0.9 } } },
    { id: 'food-quiet', name: 'Quiet food', intent: 'low-energy', seed: { $domain: 'food', $name: 'food-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'food-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateFood(seed as any, out));
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
registerContract(FoodQualityContract as any);
