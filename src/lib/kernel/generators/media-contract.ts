/**
 * Media Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMedia } from './media';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'media'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'media-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateMedia(seed as any, out)) as { filePath?: string };
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

export const MediaQualityContract: QualityContract<S, A, I> = {
  domain: 'media',
  version: '1.0.0',
  strata: ['Form', 'Story', 'Sound', 'Culture'] as const,
  engineOwner: 'Media Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'media-default', name: 'Default media', intent: 'baseline', seed: { $domain: 'media', $name: 'media-default', genes: {} } as S },
    { id: 'media-bright', name: 'Bright media', intent: 'high-energy', seed: { $domain: 'media', $name: 'media-bright', genes: { energy: 0.9 } } as S },
    { id: 'media-quiet', name: 'Quiet media', intent: 'low-energy', seed: { $domain: 'media', $name: 'media-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'media',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(MediaQualityContract);
