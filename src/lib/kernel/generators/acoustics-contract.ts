/**
 * Acoustics Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateAcoustics } from './acoustics';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'acoustics'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const AcousticsQualityContract: QualityContract<S, A, any> = {
  domain: 'acoustics',
  version: '1.0.0',
  curated: () => [
    { id: 'acoustics-default', name: 'Default acoustics', intent: 'baseline', seed: { $domain: 'acoustics', $name: 'acoustics-default', genes: {} } },
    { id: 'acoustics-bright', name: 'Bright acoustics', intent: 'high-energy', seed: { $domain: 'acoustics', $name: 'acoustics-bright', genes: { energy: 0.9 } } },
    { id: 'acoustics-quiet', name: 'Quiet acoustics', intent: 'low-energy', seed: { $domain: 'acoustics', $name: 'acoustics-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'acoustics-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateAcoustics(seed as any, out));
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
registerContract(AcousticsQualityContract as any);
