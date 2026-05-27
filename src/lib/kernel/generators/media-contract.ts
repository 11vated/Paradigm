/**
 * Media Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMedia } from './media';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'media'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const MediaQualityContract: QualityContract<S, A, any> = {
  domain: 'media',
  version: '1.0.0',
  curated: () => [
    { id: 'media-default', name: 'Default media', intent: 'baseline', seed: { $domain: 'media', $name: 'media-default', genes: {} } },
    { id: 'media-bright', name: 'Bright media', intent: 'high-energy', seed: { $domain: 'media', $name: 'media-bright', genes: { energy: 0.9 } } },
    { id: 'media-quiet', name: 'Quiet media', intent: 'low-energy', seed: { $domain: 'media', $name: 'media-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'media-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateMedia(seed as any, out));
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
  strata: ['story', 'culture'] as const,
  engineOwner: 'media engine custodian',
};
registerContract(MediaQualityContract);
