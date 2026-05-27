/**
 * RealEstate Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateRealEstate } from './real-estate';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'real-estate'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const RealEstateQualityContract: QualityContract<S, A, any> = {
  domain: 'real-estate',
  version: '1.0.0',
  curated: () => [
    { id: 'real-estate-default', name: 'Default real-estate', intent: 'baseline', seed: { $domain: 'real-estate', $name: 'real-estate-default', genes: {} } },
    { id: 'real-estate-bright', name: 'Bright real-estate', intent: 'high-energy', seed: { $domain: 'real-estate', $name: 'real-estate-bright', genes: { energy: 0.9 } } },
    { id: 'real-estate-quiet', name: 'Quiet real-estate', intent: 'low-energy', seed: { $domain: 'real-estate', $name: 'real-estate-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'real-estate-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateRealEstate(seed as any, out));
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
  strata: ['world', 'culture'] as const,
  engineOwner: 'real-estate engine custodian',
};
registerContract(RealEstateQualityContract);
