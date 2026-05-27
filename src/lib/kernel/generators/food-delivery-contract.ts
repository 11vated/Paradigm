/**
 * FoodDelivery Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateFoodDelivery } from './food-delivery';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'food-delivery'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const FoodDeliveryQualityContract: QualityContract<S, A, any> = {
  domain: 'food-delivery',
  version: '1.0.0',
  curated: () => [
    { id: 'food-delivery-default', name: 'Default food-delivery', intent: 'baseline', seed: { $domain: 'food-delivery', $name: 'food-delivery-default', genes: {} } },
    { id: 'food-delivery-bright', name: 'Bright food-delivery', intent: 'high-energy', seed: { $domain: 'food-delivery', $name: 'food-delivery-bright', genes: { energy: 0.9 } } },
    { id: 'food-delivery-quiet', name: 'Quiet food-delivery', intent: 'low-energy', seed: { $domain: 'food-delivery', $name: 'food-delivery-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'food-delivery-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateFoodDelivery(seed as any, out));
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

  // Doctrine v2 Part VI.10 — declared strata for the Substrate Conformance Index.
  strata: ['motion', 'culture'] as const,
  engineOwner: 'food-delivery engine custodian',
};
registerContract(FoodDeliveryQualityContract);
