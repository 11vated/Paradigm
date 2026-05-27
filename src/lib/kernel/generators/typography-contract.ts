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
interface TypographyArtifact { filePath: string; meta: { glyphCount?: number } }

function hashArtifact(a: TypographyArtifact): string {
  return crypto.createHash('sha256').update(a.filePath).digest('hex');
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
    try {
      const r: any = await withKernelClock(0, () => generateTypography(seed as any, dir));
      const primaryPath = r.svgPath ?? r.htmlPath;
      const data = primaryPath
        ? await fs.readFile(primaryPath, 'utf-8').catch(async () => (await fs.readFile(primaryPath)).toString('base64'))
        : '';
      return { filePath: data, meta: { ...r, filePath: undefined } };
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,

  // Doctrine v2 Part VI.10 — declared strata for the Substrate Conformance Index.
  strata: ['form', 'culture'] as const,
  engineOwner: 'typography engine custodian',
};
registerContract(TypographyQualityContract);
