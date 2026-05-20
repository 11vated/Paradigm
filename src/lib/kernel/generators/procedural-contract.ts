/**
 * Procedural Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateProcedural } from './procedural';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'procedural'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ProceduralQualityContract: QualityContract<S, A, any> = {
  domain: 'procedural',
  version: '1.0.0',
  curated: () => [
    { id: 'procedural-default', name: 'Default procedural', intent: 'baseline', seed: { $domain: 'procedural', $name: 'procedural-default', genes: {} } },
    { id: 'procedural-bright', name: 'Bright procedural', intent: 'high-energy', seed: { $domain: 'procedural', $name: 'procedural-bright', genes: { energy: 0.9 } } },
    { id: 'procedural-quiet', name: 'Quiet procedural', intent: 'low-energy', seed: { $domain: 'procedural', $name: 'procedural-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'procedural-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateProcedural(seed as any, out));
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
registerContract(ProceduralQualityContract as any);
