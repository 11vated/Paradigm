/**
 * Typography Quality Contract.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateTypography } from './typography';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface TypographySeed { $domain: 'typography'; $name?: string; genes: any }
interface TypographyArtifact { filePath: string; meta: any }

function hashArtifact(a: TypographyArtifact): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const TypographyQualityContract: QualityContract<TypographySeed, TypographyArtifact, any> = {
  domain: 'typography',
  version: '1.0.0',
  curated: () => [
    { id: 'typography-default', name: 'Default typography', intent: 'baseline', seed: { $domain: 'typography', $name: 'typography-default', genes: {} } },
    { id: 'typography-bright', name: 'Bright typography', intent: 'high-energy', seed: { $domain: 'typography', $name: 'typography-bright', genes: { energy: 0.9 } } },
    { id: 'typography-quiet', name: 'Quiet typography', intent: 'low-energy', seed: { $domain: 'typography', $name: 'typography-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'typography-'));
    const out = path.join(dir, 'a.svg');
    const r: any = await withKernelClock(0, () => generateTypography(seed as any, out));
    const filePath = r.filePath ?? out;
    const data = await fs.readFile(filePath, 'utf-8').catch(async () => (await fs.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: { ...r, filePath: undefined } };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
};
registerContract(TypographyQualityContract as any);
