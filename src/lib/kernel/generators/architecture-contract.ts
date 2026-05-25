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
interface A { filePath: string; meta: { floorCount?: number; roomCount?: number } }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath).digest('hex');
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
    try {
      const r: any = await withKernelClock(0, () => generateArchitecture(seed as any, dir));
      const primaryPath = r.jsonPath ?? r.floorplanPath ?? r.gltfPath;
      const data = primaryPath
        ? await fsp.readFile(primaryPath, 'utf-8').catch(async () => (await fsp.readFile(primaryPath)).toString('base64'))
        : '';
      return { filePath: data, meta: { ...r } };
    } finally {
      await fsp.rm(dir, { recursive: true, force: true });
    }
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
};
registerContract(ArchitectureQualityContract as any);
