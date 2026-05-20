/**
 * DroneDelivery Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateDroneDelivery } from './drone-delivery';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'drone-delivery'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const DroneDeliveryQualityContract: QualityContract<S, A, any> = {
  domain: 'drone-delivery',
  version: '1.0.0',
  curated: () => [
    { id: 'drone-delivery-default', name: 'Default drone-delivery', intent: 'baseline', seed: { $domain: 'drone-delivery', $name: 'drone-delivery-default', genes: {} } },
    { id: 'drone-delivery-bright', name: 'Bright drone-delivery', intent: 'high-energy', seed: { $domain: 'drone-delivery', $name: 'drone-delivery-bright', genes: { energy: 0.9 } } },
    { id: 'drone-delivery-quiet', name: 'Quiet drone-delivery', intent: 'low-energy', seed: { $domain: 'drone-delivery', $name: 'drone-delivery-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'drone-delivery-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateDroneDelivery(seed as any, out));
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
registerContract(DroneDeliveryQualityContract as any);
