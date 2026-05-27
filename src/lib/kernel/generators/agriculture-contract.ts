/**
 * Agriculture Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAgriculture } from './agriculture';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'agriculture'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const AgricultureQualityContract: QualityContract<S, A, any> = {
  domain: 'agriculture',
  version: '1.0.0',
  curated: () => [
    { id: 'agriculture-default', name: 'Default agriculture', intent: 'baseline', seed: { $domain: 'agriculture', $name: 'agriculture-default', genes: {} } },
    { id: 'agriculture-bright', name: 'Bright agriculture', intent: 'high-energy', seed: { $domain: 'agriculture', $name: 'agriculture-bright', genes: { energy: 0.9 } } },
    { id: 'agriculture-quiet', name: 'Quiet agriculture', intent: 'low-energy', seed: { $domain: 'agriculture', $name: 'agriculture-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'agriculture-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateAgriculture(seed as any, out));
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
  strata: ['world'] as const,
  engineOwner: 'agriculture engine custodian',
};
registerContract(AgricultureQualityContract);
