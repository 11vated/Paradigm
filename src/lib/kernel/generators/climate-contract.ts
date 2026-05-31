/**
 * Climate Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateClimate } from './climate';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'climate'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ClimateQualityContract: QualityContract<S, A, any> = {
  domain: 'climate',
  version: '1.0.0',
  curated: () => [
    { id: 'climate-default', name: 'Default climate', intent: 'baseline', seed: { $domain: 'climate', $name: 'climate-default', genes: {} } },
    { id: 'climate-bright', name: 'Bright climate', intent: 'high-energy', seed: { $domain: 'climate', $name: 'climate-bright', genes: { energy: 0.9 } } },
    { id: 'climate-quiet', name: 'Quiet climate', intent: 'low-energy', seed: { $domain: 'climate', $name: 'climate-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'climate-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateClimate(seed, out));
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
  strata: ['World', 'Field', 'Time'] as const,
  engineOwner: 'Climate Engine',
  manifest() {
    return {
      domain: 'climate',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(ClimateQualityContract);
