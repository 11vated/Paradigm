/**
 * Shader Quality Contract.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateShader } from './shader';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface ShaderSeed { $domain: 'shader'; $name?: string; genes: any }
interface ShaderArtifact { filePath: string; meta: { effectCount?: number } }

function hashArtifact(a: ShaderArtifact): string {
  return crypto.createHash('sha256').update(a.filePath).digest('hex');
}

export const ShaderQualityContract: QualityContract<ShaderSeed, ShaderArtifact, any> = {
  domain: 'shader',
  version: '1.0.0',
  curated: () => [
    { id: 'shader-default', name: 'Default shader', intent: 'baseline', seed: { $domain: 'shader', $name: 'shader-default', genes: {} } },
    { id: 'shader-bright', name: 'Bright shader', intent: 'high-energy', seed: { $domain: 'shader', $name: 'shader-bright', genes: { energy: 0.9 } } },
    { id: 'shader-quiet', name: 'Quiet shader', intent: 'low-energy', seed: { $domain: 'shader', $name: 'shader-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'shader-'));
    try {
      const r: any = await withKernelClock(0, () => generateShader(seed as any, dir));
      const primaryPath = r.glslPath ?? r.wgslPath ?? r.hlslPath;
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
registerContract(ShaderQualityContract as any);
