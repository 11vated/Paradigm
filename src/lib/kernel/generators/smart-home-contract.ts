/**
 * SmartHome Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSmartHome } from './smart-home';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'smart-home'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const SmartHomeQualityContract: QualityContract<S, A, any> = {
  domain: 'smart-home',
  version: '1.0.0',
  curated: () => [
    { id: 'smart-home-default', name: 'Default smart-home', intent: 'baseline', seed: { $domain: 'smart-home', $name: 'smart-home-default', genes: {} } },
    { id: 'smart-home-bright', name: 'Bright smart-home', intent: 'high-energy', seed: { $domain: 'smart-home', $name: 'smart-home-bright', genes: { energy: 0.9 } } },
    { id: 'smart-home-quiet', name: 'Quiet smart-home', intent: 'low-energy', seed: { $domain: 'smart-home', $name: 'smart-home-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-home-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateSmartHome(seed as any, out));
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
  strata: ['form', 'mind'] as const,
  engineOwner: 'smart-home engine custodian',
};
registerContract(SmartHomeQualityContract);
