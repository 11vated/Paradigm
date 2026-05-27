/**
 * Textiles Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateTextiles } from './textiles';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'textiles'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const TextilesQualityContract: QualityContract<S, A, any> = {
  domain: 'textiles',
  version: '1.0.0',
  curated: () => [
    { id: 'textiles-default', name: 'Default textiles', intent: 'baseline', seed: { $domain: 'textiles', $name: 'textiles-default', genes: {} } },
    { id: 'textiles-bright', name: 'Bright textiles', intent: 'high-energy', seed: { $domain: 'textiles', $name: 'textiles-bright', genes: { energy: 0.9 } } },
    { id: 'textiles-quiet', name: 'Quiet textiles', intent: 'low-energy', seed: { $domain: 'textiles', $name: 'textiles-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'textiles-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateTextiles(seed as any, out));
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
  engineOwner: 'textiles engine custodian',
};
registerContract(TextilesQualityContract);
