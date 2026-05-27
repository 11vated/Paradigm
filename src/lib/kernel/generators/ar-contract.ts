/**
 * AR Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAR } from './ar';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'ar'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ARQualityContract: QualityContract<S, A, any> = {
  domain: 'ar',
  version: '1.0.0',
  curated: () => [
    { id: 'ar-default', name: 'Default ar', intent: 'baseline', seed: { $domain: 'ar', $name: 'ar-default', genes: {} } },
    { id: 'ar-bright', name: 'Bright ar', intent: 'high-energy', seed: { $domain: 'ar', $name: 'ar-bright', genes: { energy: 0.9 } } },
    { id: 'ar-quiet', name: 'Quiet ar', intent: 'low-energy', seed: { $domain: 'ar', $name: 'ar-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ar-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateAR(seed as any, out));
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
  strata: ['form', 'world'] as const,
  engineOwner: 'ar engine custodian',
};
registerContract(ARQualityContract);
