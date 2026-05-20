/**
 * Universe Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateUniverse } from './universe';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'universe'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const UniverseQualityContract: QualityContract<S, A, any> = {
  domain: 'universe',
  version: '1.0.0',
  curated: () => [
    { id: 'universe-default', name: 'Default universe', intent: 'baseline', seed: { $domain: 'universe', $name: 'universe-default', genes: {} } },
    { id: 'universe-bright', name: 'Bright universe', intent: 'high-energy', seed: { $domain: 'universe', $name: 'universe-bright', genes: { energy: 0.9 } } },
    { id: 'universe-quiet', name: 'Quiet universe', intent: 'low-energy', seed: { $domain: 'universe', $name: 'universe-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'universe-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateUniverse(seed as any, out));
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
registerContract(UniverseQualityContract as any);
