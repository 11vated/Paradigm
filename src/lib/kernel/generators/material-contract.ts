/**
 * Material Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMaterial } from './material';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'material'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const MaterialQualityContract: QualityContract<S, A, any> = {
  domain: 'material',
  version: '1.0.0',
  curated: () => [
    { id: 'material-default', name: 'Default material', intent: 'baseline', seed: { $domain: 'material', $name: 'material-default', genes: {} } },
    { id: 'material-bright', name: 'Bright material', intent: 'high-energy', seed: { $domain: 'material', $name: 'material-bright', genes: { energy: 0.9 } } },
    { id: 'material-quiet', name: 'Quiet material', intent: 'low-energy', seed: { $domain: 'material', $name: 'material-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'material-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateMaterial(seed as any, out));
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
  strata: ['form', 'field'] as const,
  engineOwner: 'material engine custodian',
};
registerContract(MaterialQualityContract);
