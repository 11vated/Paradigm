/**
 * Legal Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateLegal } from './legal';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'legal'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const LegalQualityContract: QualityContract<S, A, any> = {
  domain: 'legal',
  version: '1.0.0',
  curated: () => [
    { id: 'legal-default', name: 'Default legal', intent: 'baseline', seed: { $domain: 'legal', $name: 'legal-default', genes: {} } },
    { id: 'legal-bright', name: 'Bright legal', intent: 'high-energy', seed: { $domain: 'legal', $name: 'legal-bright', genes: { energy: 0.9 } } },
    { id: 'legal-quiet', name: 'Quiet legal', intent: 'low-energy', seed: { $domain: 'legal', $name: 'legal-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'legal-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateLegal(seed as any, out));
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
registerContract(LegalQualityContract as any);
