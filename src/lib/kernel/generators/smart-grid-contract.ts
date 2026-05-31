/**
 * SmartGrid Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSmartGrid } from './smart-grid';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'smart-grid'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-grid-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateSmartGrid(seed as any, out)) as { filePath?: string };
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

export const SmartGridQualityContract: QualityContract<S, A, I> = {
  domain: 'smart-grid',
  version: '1.0.0',
  strata: ['Field', 'World'] as const,
  engineOwner: 'Smart Grid / Energy Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'smart-grid-default', name: 'Default smart-grid', intent: 'baseline', seed: { $domain: 'smart-grid', $name: 'smart-grid-default', genes: {} } as S },
    { id: 'smart-grid-bright', name: 'Bright smart-grid', intent: 'high-energy', seed: { $domain: 'smart-grid', $name: 'smart-grid-bright', genes: { energy: 0.9 } } as S },
    { id: 'smart-grid-quiet', name: 'Quiet smart-grid', intent: 'low-energy', seed: { $domain: 'smart-grid', $name: 'smart-grid-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'smart-grid',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(SmartGridQualityContract);
