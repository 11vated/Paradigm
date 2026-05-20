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
interface ParticleArtifact { filePath: string; meta: any }

function hashArtifact(a: ParticleArtifact): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
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
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateParticle(seed as any, out));
    const filePath = r.filePath ?? out;
    const data = await fs.readFile(filePath, 'utf-8').catch(async () => (await fs.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: { ...r, filePath: undefined } };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
};
registerContract(ParticleQualityContract as any);
