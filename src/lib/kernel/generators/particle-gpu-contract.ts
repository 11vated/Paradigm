/**
 * @deprecated Phase 2 Canonical Collapse (Doctrine v2)
 * Particle GPU contract sibling. Use primary particle.
 *
 * ParticleGpu Quality Contract — auto-generated stub (legacy).
 *
 * Adapter around `generateParticleGPU` exposing the canonical 4-clause
 * QualityContract surface. The rate() function is a placeholder pending
 * a domain-specific evaluator; the structure is correct and conformant.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateParticleGPU } from './particle-gpu';
import { registerContract, type QualityContract } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'particle-gpu'; $name?: string; genes: Record<string, unknown> }
interface A { filePath: string; meta: Record<string, unknown> }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ParticleGpuQualityContract: QualityContract<S, A, Record<string, unknown>> = {
  domain: 'particle-gpu',
  version: '1.0.0',
  curated: () => [
    { id: 'particle-gpu-default',  name: 'Default ParticleGpu',  intent: 'baseline', seed: { $domain: 'particle-gpu', $name: 'particle-gpu-default',  genes: {} } },
    { id: 'particle-gpu-variant-a', name: 'Variant A ParticleGpu', intent: 'variant',  seed: { $domain: 'particle-gpu', $name: 'particle-gpu-variant-a', genes: { intensity: 0.7 } } },
    { id: 'particle-gpu-variant-b', name: 'Variant B ParticleGpu', intent: 'variant',  seed: { $domain: 'particle-gpu', $name: 'particle-gpu-variant-b', genes: { intensity: 0.3 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'particle-gpu-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateParticleGPU(seed as never, out)) as { filePath?: string };
    const filePath = r.filePath ?? out;
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: {} };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.85 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
};
registerContract(ParticleGpuQualityContract as never);
