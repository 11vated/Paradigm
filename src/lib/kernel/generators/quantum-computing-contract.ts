/**
 * QuantumComputing Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateQuantumComputing } from './quantum-computing';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'quantum-computing'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const QuantumComputingQualityContract: QualityContract<S, A, any> = {
  domain: 'quantum-computing',
  version: '1.0.0',
  curated: () => [
    { id: 'quantum-computing-default', name: 'Default quantum-computing', intent: 'baseline', seed: { $domain: 'quantum-computing', $name: 'quantum-computing-default', genes: {} } },
    { id: 'quantum-computing-bright', name: 'Bright quantum-computing', intent: 'high-energy', seed: { $domain: 'quantum-computing', $name: 'quantum-computing-bright', genes: { energy: 0.9 } } },
    { id: 'quantum-computing-quiet', name: 'Quiet quantum-computing', intent: 'low-energy', seed: { $domain: 'quantum-computing', $name: 'quantum-computing-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'quantum-computing-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateQuantumComputing(seed as any, out));
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
  strata: ['field', 'mind'] as const,
  engineOwner: 'quantum-computing engine custodian',
};
registerContract(QuantumComputingQualityContract);
