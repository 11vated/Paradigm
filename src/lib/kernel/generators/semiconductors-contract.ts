/**
 * Semiconductors Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSemiconductors } from './semiconductors';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'semiconductors'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const SemiconductorsQualityContract: QualityContract<S, A, any> = {
  domain: 'semiconductors',
  version: '1.0.0',
  curated: () => [
    { id: 'semiconductors-default', name: 'Default semiconductors', intent: 'baseline', seed: { $domain: 'semiconductors', $name: 'semiconductors-default', genes: {} } },
    { id: 'semiconductors-bright', name: 'Bright semiconductors', intent: 'high-energy', seed: { $domain: 'semiconductors', $name: 'semiconductors-bright', genes: { energy: 0.9 } } },
    { id: 'semiconductors-quiet', name: 'Quiet semiconductors', intent: 'low-energy', seed: { $domain: 'semiconductors', $name: 'semiconductors-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'semiconductors-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateSemiconductors(seed as any, out));
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
registerContract(SemiconductorsQualityContract as any);
