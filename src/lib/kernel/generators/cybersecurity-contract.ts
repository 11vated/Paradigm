/**
 * Cybersecurity Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateCybersecurity } from './cybersecurity';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'cybersecurity'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const CybersecurityQualityContract: QualityContract<S, A, any> = {
  domain: 'cybersecurity',
  version: '1.0.0',
  curated: () => [
    { id: 'cybersecurity-default', name: 'Default cybersecurity', intent: 'baseline', seed: { $domain: 'cybersecurity', $name: 'cybersecurity-default', genes: {} } },
    { id: 'cybersecurity-bright', name: 'Bright cybersecurity', intent: 'high-energy', seed: { $domain: 'cybersecurity', $name: 'cybersecurity-bright', genes: { energy: 0.9 } } },
    { id: 'cybersecurity-quiet', name: 'Quiet cybersecurity', intent: 'low-energy', seed: { $domain: 'cybersecurity', $name: 'cybersecurity-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'cybersecurity-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateCybersecurity(seed as any, out));
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
  engineOwner: 'cybersecurity engine custodian',
};
registerContract(CybersecurityQualityContract);
