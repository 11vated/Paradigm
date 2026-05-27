/**
 * Transportation Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateTransportation } from './transportation';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'transportation'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const TransportationQualityContract: QualityContract<S, A, any> = {
  domain: 'transportation',
  version: '1.0.0',
  curated: () => [
    { id: 'transportation-default', name: 'Default transportation', intent: 'baseline', seed: { $domain: 'transportation', $name: 'transportation-default', genes: {} } },
    { id: 'transportation-bright', name: 'Bright transportation', intent: 'high-energy', seed: { $domain: 'transportation', $name: 'transportation-bright', genes: { energy: 0.9 } } },
    { id: 'transportation-quiet', name: 'Quiet transportation', intent: 'low-energy', seed: { $domain: 'transportation', $name: 'transportation-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'transportation-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateTransportation(seed as any, out));
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
  strata: ['motion', 'world'] as const,
  engineOwner: 'transportation engine custodian',
};
registerContract(TransportationQualityContract);
