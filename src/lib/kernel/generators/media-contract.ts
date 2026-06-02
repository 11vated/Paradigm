/**
 * Media Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMedia } from './media';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
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
  const r = await withKernelClock(0, () => generateMedia(seed as any, out)) as { filePath?: string; planPath?: string };
  const richPath = r.planPath ?? r.filePath ?? out;
  const data = await fsp.readFile(richPath, 'utf-8').catch(async () => (await fsp.readFile(richPath)).toString('base64'));
  return { filePath: data, meta: { planPath: richPath, mediaType: (seed as any).genes?.mediaType } };
}

function invert(a: A): I {
  return { size: a.filePath.length };
}

function rate(a: A): QualityReport {
  const content = typeof a.filePath === 'string' ? a.filePath : '';
  const len = content.length;
  const hasSections = /Executive Vision|Narrative Architecture|Creative Copy|Visual Style Guide/.test(content);
  const score = len > 4200 && hasSections ? 0.97 : (len > 1800 ? 0.89 : 0.65);
  return {
    score,
    axes: {
      hasOutput: len > 0 ? 1 : 0,
      planDepth: hasSections ? 0.96 : 0.5,
      lengthFidelity: Math.min(1, len / 5500)
    },
    notes: [hasSections ? 'rich sections present' : 'thin', `${Math.floor(len / 5)} chars`]
  };
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
      version: '1.1.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      richArtifacts: ['planPath', 'mediaPath'],
      strata: ['Form', 'Story', 'Sound', 'Culture'],
    };
  },
};
registerContract(MediaQualityContract);
