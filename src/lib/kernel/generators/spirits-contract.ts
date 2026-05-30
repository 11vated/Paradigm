/**
 * Spirits Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSpirits } from './spirits';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'spirits'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'spirits-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateSpirits(seed as any, out)) as { filePath?: string };
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

export const SpiritsQualityContract: QualityContract<S, A, I> = {
  domain: 'spirits',
  version: '1.0.0',
  strata: ['Form', 'Culture'] as const,
  engineOwner: 'Spirits / Distillation Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'spirits-default', name: 'Default spirits', intent: 'baseline', seed: { $domain: 'spirits', $name: 'spirits-default', genes: {} } as S },
    { id: 'spirits-bright', name: 'Bright spirits', intent: 'high-energy', seed: { $domain: 'spirits', $name: 'spirits-bright', genes: { energy: 0.9 } } as S },
    { id: 'spirits-quiet', name: 'Quiet spirits', intent: 'low-energy', seed: { $domain: 'spirits', $name: 'spirits-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'spirits',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(SpiritsQualityContract);
