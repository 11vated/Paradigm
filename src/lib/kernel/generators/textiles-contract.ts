/**
 * Textiles Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateTextiles } from './textiles';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'textiles'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'textiles-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateTextiles(seed as any, out)) as { filePath?: string };
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

export const TextilesQualityContract: QualityContract<S, A, I> = {
  domain: 'textiles',
  version: '1.0.0',
  strata: ['Form', 'Culture'] as const,
  engineOwner: 'Textiles Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'textiles-default', name: 'Default textiles', intent: 'baseline', seed: { $domain: 'textiles', $name: 'textiles-default', genes: {} } as S },
    { id: 'textiles-bright', name: 'Bright textiles', intent: 'high-energy', seed: { $domain: 'textiles', $name: 'textiles-bright', genes: { energy: 0.9 } } as S },
    { id: 'textiles-quiet', name: 'Quiet textiles', intent: 'low-energy', seed: { $domain: 'textiles', $name: 'textiles-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'textiles',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(TextilesQualityContract);
