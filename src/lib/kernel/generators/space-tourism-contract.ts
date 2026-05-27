/**
 * SpaceTourism Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSpaceTourism } from './space-tourism';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'space-tourism'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const SpaceTourismQualityContract: QualityContract<S, A, any> = {
  domain: 'space-tourism',
  version: '1.0.0',
  curated: () => [
    { id: 'space-tourism-default', name: 'Default space-tourism', intent: 'baseline', seed: { $domain: 'space-tourism', $name: 'space-tourism-default', genes: {} } },
    { id: 'space-tourism-bright', name: 'Bright space-tourism', intent: 'high-energy', seed: { $domain: 'space-tourism', $name: 'space-tourism-bright', genes: { energy: 0.9 } } },
    { id: 'space-tourism-quiet', name: 'Quiet space-tourism', intent: 'low-energy', seed: { $domain: 'space-tourism', $name: 'space-tourism-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'space-tourism-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateSpaceTourism(seed as any, out));
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
  strata: ['world', 'motion'] as const,
  engineOwner: 'space-tourism engine custodian',
};
registerContract(SpaceTourismQualityContract);
