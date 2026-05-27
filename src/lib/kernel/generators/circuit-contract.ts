/**
 * Circuit Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateCircuit } from './circuit';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'circuit'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const CircuitQualityContract: QualityContract<S, A, any> = {
  domain: 'circuit',
  version: '1.0.0',
  curated: () => [
    { id: 'circuit-default', name: 'Default circuit', intent: 'baseline', seed: { $domain: 'circuit', $name: 'circuit-default', genes: {} } },
    { id: 'circuit-bright', name: 'Bright circuit', intent: 'high-energy', seed: { $domain: 'circuit', $name: 'circuit-bright', genes: { energy: 0.9 } } },
    { id: 'circuit-quiet', name: 'Quiet circuit', intent: 'low-energy', seed: { $domain: 'circuit', $name: 'circuit-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'circuit-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateCircuit(seed as any, out));
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
  strata: ['form', 'field'] as const,
  engineOwner: 'circuit engine custodian',
};
registerContract(CircuitQualityContract);
