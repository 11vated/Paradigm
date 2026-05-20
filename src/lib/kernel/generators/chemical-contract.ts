/**
 * Chemical Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateChemical } from './chemical';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'chemical'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ChemicalQualityContract: QualityContract<S, A, any> = {
  domain: 'chemical',
  version: '1.0.0',
  curated: () => [
    { id: 'chemical-default', name: 'Default chemical', intent: 'baseline', seed: { $domain: 'chemical', $name: 'chemical-default', genes: {} } },
    { id: 'chemical-bright', name: 'Bright chemical', intent: 'high-energy', seed: { $domain: 'chemical', $name: 'chemical-bright', genes: { energy: 0.9 } } },
    { id: 'chemical-quiet', name: 'Quiet chemical', intent: 'low-energy', seed: { $domain: 'chemical', $name: 'chemical-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'chemical-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateChemical(seed as any, out));
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
};
registerContract(ChemicalQualityContract as any);
