/**
 * Cosmetics Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateCosmetics } from './cosmetics';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'cosmetics'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const CosmeticsQualityContract: QualityContract<S, A, any> = {
  domain: 'cosmetics',
  version: '1.0.0',
  curated: () => [
    { id: 'cosmetics-default', name: 'Default cosmetics', intent: 'baseline', seed: { $domain: 'cosmetics', $name: 'cosmetics-default', genes: {} } },
    { id: 'cosmetics-bright', name: 'Bright cosmetics', intent: 'high-energy', seed: { $domain: 'cosmetics', $name: 'cosmetics-bright', genes: { energy: 0.9 } } },
    { id: 'cosmetics-quiet', name: 'Quiet cosmetics', intent: 'low-energy', seed: { $domain: 'cosmetics', $name: 'cosmetics-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'cosmetics-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateCosmetics(seed as any, out));
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
  engineOwner: 'cosmetics engine custodian',
};
registerContract(CosmeticsQualityContract);
