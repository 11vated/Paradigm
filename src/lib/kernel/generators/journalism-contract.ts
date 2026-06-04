/**
 * Journalism Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateJournalism } from './journalism';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'journalism'; $name?: string; genes?: Record<string, unknown> }
interface A {
  filePath: string;
  meta?: Record<string, unknown>;
  previewData?: string;
  visual?: {
    type: 'text' | 'html' | 'json';
    previewData?: string;
  };
  emergent_assets?: {
    preview?: {
      type: 'text' | 'html' | 'json';
      data?: string;
      path?: string;
    };
  };
}
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'journalism-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateJournalism(seed as any, out)) as { filePath?: string; storyPath?: string; articlePath?: string };
  const richPath = r.storyPath ?? r.articlePath ?? r.filePath ?? out;
  const data = await fsp.readFile(richPath, 'utf-8').catch(async () => (await fsp.readFile(richPath)).toString('base64'));
  const previewData = data;
  return {
    filePath: data,
    meta: { storyPath: richPath },
    previewData,
    visual: { type: 'text', previewData },
    emergent_assets: {
      preview: { type: 'text', data: previewData, path: richPath }
    }
  };
}

function invert(a: A): I {
  return { size: a.filePath.length };
}

function rate(a: A): QualityReport {
  const content = typeof a.filePath === 'string' ? a.filePath : '';
  const len = content.length;
  const hasLede = /LEDE|The reporter visited/.test(content);
  const score = len > 3200 && hasLede ? 0.96 : (len > 1400 ? 0.88 : 0.6);
  return { score, axes: { hasOutput: len > 0 ? 1 : 0, articleDepth: hasLede ? 0.94 : 0.5, length: Math.min(1, len / 4500) }, notes: [hasLede ? 'investigative lede + body' : ''] };
}

export const JournalismQualityContract: QualityContract<S, A, I> = {
  domain: 'journalism',
  version: '1.0.0',
  strata: ['Story', 'Mind', 'Culture'] as const,
  engineOwner: 'Journalism Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'journalism-default', name: 'Default journalism', intent: 'baseline', seed: { $domain: 'journalism', $name: 'journalism-default', genes: {} } as S },
    { id: 'journalism-bright', name: 'Bright journalism', intent: 'high-energy', seed: { $domain: 'journalism', $name: 'journalism-bright', genes: { energy: 0.9 } } as S },
    { id: 'journalism-quiet', name: 'Quiet journalism', intent: 'low-energy', seed: { $domain: 'journalism', $name: 'journalism-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'journalism',
      version: '1.1.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      richArtifacts: ['storyPath', 'articlePath'],
      strata: ['Story', 'Mind', 'Culture'],
    };
  },
};
registerContract(JournalismQualityContract);
