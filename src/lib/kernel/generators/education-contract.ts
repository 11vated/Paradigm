/**
 * Education Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateEducation } from './education';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'education'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const EducationQualityContract: QualityContract<S, A, any> = {
  domain: 'education',
  version: '1.0.0',
  curated: () => [
    { id: 'education-default', name: 'Default education', intent: 'baseline', seed: { $domain: 'education', $name: 'education-default', genes: {} } },
    { id: 'education-bright', name: 'Bright education', intent: 'high-energy', seed: { $domain: 'education', $name: 'education-bright', genes: { energy: 0.9 } } },
    { id: 'education-quiet', name: 'Quiet education', intent: 'low-energy', seed: { $domain: 'education', $name: 'education-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'education-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateEducation(seed as any, out));
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
  strata: ['mind', 'culture'] as const,
  engineOwner: 'education engine custodian',
};
registerContract(EducationQualityContract);
