/**
 * Nanobot Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateNanobot } from './nanobot';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'nanobot'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const NanobotQualityContract: QualityContract<S, A, any> = {
  domain: 'nanobot',
  version: '1.0.0',
  curated: () => [
    { id: 'nanobot-default', name: 'Default nanobot', intent: 'baseline', seed: { $domain: 'nanobot', $name: 'nanobot-default', genes: {} } },
    { id: 'nanobot-bright', name: 'Bright nanobot', intent: 'high-energy', seed: { $domain: 'nanobot', $name: 'nanobot-bright', genes: { energy: 0.9 } } },
    { id: 'nanobot-quiet', name: 'Quiet nanobot', intent: 'low-energy', seed: { $domain: 'nanobot', $name: 'nanobot-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'nanobot-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateNanobot(seed as any, out));
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
registerContract(NanobotQualityContract as any);
