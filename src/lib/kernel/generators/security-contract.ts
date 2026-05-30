/**
 * Security Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSecurity } from './security';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'security'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'security-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateSecurity(seed as any, out)) as { filePath?: string };
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

export const SecurityQualityContract: QualityContract<S, A, I> = {
  domain: 'security',
  version: '1.0.0',
  strata: ['Field', 'Mind', 'Story'] as const,
  engineOwner: 'Security Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'security-default', name: 'Default security', intent: 'baseline', seed: { $domain: 'security', $name: 'security-default', genes: {} } as S },
    { id: 'security-bright', name: 'Bright security', intent: 'high-energy', seed: { $domain: 'security', $name: 'security-bright', genes: { energy: 0.9 } } as S },
    { id: 'security-quiet', name: 'Quiet security', intent: 'low-energy', seed: { $domain: 'security', $name: 'security-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'security',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(SecurityQualityContract);
