/**
 * Biotechnology Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateBiotechnology } from './biotechnology';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'biotechnology'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const BiotechnologyQualityContract: QualityContract<S, A, any> = {
  domain: 'biotechnology',
  version: '1.0.0',
  curated: () => [
    { id: 'biotechnology-default', name: 'Default biotechnology', intent: 'baseline', seed: { $domain: 'biotechnology', $name: 'biotechnology-default', genes: {} } },
    { id: 'biotechnology-bright', name: 'Bright biotechnology', intent: 'high-energy', seed: { $domain: 'biotechnology', $name: 'biotechnology-bright', genes: { energy: 0.9 } } },
    { id: 'biotechnology-quiet', name: 'Quiet biotechnology', intent: 'low-energy', seed: { $domain: 'biotechnology', $name: 'biotechnology-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'biotechnology-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateBiotechnology(seed as any, out));
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
  strata: ['form'] as const,
  engineOwner: 'biotechnology engine custodian',
};
registerContract(BiotechnologyQualityContract);
