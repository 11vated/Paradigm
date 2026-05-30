/**
 * ML Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateML } from './ml';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'ml'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ml-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateML(seed as any, out)) as { filePath?: string };
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

export const MLQualityContract: QualityContract<S, A, I> = {
  domain: 'ml',
  version: '1.0.0',
  strata: ['Mind', 'Field'] as const,
  engineOwner: 'Machine Learning Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'ml-default', name: 'Default ml', intent: 'baseline', seed: { $domain: 'ml', $name: 'ml-default', genes: {} } as S },
    { id: 'ml-bright', name: 'Bright ml', intent: 'high-energy', seed: { $domain: 'ml', $name: 'ml-bright', genes: { energy: 0.9 } } as S },
    { id: 'ml-quiet', name: 'Quiet ml', intent: 'low-energy', seed: { $domain: 'ml', $name: 'ml-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'ml',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(MLQualityContract);
