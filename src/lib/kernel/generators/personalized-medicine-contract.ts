/**
 * PersonalizedMedicine Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generatePersonalizedMedicine } from './personalized-medicine';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'personalized-medicine'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const PersonalizedMedicineQualityContract: QualityContract<S, A, any> = {
  domain: 'personalized-medicine',
  version: '1.0.0',
  curated: () => [
    { id: 'personalized-medicine-default', name: 'Default personalized-medicine', intent: 'baseline', seed: { $domain: 'personalized-medicine', $name: 'personalized-medicine-default', genes: {} } },
    { id: 'personalized-medicine-bright', name: 'Bright personalized-medicine', intent: 'high-energy', seed: { $domain: 'personalized-medicine', $name: 'personalized-medicine-bright', genes: { energy: 0.9 } } },
    { id: 'personalized-medicine-quiet', name: 'Quiet personalized-medicine', intent: 'low-energy', seed: { $domain: 'personalized-medicine', $name: 'personalized-medicine-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'personalized-medicine-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generatePersonalizedMedicine(seed as any, out));
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
registerContract(PersonalizedMedicineQualityContract as any);
