/**
 * AV Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAV } from './av';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'av'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const AVQualityContract: QualityContract<S, A, any> = {
  domain: 'av',
  version: '1.0.0',
  curated: () => [
    { id: 'av-default', name: 'Default av', intent: 'baseline', seed: { $domain: 'av', $name: 'av-default', genes: {} } },
    { id: 'av-bright', name: 'Bright av', intent: 'high-energy', seed: { $domain: 'av', $name: 'av-bright', genes: { energy: 0.9 } } },
    { id: 'av-quiet', name: 'Quiet av', intent: 'low-energy', seed: { $domain: 'av', $name: 'av-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'av-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateAV(seed as any, out));
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
  strata: ['form', 'motion', 'mind'] as const,
  engineOwner: 'av engine custodian',
};
registerContract(AVQualityContract);
