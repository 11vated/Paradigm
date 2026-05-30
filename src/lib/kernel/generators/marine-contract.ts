/**
 * Marine Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMarine } from './marine';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'marine'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'marine-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateMarine(seed as any, out)) as { filePath?: string };
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

export const MarineQualityContract: QualityContract<S, A, I> = {
  domain: 'marine',
  version: '1.0.0',
  strata: ['World', 'Form', 'Field'] as const,
  engineOwner: 'Marine / Ocean Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'marine-default', name: 'Default marine', intent: 'baseline', seed: { $domain: 'marine', $name: 'marine-default', genes: {} } as S },
    { id: 'marine-bright', name: 'Bright marine', intent: 'high-energy', seed: { $domain: 'marine', $name: 'marine-bright', genes: { energy: 0.9 } } as S },
    { id: 'marine-quiet', name: 'Quiet marine', intent: 'low-energy', seed: { $domain: 'marine', $name: 'marine-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'marine',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(MarineQualityContract);
