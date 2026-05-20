/**
 * Reactor Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateReactor } from './reactor';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'reactor'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ReactorQualityContract: QualityContract<S, A, any> = {
  domain: 'reactor',
  version: '1.0.0',
  curated: () => [
    { id: 'reactor-default', name: 'Default reactor', intent: 'baseline', seed: { $domain: 'reactor', $name: 'reactor-default', genes: {} } },
    { id: 'reactor-bright', name: 'Bright reactor', intent: 'high-energy', seed: { $domain: 'reactor', $name: 'reactor-bright', genes: { energy: 0.9 } } },
    { id: 'reactor-quiet', name: 'Quiet reactor', intent: 'low-energy', seed: { $domain: 'reactor', $name: 'reactor-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'reactor-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateReactor(seed as any, out));
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
registerContract(ReactorQualityContract as any);
