/**
 * Photography Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generatePhotography } from './photography';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'photography'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const PhotographyQualityContract: QualityContract<S, A, any> = {
  domain: 'photography',
  version: '1.0.0',
  curated: () => [
    { id: 'photography-default', name: 'Default photography', intent: 'baseline', seed: { $domain: 'photography', $name: 'photography-default', genes: {} } },
    { id: 'photography-bright', name: 'Bright photography', intent: 'high-energy', seed: { $domain: 'photography', $name: 'photography-bright', genes: { energy: 0.9 } } },
    { id: 'photography-quiet', name: 'Quiet photography', intent: 'low-energy', seed: { $domain: 'photography', $name: 'photography-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'photography-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generatePhotography(seed as any, out));
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
  strata: ['form', 'culture'] as const,
  engineOwner: 'photography engine custodian',
};
registerContract(PhotographyQualityContract);
