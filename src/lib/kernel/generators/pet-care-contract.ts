/**
 * PetCare Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generatePetCare } from './pet-care';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'pet-care'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const PetCareQualityContract: QualityContract<S, A, any> = {
  domain: 'pet-care',
  version: '1.0.0',
  curated: () => [
    { id: 'pet-care-default', name: 'Default pet-care', intent: 'baseline', seed: { $domain: 'pet-care', $name: 'pet-care-default', genes: {} } },
    { id: 'pet-care-bright', name: 'Bright pet-care', intent: 'high-energy', seed: { $domain: 'pet-care', $name: 'pet-care-bright', genes: { energy: 0.9 } } },
    { id: 'pet-care-quiet', name: 'Quiet pet-care', intent: 'low-energy', seed: { $domain: 'pet-care', $name: 'pet-care-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pet-care-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generatePetCare(seed as any, out));
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
registerContract(PetCareQualityContract as any);
