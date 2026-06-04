/**
 * Literature Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateLiterature } from './literature';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'literature'; $name?: string; genes?: Record<string, unknown> }
interface A {
  filePath: string;
  meta?: Record<string, unknown>;
  previewData?: string;
  visual?: {
    type: 'text' | 'json' | 'html';
    previewData?: string;
  };
  emergent_assets?: {
    preview?: {
      type: 'text' | 'json';
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
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'literature-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateLiterature(seed as any, out)) as { filePath?: string; storyPath?: string; manuscriptPath?: string };
  const richPath = r.storyPath ?? r.manuscriptPath ?? r.filePath ?? out;
  const data = await fsp.readFile(richPath, 'utf-8').catch(async () => (await fsp.readFile(richPath)).toString('base64'));
  const jsonData = await fsp.readFile(r.filePath ?? out, 'utf-8').catch(() => '{}');
  const previewData = data;
  return {
    filePath: data,
    meta: { richPath, json: jsonData.substring(0, 512), wordCount: data.length },
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
  const hasNarrative = /CHAPTER|PROLOGUE|EPILOGUE|The .* murmured/.test(content);
  const wordEst = Math.floor(len / 5.5);
  const score = len > 8000 ? 1.0 : (len > 4000 ? 0.96 : (len > 1200 ? 0.88 : 0.6));
  const axes: Record<string, number> = {
    hasOutput: len > 0 ? 1 : 0,
    narrativeDepth: hasNarrative ? 0.97 : 0.4,
    lengthFidelity: Math.min(1, wordEst / 2000),
    coherence: hasNarrative && len > 3000 ? 0.91 : 0.65
  };
  const notes: string[] = [`rich-text ${wordEst} words`, hasNarrative ? 'plot+dialogue present' : 'minimal'];
  return { score, axes, notes };
}

export const LiteratureQualityContract: QualityContract<S, A, I> = {
  domain: 'literature',
  version: '1.0.0',
  strata: ['Story', 'Culture', 'Mind'] as const,
  engineOwner: 'Literature Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'literature-default', name: 'Default literature', intent: 'baseline', seed: { $domain: 'literature', $name: 'literature-default', genes: {} } as S },
    { id: 'literature-bright', name: 'Bright literature', intent: 'high-energy', seed: { $domain: 'literature', $name: 'literature-bright', genes: { energy: 0.9 } } as S },
    { id: 'literature-quiet', name: 'Quiet literature', intent: 'low-energy', seed: { $domain: 'literature', $name: 'literature-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'literature',
      version: '1.1.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      richArtifacts: ['storyPath', 'manuscriptPath'],
      strata: ['Story', 'Mind', 'Culture'],
    };
  },
};
registerContract(LiteratureQualityContract);
