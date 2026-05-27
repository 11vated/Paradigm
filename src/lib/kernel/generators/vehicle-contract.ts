/**
 * Vehicle Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateVehicle } from './vehicle';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'vehicle'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const VehicleQualityContract: QualityContract<S, A, any> = {
  domain: 'vehicle',
  version: '1.0.0',
  curated: () => [
    { id: 'vehicle-default', name: 'Default vehicle', intent: 'baseline', seed: { $domain: 'vehicle', $name: 'vehicle-default', genes: {} } },
    { id: 'vehicle-bright', name: 'Bright vehicle', intent: 'high-energy', seed: { $domain: 'vehicle', $name: 'vehicle-bright', genes: { energy: 0.9 } } },
    { id: 'vehicle-quiet', name: 'Quiet vehicle', intent: 'low-energy', seed: { $domain: 'vehicle', $name: 'vehicle-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vehicle-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateVehicle(seed as any, out));
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
  strata: ['form', 'motion'] as const,
  engineOwner: 'vehicle engine custodian',
};
registerContract(VehicleQualityContract);
