/**
 * Marine Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMarine } from './marine';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'marine'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const MarineQualityContract: QualityContract<S, A, any> = {
  domain: 'marine',
  version: '1.0.0',
  curated: () => [
    { id: 'marine-default', name: 'Default marine', intent: 'baseline', seed: { $domain: 'marine', $name: 'marine-default', genes: {} } },
    { id: 'marine-bright', name: 'Bright marine', intent: 'high-energy', seed: { $domain: 'marine', $name: 'marine-bright', genes: { energy: 0.9 } } },
    { id: 'marine-quiet', name: 'Quiet marine', intent: 'low-energy', seed: { $domain: 'marine', $name: 'marine-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'marine-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateMarine(seed as any, out));
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
  engineOwner: 'marine engine custodian',
};
registerContract(MarineQualityContract);
