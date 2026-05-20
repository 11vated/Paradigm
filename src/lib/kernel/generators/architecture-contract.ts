/**
 * Architecture Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateArchitecture } from './architecture';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'architecture'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ArchitectureQualityContract: QualityContract<S, A, any> = {
  domain: 'architecture',
  version: '1.0.0',
  curated: () => [
    { id: 'architecture-default', name: 'Default architecture', intent: 'baseline', seed: { $domain: 'architecture', $name: 'architecture-default', genes: {} } },
    { id: 'architecture-bright', name: 'Bright architecture', intent: 'high-energy', seed: { $domain: 'architecture', $name: 'architecture-bright', genes: { energy: 0.9 } } },
    { id: 'architecture-quiet', name: 'Quiet architecture', intent: 'low-energy', seed: { $domain: 'architecture', $name: 'architecture-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'architecture-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateArchitecture(seed as any, out));
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
registerContract(ArchitectureQualityContract as any);
