/**
 * Advertising Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAdvertising } from './advertising';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'advertising'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const AdvertisingQualityContract: QualityContract<S, A, any> = {
  domain: 'advertising',
  version: '1.0.0',
  curated: () => [
    { id: 'advertising-default', name: 'Default advertising', intent: 'baseline', seed: { $domain: 'advertising', $name: 'advertising-default', genes: {} } },
    { id: 'advertising-bright', name: 'Bright advertising', intent: 'high-energy', seed: { $domain: 'advertising', $name: 'advertising-bright', genes: { energy: 0.9 } } },
    { id: 'advertising-quiet', name: 'Quiet advertising', intent: 'low-energy', seed: { $domain: 'advertising', $name: 'advertising-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'advertising-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateAdvertising(seed as any, out));
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
  engineOwner: 'advertising engine custodian',
};
registerContract(AdvertisingQualityContract);
