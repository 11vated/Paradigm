/**
 * Protein Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateProtein } from './protein';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'protein'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ProteinQualityContract: QualityContract<S, A, any> = {
  domain: 'protein',
  version: '1.0.0',
  curated: () => [
    { id: 'protein-default', name: 'Default protein', intent: 'baseline', seed: { $domain: 'protein', $name: 'protein-default', genes: {} } },
    { id: 'protein-bright', name: 'Bright protein', intent: 'high-energy', seed: { $domain: 'protein', $name: 'protein-bright', genes: { energy: 0.9 } } },
    { id: 'protein-quiet', name: 'Quiet protein', intent: 'low-energy', seed: { $domain: 'protein', $name: 'protein-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'protein-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateProtein(seed as any, out));
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
registerContract(ProteinQualityContract as any);
