/**
 * Consciousness Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateConsciousness } from './consciousness';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'consciousness'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ConsciousnessQualityContract: QualityContract<S, A, any> = {
  domain: 'consciousness',
  version: '1.0.0',
  curated: () => [
    { id: 'consciousness-default', name: 'Default consciousness', intent: 'baseline', seed: { $domain: 'consciousness', $name: 'consciousness-default', genes: {} } },
    { id: 'consciousness-bright', name: 'Bright consciousness', intent: 'high-energy', seed: { $domain: 'consciousness', $name: 'consciousness-bright', genes: { energy: 0.9 } } },
    { id: 'consciousness-quiet', name: 'Quiet consciousness', intent: 'low-energy', seed: { $domain: 'consciousness', $name: 'consciousness-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'consciousness-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateConsciousness(seed as any, out));
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
  strata: ['mind'] as const,
  engineOwner: 'consciousness engine custodian',
};
registerContract(ConsciousnessQualityContract);
