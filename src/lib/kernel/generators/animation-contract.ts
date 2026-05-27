/**
 * Animation Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAnimation } from './animation';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'animation'; $name?: string; genes: any }
interface A { filePath: string; meta: { duration?: number; frameCount?: number } }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath).digest('hex');
}

export const AnimationQualityContract: QualityContract<S, A, any> = {
  domain: 'animation',
  version: '1.0.0',
  curated: () => [
    { id: 'animation-default', name: 'Default animation', intent: 'baseline', seed: { $domain: 'animation', $name: 'animation-default', genes: {} } },
    { id: 'animation-bright', name: 'Bright animation', intent: 'high-energy', seed: { $domain: 'animation', $name: 'animation-bright', genes: { energy: 0.9 } } },
    { id: 'animation-quiet', name: 'Quiet animation', intent: 'low-energy', seed: { $domain: 'animation', $name: 'animation-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'animation-'));
    try {
      const r: any = await withKernelClock(0, () => generateAnimation(seed as any, dir));
      const primaryPath = r.gltfPath ?? r.jsonPath ?? r.mp4Path;
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

  // Doctrine v2 Part VI.10 — declared strata for the Substrate Conformance Index.
  strata: ['form', 'motion', 'time'] as const,
  engineOwner: 'animation engine custodian',
};
registerContract(AnimationQualityContract);
