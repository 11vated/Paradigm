/**
 * Coffee Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateCoffee } from './coffee';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'coffee'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const CoffeeQualityContract: QualityContract<S, A, any> = {
  domain: 'coffee',
  version: '1.0.0',
  curated: () => [
    { id: 'coffee-default', name: 'Default coffee', intent: 'baseline', seed: { $domain: 'coffee', $name: 'coffee-default', genes: {} } },
    { id: 'coffee-bright', name: 'Bright coffee', intent: 'high-energy', seed: { $domain: 'coffee', $name: 'coffee-bright', genes: { energy: 0.9 } } },
    { id: 'coffee-quiet', name: 'Quiet coffee', intent: 'low-energy', seed: { $domain: 'coffee', $name: 'coffee-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'coffee-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateCoffee(seed as any, out));
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

  // Doctrine v2 Part VI.10 — declared strata for the Substrate Conformance Index.
  strata: ['culture'] as const,
  engineOwner: 'coffee engine custodian',
};
registerContract(CoffeeQualityContract);
