/**
 * FoodDelivery Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateFoodDelivery } from './food-delivery';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
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
    const r = await withKernelClock(0, () => generateFoodDelivery(seed, out));
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
  strata: ['Form', 'Field', 'Story'] as const,
  engineOwner: 'Food Delivery Engine',
  manifest() {
    return {
      domain: 'food-delivery',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(FoodDeliveryQualityContract);
