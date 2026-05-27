/**
 * Literature Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateLiterature } from './literature';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'literature'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const LiteratureQualityContract: QualityContract<S, A, any> = {
  domain: 'literature',
  version: '1.0.0',
  curated: () => [
    { id: 'literature-default', name: 'Default literature', intent: 'baseline', seed: { $domain: 'literature', $name: 'literature-default', genes: {} } },
    { id: 'literature-bright', name: 'Bright literature', intent: 'high-energy', seed: { $domain: 'literature', $name: 'literature-bright', genes: { energy: 0.9 } } },
    { id: 'literature-quiet', name: 'Quiet literature', intent: 'low-energy', seed: { $domain: 'literature', $name: 'literature-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'literature-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateLiterature(seed as any, out));
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
  strata: ['story', 'culture'] as const,
  engineOwner: 'literature engine custodian',
};
registerContract(LiteratureQualityContract);
