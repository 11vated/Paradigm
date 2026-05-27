/**
 * Insurance Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateInsurance } from './insurance';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'insurance'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const InsuranceQualityContract: QualityContract<S, A, any> = {
  domain: 'insurance',
  version: '1.0.0',
  curated: () => [
    { id: 'insurance-default', name: 'Default insurance', intent: 'baseline', seed: { $domain: 'insurance', $name: 'insurance-default', genes: {} } },
    { id: 'insurance-bright', name: 'Bright insurance', intent: 'high-energy', seed: { $domain: 'insurance', $name: 'insurance-bright', genes: { energy: 0.9 } } },
    { id: 'insurance-quiet', name: 'Quiet insurance', intent: 'low-energy', seed: { $domain: 'insurance', $name: 'insurance-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'insurance-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateInsurance(seed as any, out));
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
  strata: ['culture'] as const,
  engineOwner: 'insurance engine custodian',
};
registerContract(InsuranceQualityContract);
