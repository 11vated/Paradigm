/**
 * Fashion Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateFashion } from './fashion';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'fashion'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath).digest('hex');
}

export const FashionQualityContract: QualityContract<S, A, any> = {
  domain: 'fashion',
  version: '1.0.0',
  curated: () => [
    { id: 'fashion-default', name: 'Default fashion', intent: 'baseline', seed: { $domain: 'fashion', $name: 'fashion-default', genes: {} } },
    { id: 'fashion-bright', name: 'Bright fashion', intent: 'high-energy', seed: { $domain: 'fashion', $name: 'fashion-bright', genes: { energy: 0.9 } } },
    { id: 'fashion-quiet', name: 'Quiet fashion', intent: 'low-energy', seed: { $domain: 'fashion', $name: 'fashion-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'fashion-'));
    try {
      const r: any = await withKernelClock(0, () => generateFashion(seed as any, dir));
      const primaryPath = r.jsonPath ?? r.patternPath ?? r.gltfPath;
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
  strata: ['form', 'culture'] as const,
  engineOwner: 'fashion engine custodian',
};
registerContract(FashionQualityContract);
