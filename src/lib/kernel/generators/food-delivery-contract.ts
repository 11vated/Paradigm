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
interface A {
  filePath: string;
  meta: any;
  previewData?: string;
  structuredData?: any;
  summary?: string;
  metrics?: Record<string, number>;
  visual?: {
    type: 'json' | 'html' | 'svg' | 'text' | 'structured';
    previewData?: string;
    structuredData?: any;
    summary?: string;
    metrics?: Record<string, number>;
  };
  emergent_assets?: {
    preview?: {
      type: 'json' | 'svg' | 'text' | 'structured';
      data?: any;
      path?: string;
    };
    networkPath?: string;
  };
}

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
    let parsed: any = {};
    try { parsed = JSON.parse(data); } catch { /* fallback */ }
    const summary = `Food delivery ${parsed.foodDelivery?.serviceType || r.serviceType || 'service'} ${parsed.foodDelivery?.dailyOrders || '?'} orders/day. Efficiency: ${parsed.performance?.efficiency?.toFixed?.(2) || 'n/a'}`;
    const metrics: Record<string, number> = {
      dailyOrders: parsed.foodDelivery?.dailyOrders || 0,
      coverage: parsed.foodDelivery?.coverage || 0,
      efficiency: parsed.performance?.efficiency || 0
    };
    const previewData = data;
    return {
      filePath: data,
      meta: { networkPath: r.networkPath, serviceType: r.serviceType },
      previewData,
      structuredData: parsed,
      summary,
      metrics,
      visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
      emergent_assets: {
        preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: filePath },
        networkPath: r.networkPath
      }
    };
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
