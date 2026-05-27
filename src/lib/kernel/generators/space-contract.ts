/**
 * Space Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSpace } from './space';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'space'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const SpaceQualityContract: QualityContract<S, A, any> = {
  domain: 'space',
  version: '1.0.0',
  curated: () => [
    { id: 'space-default', name: 'Default space', intent: 'baseline', seed: { $domain: 'space', $name: 'space-default', genes: {} } },
    { id: 'space-bright', name: 'Bright space', intent: 'high-energy', seed: { $domain: 'space', $name: 'space-bright', genes: { energy: 0.9 } } },
    { id: 'space-quiet', name: 'Quiet space', intent: 'low-energy', seed: { $domain: 'space', $name: 'space-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'space-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateSpace(seed as any, out));
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
  strata: ['world', 'form'] as const,
  engineOwner: 'space engine custodian',
};
registerContract(SpaceQualityContract);
