/**
 * SyntheticBiology Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSyntheticBiology } from './synthetic-biology';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'synthetic-biology'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const SyntheticBiologyQualityContract: QualityContract<S, A, any> = {
  domain: 'synthetic-biology',
  version: '1.0.0',
  curated: () => [
    { id: 'synthetic-biology-default', name: 'Default synthetic-biology', intent: 'baseline', seed: { $domain: 'synthetic-biology', $name: 'synthetic-biology-default', genes: {} } },
    { id: 'synthetic-biology-bright', name: 'Bright synthetic-biology', intent: 'high-energy', seed: { $domain: 'synthetic-biology', $name: 'synthetic-biology-bright', genes: { energy: 0.9 } } },
    { id: 'synthetic-biology-quiet', name: 'Quiet synthetic-biology', intent: 'low-energy', seed: { $domain: 'synthetic-biology', $name: 'synthetic-biology-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'synthetic-biology-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateSyntheticBiology(seed as any, out));
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
  engineOwner: 'synthetic-biology engine custodian',
};
registerContract(SyntheticBiologyQualityContract);
