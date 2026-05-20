/**
 * Art Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateArt } from './art';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'art'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ArtQualityContract: QualityContract<S, A, any> = {
  domain: 'art',
  version: '1.0.0',
  curated: () => [
    { id: 'art-default', name: 'Default art', intent: 'baseline', seed: { $domain: 'art', $name: 'art-default', genes: {} } },
    { id: 'art-bright', name: 'Bright art', intent: 'high-energy', seed: { $domain: 'art', $name: 'art-bright', genes: { energy: 0.9 } } },
    { id: 'art-quiet', name: 'Quiet art', intent: 'low-energy', seed: { $domain: 'art', $name: 'art-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'art-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateArt(seed as any, out));
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
};
registerContract(ArtQualityContract as any);
