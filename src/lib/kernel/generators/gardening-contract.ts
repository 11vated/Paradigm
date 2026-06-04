/**
 * Gardening Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateGardening } from './gardening';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'gardening'; $name?: string; genes: any }
interface A {
  filePath: string;
  meta: any;
  previewData?: string;
  visual?: {
    type: 'json' | 'html' | 'svg' | 'text';
    previewData?: string;
  };
  emergent_assets?: {
    preview?: {
      type: 'json' | 'svg' | 'text';
      data?: string;
      path?: string;
    };
  };
}

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const GardeningQualityContract: QualityContract<S, A, any> = {
  domain: 'gardening',
  version: '1.0.0',
  curated: () => [
    { id: 'gardening-default', name: 'Default gardening', intent: 'baseline', seed: { $domain: 'gardening', $name: 'gardening-default', genes: {} } },
    { id: 'gardening-bright', name: 'Bright gardening', intent: 'high-energy', seed: { $domain: 'gardening', $name: 'gardening-bright', genes: { energy: 0.9 } } },
    { id: 'gardening-quiet', name: 'Quiet gardening', intent: 'low-energy', seed: { $domain: 'gardening', $name: 'gardening-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'gardening-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateGardening(seed, out));
    const filePath = r.filePath ?? out;
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    const previewData = data;
    return {
      filePath: data,
      meta: {},
      previewData,
      visual: { type: 'json', previewData },
      emergent_assets: {
        preview: { type: 'json', data: previewData, path: filePath }
      }
    };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
  strata: ['Form', 'World', 'Field'] as const,
  engineOwner: 'Gardening Engine',
  manifest() {
    return {
      domain: 'gardening',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(GardeningQualityContract);
