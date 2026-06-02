/**
 * Tourism Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateTourism } from './tourism';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'tourism'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'tourism-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateTourism(seed as any, out)) as { filePath?: string; brochurePath?: string };
  const richPath = r.brochurePath ?? r.filePath ?? out;
  const data = await fsp.readFile(richPath, 'utf-8').catch(async () => (await fsp.readFile(richPath)).toString('base64'));
  return { filePath: data, meta: { brochurePath: richPath } };
}

function invert(a: A): I {
  return { size: a.filePath.length };
}

function rate(a: A): QualityReport {
  const content = typeof a.filePath === 'string' ? a.filePath : '';
  const len = content.length;
  const hasDays = /Day \d:/.test(content);
  const score = len > 2100 && hasDays ? 0.95 : (len > 900 ? 0.86 : 0.6);
  return { score, axes: { hasOutput: len > 0 ? 1 : 0, itineraryDepth: hasDays ? 0.94 : 0.45, length: Math.min(1, len / 3000) }, notes: [hasDays ? 'day-by-day rich' : ''] };
}

export const TourismQualityContract: QualityContract<S, A, I> = {
  domain: 'tourism',
  version: '1.0.0',
  strata: ['World', 'Story', 'Culture'] as const,
  engineOwner: 'Tourism Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'tourism-default', name: 'Default tourism', intent: 'baseline', seed: { $domain: 'tourism', $name: 'tourism-default', genes: {} } as S },
    { id: 'tourism-bright', name: 'Bright tourism', intent: 'high-energy', seed: { $domain: 'tourism', $name: 'tourism-bright', genes: { energy: 0.9 } } as S },
    { id: 'tourism-quiet', name: 'Quiet tourism', intent: 'low-energy', seed: { $domain: 'tourism', $name: 'tourism-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'tourism',
      version: '1.1.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      richArtifacts: ['brochurePath'],
      strata: ['World', 'Story', 'Culture'],
    };
  },
};
registerContract(TourismQualityContract);
