/**
 * Optics Quality Contract.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateOptics } from './optics';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface OpticsSeed { $domain: 'optics'; $name?: string; genes: any }
interface OpticsArtifact { filePath: string; meta: any }

function hashArtifact(a: OpticsArtifact): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const OpticsQualityContract: QualityContract<OpticsSeed, OpticsArtifact, any> = {
  domain: 'optics',
  version: '1.0.0',
  curated: () => [
    { id: 'optics-default', name: 'Default optics', intent: 'baseline', seed: { $domain: 'optics', $name: 'optics-default', genes: {} } },
    { id: 'optics-bright', name: 'Bright optics', intent: 'high-energy', seed: { $domain: 'optics', $name: 'optics-bright', genes: { energy: 0.9 } } },
    { id: 'optics-quiet', name: 'Quiet optics', intent: 'low-energy', seed: { $domain: 'optics', $name: 'optics-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'optics-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateOptics(seed as any, out));
    const filePath = r.filePath ?? out;
    const data = await fs.readFile(filePath, 'utf-8').catch(async () => (await fs.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: { lensType: r.lensType } };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
};
registerContract(OpticsQualityContract as any);
