/**
 * Lighting Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateLighting } from './lighting';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'lighting'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'lighting-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateLighting(seed as any, out)) as { filePath?: string };
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

export const LightingQualityContract: QualityContract<S, A, I> = {
  domain: 'lighting',
  version: '1.0.0',
  strata: ['Form', 'Field', 'Mind'] as const,
  engineOwner: 'Lighting / Illumination Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'lighting-default', name: 'Default lighting', intent: 'baseline', seed: { $domain: 'lighting', $name: 'lighting-default', genes: {} } as S },
    { id: 'lighting-bright', name: 'Bright lighting', intent: 'high-energy', seed: { $domain: 'lighting', $name: 'lighting-bright', genes: { energy: 0.9 } } as S },
    { id: 'lighting-quiet', name: 'Quiet lighting', intent: 'low-energy', seed: { $domain: 'lighting', $name: 'lighting-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'lighting',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(LightingQualityContract);
