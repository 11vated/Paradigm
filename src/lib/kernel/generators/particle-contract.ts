/**
 * Particle Quality Contract.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateParticle } from './particle';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface ParticleSeed { $domain: 'particle'; $name?: string; genes: any }
interface ParticleArtifact { filePath: string; meta: { particleCount?: number; emitterCount?: number } }

function hashArtifact(a: ParticleArtifact): string {
  return crypto.createHash('sha256').update(a.filePath).digest('hex');
}

export const ParticleQualityContract: QualityContract<ParticleSeed, ParticleArtifact, any> = {
  domain: 'particle',
  version: '1.0.0',
  curated: () => [
    { id: 'particle-default', name: 'Default particle', intent: 'baseline', seed: { $domain: 'particle', $name: 'particle-default', genes: {} } },
    { id: 'particle-bright', name: 'Bright particle', intent: 'high-energy', seed: { $domain: 'particle', $name: 'particle-bright', genes: { energy: 0.9 } } },
    { id: 'particle-quiet', name: 'Quiet particle', intent: 'low-energy', seed: { $domain: 'particle', $name: 'particle-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'particle-'));
    try {
      const r: any = await withKernelClock(0, () => generateParticle(seed as any, dir));
      const primaryPath = r.jsonPath ?? r.htmlPath;
      const data = primaryPath
        ? await fs.readFile(primaryPath, 'utf-8').catch(async () => (await fs.readFile(primaryPath)).toString('base64'))
        : '';
      return { filePath: data, meta: { ...r, filePath: undefined } };
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
};
registerContract(ParticleQualityContract as any);
