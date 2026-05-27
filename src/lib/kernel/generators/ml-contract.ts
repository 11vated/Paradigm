/**
 * ML Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateML } from './ml';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'ml'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const MLQualityContract: QualityContract<S, A, any> = {
  domain: 'ml',
  version: '1.0.0',
  curated: () => [
    { id: 'ml-default', name: 'Default ml', intent: 'baseline', seed: { $domain: 'ml', $name: 'ml-default', genes: {} } },
    { id: 'ml-bright', name: 'Bright ml', intent: 'high-energy', seed: { $domain: 'ml', $name: 'ml-bright', genes: { energy: 0.9 } } },
    { id: 'ml-quiet', name: 'Quiet ml', intent: 'low-energy', seed: { $domain: 'ml', $name: 'ml-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ml-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateML(seed as any, out));
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
  strata: ['mind'] as const,
  engineOwner: 'ml engine custodian',
};
registerContract(MLQualityContract);
