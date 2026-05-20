/**
 * Choreography Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateChoreography } from './choreography';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'choreography'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ChoreographyQualityContract: QualityContract<S, A, any> = {
  domain: 'choreography',
  version: '1.0.0',
  curated: () => [
    { id: 'choreography-default', name: 'Default choreography', intent: 'baseline', seed: { $domain: 'choreography', $name: 'choreography-default', genes: {} } },
    { id: 'choreography-bright', name: 'Bright choreography', intent: 'high-energy', seed: { $domain: 'choreography', $name: 'choreography-bright', genes: { energy: 0.9 } } },
    { id: 'choreography-quiet', name: 'Quiet choreography', intent: 'low-energy', seed: { $domain: 'choreography', $name: 'choreography-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'choreography-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateChoreography(seed as any, out));
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
registerContract(ChoreographyQualityContract as any);
