/**
 * City Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateCity } from './city';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'city'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const CityQualityContract: QualityContract<S, A, any> = {
  domain: 'city',
  version: '1.0.0',
  curated: () => [
    { id: 'city-default', name: 'Default city', intent: 'baseline', seed: { $domain: 'city', $name: 'city-default', genes: {} } },
    { id: 'city-bright', name: 'Bright city', intent: 'high-energy', seed: { $domain: 'city', $name: 'city-bright', genes: { energy: 0.9 } } },
    { id: 'city-quiet', name: 'Quiet city', intent: 'low-energy', seed: { $domain: 'city', $name: 'city-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'city-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateCity(seed as any, out));
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
  strata: ['world', 'form', 'culture'] as const,
  engineOwner: 'city engine custodian',
};
registerContract(CityQualityContract);
