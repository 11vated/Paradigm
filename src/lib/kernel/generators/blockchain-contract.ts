/**
 * Blockchain Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateBlockchain } from './blockchain';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'blockchain'; $name?: string; genes: any }
interface A { filePath: string; meta: any }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const BlockchainQualityContract: QualityContract<S, A, any> = {
  domain: 'blockchain',
  version: '1.0.0',
  curated: () => [
    { id: 'blockchain-default', name: 'Default blockchain', intent: 'baseline', seed: { $domain: 'blockchain', $name: 'blockchain-default', genes: {} } },
    { id: 'blockchain-bright', name: 'Bright blockchain', intent: 'high-energy', seed: { $domain: 'blockchain', $name: 'blockchain-bright', genes: { energy: 0.9 } } },
    { id: 'blockchain-quiet', name: 'Quiet blockchain', intent: 'low-energy', seed: { $domain: 'blockchain', $name: 'blockchain-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'blockchain-'));
    const out = path.join(dir, 'a.json');
    const r: any = await withKernelClock(0, () => generateBlockchain(seed as any, out));
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
registerContract(BlockchainQualityContract as any);
