/**
 * Neuroscience Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateNeuroscience } from './neuroscience';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'neuroscience'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const NeuroscienceQualityContract: QualityContract<S, A, any> = {
  domain: 'neuroscience',
  version: '1.0.0',
  curated: () => [
    { id: 'neuroscience-default', name: 'Default neuroscience', intent: 'baseline', seed: { $domain: 'neuroscience', $name: 'neuroscience-default', genes: {} } },
    { id: 'neuroscience-bright', name: 'Bright neuroscience', intent: 'high-energy', seed: { $domain: 'neuroscience', $name: 'neuroscience-bright', genes: { energy: 0.9 } } },
    { id: 'neuroscience-quiet', name: 'Quiet neuroscience', intent: 'low-energy', seed: { $domain: 'neuroscience', $name: 'neuroscience-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'neuroscience-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateNeuroscience(seed as any, out));
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
registerContract(NeuroscienceQualityContract as any);
