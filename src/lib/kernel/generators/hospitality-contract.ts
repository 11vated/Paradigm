/**
 * Hospitality Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateHospitality } from './hospitality';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'hospitality'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const HospitalityQualityContract: QualityContract<S, A, any> = {
  domain: 'hospitality',
  version: '1.0.0',
  curated: () => [
    { id: 'hospitality-default', name: 'Default hospitality', intent: 'baseline', seed: { $domain: 'hospitality', $name: 'hospitality-default', genes: {} } },
    { id: 'hospitality-bright', name: 'Bright hospitality', intent: 'high-energy', seed: { $domain: 'hospitality', $name: 'hospitality-bright', genes: { energy: 0.9 } } },
    { id: 'hospitality-quiet', name: 'Quiet hospitality', intent: 'low-energy', seed: { $domain: 'hospitality', $name: 'hospitality-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'hospitality-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateHospitality(seed as any, out));
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
registerContract(HospitalityQualityContract as any);
