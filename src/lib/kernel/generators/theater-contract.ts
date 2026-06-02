/**
 * Theater Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateTheater } from './theater';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'theater'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'theater-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateTheater(seed as any, out)) as { filePath?: string; playScriptPath?: string; scriptPath?: string };
  const richPath = r.playScriptPath ?? r.scriptPath ?? r.filePath ?? out;
  const data = await fsp.readFile(richPath, 'utf-8').catch(async () => (await fsp.readFile(richPath)).toString('base64'));
  return { filePath: data, meta: { playScriptPath: richPath } };
}

function invert(a: A): I {
  return { size: a.filePath.length };
}

function rate(a: A): QualityReport {
  const content = typeof a.filePath === 'string' ? a.filePath : '';
  const len = content.length;
  const hasActs = /ACT \d|SCENE \d|CURTAIN/.test(content);
  const score = len > 1800 && hasActs ? 0.95 : (len > 700 ? 0.85 : 0.55);
  return { score, axes: { hasOutput: len > 0 ? 1 : 0, dramaticStructure: hasActs ? 0.93 : 0.4, length: Math.min(1, len / 2600) }, notes: [hasActs ? 'full acts + dialogue' : ''] };
}

export const TheaterQualityContract: QualityContract<S, A, I> = {
  domain: 'theater',
  version: '1.0.0',
  strata: ['Story', 'Mind', 'Culture', 'Sound'] as const,
  engineOwner: 'Theater / Performance Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'theater-default', name: 'Default theater', intent: 'baseline', seed: { $domain: 'theater', $name: 'theater-default', genes: {} } as S },
    { id: 'theater-bright', name: 'Bright theater', intent: 'high-energy', seed: { $domain: 'theater', $name: 'theater-bright', genes: { energy: 0.9 } } as S },
    { id: 'theater-quiet', name: 'Quiet theater', intent: 'low-energy', seed: { $domain: 'theater', $name: 'theater-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'theater',
      version: '1.1.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      richArtifacts: ['playScriptPath', 'scriptPath'],
      strata: ['Story', 'Culture', 'Mind'],
    };
  },
};
registerContract(TheaterQualityContract);
