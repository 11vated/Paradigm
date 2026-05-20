/**
 * Theater Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateTheater } from './theater';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'theater'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const TheaterQualityContract: QualityContract<S, A, any> = {
  domain: 'theater',
  version: '1.0.0',
  curated: () => [
    { id: 'theater-default', name: 'Default theater', intent: 'baseline', seed: { $domain: 'theater', $name: 'theater-default', genes: {} } },
    { id: 'theater-bright', name: 'Bright theater', intent: 'high-energy', seed: { $domain: 'theater', $name: 'theater-bright', genes: { energy: 0.9 } } },
    { id: 'theater-quiet', name: 'Quiet theater', intent: 'low-energy', seed: { $domain: 'theater', $name: 'theater-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'theater-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateTheater(seed as any, out));
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
registerContract(TheaterQualityContract as any);
