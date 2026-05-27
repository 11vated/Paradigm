/**
 * Tourism Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateTourism } from './tourism';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'tourism'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const TourismQualityContract: QualityContract<S, A, any> = {
  domain: 'tourism',
  version: '1.0.0',
  curated: () => [
    { id: 'tourism-default', name: 'Default tourism', intent: 'baseline', seed: { $domain: 'tourism', $name: 'tourism-default', genes: {} } },
    { id: 'tourism-bright', name: 'Bright tourism', intent: 'high-energy', seed: { $domain: 'tourism', $name: 'tourism-bright', genes: { energy: 0.9 } } },
    { id: 'tourism-quiet', name: 'Quiet tourism', intent: 'low-energy', seed: { $domain: 'tourism', $name: 'tourism-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'tourism-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateTourism(seed as any, out));
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
  engineOwner: 'tourism engine custodian',
};
registerContract(TourismQualityContract);
