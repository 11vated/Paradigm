/**
 * Legal Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateLegal } from './legal';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'legal'; $name?: string; genes?: Record<string, unknown> }
interface A {
  filePath: string;
  meta?: Record<string, unknown>;
  previewData?: string;
  visual?: {
    type: 'json' | 'html' | 'svg' | 'text';
    previewData?: string;
  };
  emergent_assets?: {
    preview?: {
      type: 'json' | 'svg' | 'text';
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
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'legal-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateLegal(seed as any, out)) as { filePath?: string; docPath?: string };
  const richPath = r.docPath ?? r.filePath ?? out;
  const data = await fsp.readFile(richPath, 'utf-8').catch(async () => (await fsp.readFile(richPath)).toString('base64'));
  const previewData = data;
  return {
    filePath: data,
    meta: { docPath: richPath },
    previewData,
    visual: { type: 'json', previewData },
    emergent_assets: {
      preview: { type: 'json', data: previewData, path: richPath }
    }
  };
}

function invert(a: A): I {
  return { size: a.filePath.length };
}

function rate(a: A): QualityReport {
  const content = typeof a.filePath === 'string' ? a.filePath : '';
  const len = content.length;
  const hasRecitals = /RECITALS|IN WITNESS WHEREOF/.test(content);
  const score = len > 1600 && hasRecitals ? 0.94 : (len > 700 ? 0.84 : 0.6);
  return { score, axes: { hasOutput: len > 0 ? 1 : 0, legalStructure: hasRecitals ? 0.93 : 0.5, length: Math.min(1, len / 2400) }, notes: [hasRecitals ? 'recitals + rich clauses' : ''] };
}

export const LegalQualityContract: QualityContract<S, A, I> = {
  domain: 'legal',
  version: '1.0.0',
  strata: ['Field', 'Story', 'Culture'] as const,
  engineOwner: 'Legal / Governance Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'legal-default', name: 'Default legal', intent: 'baseline', seed: { $domain: 'legal', $name: 'legal-default', genes: {} } as S },
    { id: 'legal-bright', name: 'Bright legal', intent: 'high-energy', seed: { $domain: 'legal', $name: 'legal-bright', genes: { energy: 0.9 } } as S },
    { id: 'legal-quiet', name: 'Quiet legal', intent: 'low-energy', seed: { $domain: 'legal', $name: 'legal-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'legal',
      version: '1.1.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      richArtifacts: ['docPath'],
      strata: ['Field', 'Story', 'Culture'],
    };
  },
};
registerContract(LegalQualityContract);
