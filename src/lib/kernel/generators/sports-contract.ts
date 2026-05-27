/**
 * Sports Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSports } from './sports';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'sports'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const SportsQualityContract: QualityContract<S, A, any> = {
  domain: 'sports',
  version: '1.0.0',
  curated: () => [
    { id: 'sports-default', name: 'Default sports', intent: 'baseline', seed: { $domain: 'sports', $name: 'sports-default', genes: {} } },
    { id: 'sports-bright', name: 'Bright sports', intent: 'high-energy', seed: { $domain: 'sports', $name: 'sports-bright', genes: { energy: 0.9 } } },
    { id: 'sports-quiet', name: 'Quiet sports', intent: 'low-energy', seed: { $domain: 'sports', $name: 'sports-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sports-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateSports(seed as any, out));
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
  strata: ['motion', 'culture'] as const,
  engineOwner: 'sports engine custodian',
};
registerContract(SportsQualityContract);
