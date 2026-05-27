/**
 * RenewableEnergy Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateRenewableEnergy } from './renewable-energy';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'renewable-energy'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const RenewableEnergyQualityContract: QualityContract<S, A, any> = {
  domain: 'renewable-energy',
  version: '1.0.0',
  curated: () => [
    { id: 'renewable-energy-default', name: 'Default renewable-energy', intent: 'baseline', seed: { $domain: 'renewable-energy', $name: 'renewable-energy-default', genes: {} } },
    { id: 'renewable-energy-bright', name: 'Bright renewable-energy', intent: 'high-energy', seed: { $domain: 'renewable-energy', $name: 'renewable-energy-bright', genes: { energy: 0.9 } } },
    { id: 'renewable-energy-quiet', name: 'Quiet renewable-energy', intent: 'low-energy', seed: { $domain: 'renewable-energy', $name: 'renewable-energy-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'renewable-energy-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateRenewableEnergy(seed as any, out));
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
  strata: ['field'] as const,
  engineOwner: 'renewable-energy engine custodian',
};
registerContract(RenewableEnergyQualityContract);
