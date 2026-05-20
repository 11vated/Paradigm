/**
 * Visual2DSVG Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateVisual2DSVG } from './visual2d-svg';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'visual2d-svg'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const Visual2DSVGQualityContract: QualityContract<S, A, any> = {
  domain: 'visual2d-svg',
  version: '1.0.0',
  curated: () => [
    { id: 'visual2d-svg-default', name: 'Default visual2d-svg', intent: 'baseline', seed: { $domain: 'visual2d-svg', $name: 'visual2d-svg-default', genes: {} } },
    { id: 'visual2d-svg-bright', name: 'Bright visual2d-svg', intent: 'high-energy', seed: { $domain: 'visual2d-svg', $name: 'visual2d-svg-bright', genes: { energy: 0.9 } } },
    { id: 'visual2d-svg-quiet', name: 'Quiet visual2d-svg', intent: 'low-energy', seed: { $domain: 'visual2d-svg', $name: 'visual2d-svg-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'visual2d-svg-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateVisual2DSVG(seed as any, out));
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
registerContract(Visual2DSVGQualityContract as any);
