/**
 * Energy Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateEnergy } from './energy';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'energy'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const EnergyQualityContract: QualityContract<S, A, any> = {
  domain: 'energy',
  version: '1.0.0',
  curated: () => [
    { id: 'energy-default', name: 'Default energy', intent: 'baseline', seed: { $domain: 'energy', $name: 'energy-default', genes: {} } },
    { id: 'energy-bright', name: 'Bright energy', intent: 'high-energy', seed: { $domain: 'energy', $name: 'energy-bright', genes: { energy: 0.9 } } },
    { id: 'energy-quiet', name: 'Quiet energy', intent: 'low-energy', seed: { $domain: 'energy', $name: 'energy-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'energy-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateEnergy(seed as any, out));
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
  engineOwner: 'energy engine custodian',
};
registerContract(EnergyQualityContract);
