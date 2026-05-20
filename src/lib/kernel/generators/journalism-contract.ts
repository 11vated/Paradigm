/**
 * Journalism Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateJournalism } from './journalism';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'journalism'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const JournalismQualityContract: QualityContract<S, A, any> = {
  domain: 'journalism',
  version: '1.0.0',
  curated: () => [
    { id: 'journalism-default', name: 'Default journalism', intent: 'baseline', seed: { $domain: 'journalism', $name: 'journalism-default', genes: {} } },
    { id: 'journalism-bright', name: 'Bright journalism', intent: 'high-energy', seed: { $domain: 'journalism', $name: 'journalism-bright', genes: { energy: 0.9 } } },
    { id: 'journalism-quiet', name: 'Quiet journalism', intent: 'low-energy', seed: { $domain: 'journalism', $name: 'journalism-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'journalism-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateJournalism(seed as any, out));
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
registerContract(JournalismQualityContract as any);
