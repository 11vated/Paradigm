/**
 * Security Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSecurity } from './security';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'security'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const SecurityQualityContract: QualityContract<S, A, any> = {
  domain: 'security',
  version: '1.0.0',
  curated: () => [
    { id: 'security-default', name: 'Default security', intent: 'baseline', seed: { $domain: 'security', $name: 'security-default', genes: {} } },
    { id: 'security-bright', name: 'Bright security', intent: 'high-energy', seed: { $domain: 'security', $name: 'security-bright', genes: { energy: 0.9 } } },
    { id: 'security-quiet', name: 'Quiet security', intent: 'low-energy', seed: { $domain: 'security', $name: 'security-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'security-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateSecurity(seed as any, out));
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
  engineOwner: 'security engine custodian',
};
registerContract(SecurityQualityContract);
