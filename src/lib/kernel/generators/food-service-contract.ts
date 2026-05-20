/**
 * FoodService Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateFoodService } from './food-service';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'food-service'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const FoodServiceQualityContract: QualityContract<S, A, any> = {
  domain: 'food-service',
  version: '1.0.0',
  curated: () => [
    { id: 'food-service-default', name: 'Default food-service', intent: 'baseline', seed: { $domain: 'food-service', $name: 'food-service-default', genes: {} } },
    { id: 'food-service-bright', name: 'Bright food-service', intent: 'high-energy', seed: { $domain: 'food-service', $name: 'food-service-bright', genes: { energy: 0.9 } } },
    { id: 'food-service-quiet', name: 'Quiet food-service', intent: 'low-energy', seed: { $domain: 'food-service', $name: 'food-service-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'food-service-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateFoodService(seed as any, out));
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
registerContract(FoodServiceQualityContract as any);
