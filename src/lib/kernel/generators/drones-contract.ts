/**
 * Drones Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateDrones } from './drones';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'drones'; $name?: string; genes: any }
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

export const DronesQualityContract: QualityContract<S, A, any> = {
  domain: 'drones',
  version: '1.0.0',
  curated: () => [
    { id: 'drones-default', name: 'Default drones', intent: 'baseline', seed: { $domain: 'drones', $name: 'drones-default', genes: {} } },
    { id: 'drones-bright', name: 'Bright drones', intent: 'high-energy', seed: { $domain: 'drones', $name: 'drones-bright', genes: { energy: 0.9 } } },
    { id: 'drones-quiet', name: 'Quiet drones', intent: 'low-energy', seed: { $domain: 'drones', $name: 'drones-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'drones-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateDrones(seed, out));
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
  strata: ['Form', 'Motion', 'Field'] as const,
  engineOwner: 'Drones Engine',
  manifest() {
    return {
      domain: 'drones',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(DronesQualityContract);
