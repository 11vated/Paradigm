/**
 * InteriorDesign Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateInteriorDesign } from './interior-design';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'interior-design'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'interior-design-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateInteriorDesign(seed as any, out)) as { filePath?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  return { filePath: data, meta: {} };
}

function invert(a: A): I {
  return { size: a.filePath.length };
}

function rate(a: A): QualityReport {
  const score = a.filePath.length > 0 ? 0.9 : 0;
  return { score, axes: { hasOutput: score }, notes: [] };
}

export const InteriorDesignQualityContract: QualityContract<S, A, I> = {
  domain: 'interior-design',
  version: '1.0.0',
  strata: ['Form', 'World', 'Culture'] as const,
  engineOwner: 'Interior Design Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'interior-design-default', name: 'Default interior-design', intent: 'baseline', seed: { $domain: 'interior-design', $name: 'interior-design-default', genes: {} } as S },
    { id: 'interior-design-bright', name: 'Bright interior-design', intent: 'high-energy', seed: { $domain: 'interior-design', $name: 'interior-design-bright', genes: { energy: 0.9 } } as S },
    { id: 'interior-design-quiet', name: 'Quiet interior-design', intent: 'low-energy', seed: { $domain: 'interior-design', $name: 'interior-design-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'interior-design',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(InteriorDesignQualityContract);
