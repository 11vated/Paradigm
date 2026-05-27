/**
 * Genomics Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateGenomics } from './genomics';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'genomics'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const GenomicsQualityContract: QualityContract<S, A, any> = {
  domain: 'genomics',
  version: '1.0.0',
  curated: () => [
    { id: 'genomics-default', name: 'Default genomics', intent: 'baseline', seed: { $domain: 'genomics', $name: 'genomics-default', genes: {} } },
    { id: 'genomics-bright', name: 'Bright genomics', intent: 'high-energy', seed: { $domain: 'genomics', $name: 'genomics-bright', genes: { energy: 0.9 } } },
    { id: 'genomics-quiet', name: 'Quiet genomics', intent: 'low-energy', seed: { $domain: 'genomics', $name: 'genomics-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'genomics-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateGenomics(seed as any, out));
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
  strata: ['form'] as const,
  engineOwner: 'genomics engine custodian',
};
registerContract(GenomicsQualityContract);
