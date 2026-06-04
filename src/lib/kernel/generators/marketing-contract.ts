/**
 * Marketing Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMarketing } from './marketing';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'marketing'; $name?: string; genes?: Record<string, unknown> }
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
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'marketing-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateMarketing(seed as any, out)) as { filePath?: string; planPath?: string };
  const richPath = r.planPath ?? r.filePath ?? out;
  const data = await fsp.readFile(richPath, 'utf-8').catch(async () => (await fsp.readFile(richPath)).toString('base64'));
  const previewData = data;
  return {
    filePath: data,
    meta: { planPath: richPath },
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
  const hasPersonas = /Target Personas/.test(content);
  const score = len > 1900 && hasPersonas ? 0.94 : (len > 800 ? 0.85 : 0.6);
  return { score, axes: { hasOutput: len > 0 ? 1 : 0, strategyDepth: hasPersonas ? 0.93 : 0.5, length: Math.min(1, len / 2800) }, notes: [hasPersonas ? 'full plan with personas' : ''] };
}

export const MarketingQualityContract: QualityContract<S, A, I> = {
  domain: 'marketing',
  version: '1.0.0',
  strata: ['Form', 'Story', 'Culture', 'Mind'] as const,
  engineOwner: 'Marketing Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'marketing-default', name: 'Default marketing', intent: 'baseline', seed: { $domain: 'marketing', $name: 'marketing-default', genes: {} } as S },
    { id: 'marketing-bright', name: 'Bright marketing', intent: 'high-energy', seed: { $domain: 'marketing', $name: 'marketing-bright', genes: { energy: 0.9 } } as S },
    { id: 'marketing-quiet', name: 'Quiet marketing', intent: 'low-energy', seed: { $domain: 'marketing', $name: 'marketing-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'marketing',
      version: '1.1.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      richArtifacts: ['planPath'],
      strata: ['Story', 'Culture', 'Mind'],
    };
  },
};
registerContract(MarketingQualityContract);
