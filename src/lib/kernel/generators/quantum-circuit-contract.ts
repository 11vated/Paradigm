/**
 * QuantumCircuit Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateQuantumCircuit } from './quantum-circuit';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'quantum-circuit'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const QuantumCircuitQualityContract: QualityContract<S, A, any> = {
  domain: 'quantum-circuit',
  version: '1.0.0',
  curated: () => [
    { id: 'quantum-circuit-default', name: 'Default quantum-circuit', intent: 'baseline', seed: { $domain: 'quantum-circuit', $name: 'quantum-circuit-default', genes: {} } },
    { id: 'quantum-circuit-bright', name: 'Bright quantum-circuit', intent: 'high-energy', seed: { $domain: 'quantum-circuit', $name: 'quantum-circuit-bright', genes: { energy: 0.9 } } },
    { id: 'quantum-circuit-quiet', name: 'Quiet quantum-circuit', intent: 'low-energy', seed: { $domain: 'quantum-circuit', $name: 'quantum-circuit-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'quantum-circuit-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateQuantumCircuit(seed as any, out));
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
  engineOwner: 'quantum-circuit engine custodian',
};
registerContract(QuantumCircuitQualityContract);
