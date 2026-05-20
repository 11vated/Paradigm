/**
 * Spirits Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSpirits } from './spirits';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'spirits'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const SpiritsQualityContract: QualityContract<S, A, any> = {
  domain: 'spirits',
  version: '1.0.0',
  curated: () => [
    { id: 'spirits-default', name: 'Default spirits', intent: 'baseline', seed: { $domain: 'spirits', $name: 'spirits-default', genes: {} } },
    { id: 'spirits-bright', name: 'Bright spirits', intent: 'high-energy', seed: { $domain: 'spirits', $name: 'spirits-bright', genes: { energy: 0.9 } } },
    { id: 'spirits-quiet', name: 'Quiet spirits', intent: 'low-energy', seed: { $domain: 'spirits', $name: 'spirits-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'spirits-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateSpirits(seed as any, out));
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
registerContract(SpiritsQualityContract as any);
