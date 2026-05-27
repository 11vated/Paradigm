/**
 * Marketing Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMarketing } from './marketing';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'marketing'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const MarketingQualityContract: QualityContract<S, A, any> = {
  domain: 'marketing',
  version: '1.0.0',
  curated: () => [
    { id: 'marketing-default', name: 'Default marketing', intent: 'baseline', seed: { $domain: 'marketing', $name: 'marketing-default', genes: {} } },
    { id: 'marketing-bright', name: 'Bright marketing', intent: 'high-energy', seed: { $domain: 'marketing', $name: 'marketing-bright', genes: { energy: 0.9 } } },
    { id: 'marketing-quiet', name: 'Quiet marketing', intent: 'low-energy', seed: { $domain: 'marketing', $name: 'marketing-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'marketing-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateMarketing(seed as any, out));
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
  engineOwner: 'marketing engine custodian',
};
registerContract(MarketingQualityContract);
