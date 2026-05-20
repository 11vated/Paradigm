/**
 * Metaverse Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMetaverse } from './metaverse';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'metaverse'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const MetaverseQualityContract: QualityContract<S, A, any> = {
  domain: 'metaverse',
  version: '1.0.0',
  curated: () => [
    { id: 'metaverse-default', name: 'Default metaverse', intent: 'baseline', seed: { $domain: 'metaverse', $name: 'metaverse-default', genes: {} } },
    { id: 'metaverse-bright', name: 'Bright metaverse', intent: 'high-energy', seed: { $domain: 'metaverse', $name: 'metaverse-bright', genes: { energy: 0.9 } } },
    { id: 'metaverse-quiet', name: 'Quiet metaverse', intent: 'low-energy', seed: { $domain: 'metaverse', $name: 'metaverse-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'metaverse-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateMetaverse(seed as any, out));
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
registerContract(MetaverseQualityContract as any);
