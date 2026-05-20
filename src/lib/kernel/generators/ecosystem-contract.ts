/**
 * Ecosystem Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateEcosystem } from './ecosystem';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'ecosystem'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const EcosystemQualityContract: QualityContract<S, A, any> = {
  domain: 'ecosystem',
  version: '1.0.0',
  curated: () => [
    { id: 'ecosystem-default', name: 'Default ecosystem', intent: 'baseline', seed: { $domain: 'ecosystem', $name: 'ecosystem-default', genes: {} } },
    { id: 'ecosystem-bright', name: 'Bright ecosystem', intent: 'high-energy', seed: { $domain: 'ecosystem', $name: 'ecosystem-bright', genes: { energy: 0.9 } } },
    { id: 'ecosystem-quiet', name: 'Quiet ecosystem', intent: 'low-energy', seed: { $domain: 'ecosystem', $name: 'ecosystem-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ecosystem-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateEcosystem(seed as any, out));
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
registerContract(EcosystemQualityContract as any);
