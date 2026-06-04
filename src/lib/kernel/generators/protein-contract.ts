/**
 * Protein Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateProtein } from './protein';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'protein'; $name?: string; genes?: Record<string, unknown> }
interface A {
  filePath: string;
  meta?: Record<string, unknown>;
  previewData?: string;
  structuredData?: any;
  summary?: string;
  metrics?: Record<string, number>;
  visual?: {
    type: 'json' | 'html' | 'svg' | 'text' | 'structured';
    previewData?: string;
    structuredData?: any;
    summary?: string;
    metrics?: Record<string, number>;
  };
  emergent_assets?: {
    preview?: {
      type: 'json' | 'svg' | 'text' | 'structured';
      data?: any;
      path?: string;
    };
    pdbPath?: string;
  };
}
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'protein-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateProtein(seed as any, out)) as { filePath?: string; pdbPath?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  let parsed: any = {};
  try { parsed = JSON.parse(data); } catch { /* fallback */ }
  const summary = `Protein ${parsed.protein?.name || 'target'} binding ${parsed.binding?.affinity?.toFixed?.(1) || '?'}nM. Viable: ${parsed.drugCandidate?.viable ? 'yes' : 'no'}`;
  const metrics: Record<string, number> = {
    affinity: parsed.binding?.affinity || 0,
    absorption: parsed.drugCandidate?.adme?.absorption || 0,
    viable: parsed.drugCandidate?.viable ? 1 : 0
  };
  const previewData = data;
  return {
    filePath: data,
    meta: { pdbPath: r.pdbPath },
    previewData,
    structuredData: parsed,
    summary,
    metrics,
    visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
    emergent_assets: {
      preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: filePath },
      pdbPath: r.pdbPath
    }
  };
}

function invert(a: A): I {
  return { size: a.filePath.length };
}

function rate(a: A): QualityReport {
  const score = a.filePath.length > 0 ? 0.9 : 0;
  return { score, axes: { hasOutput: score }, notes: [] };
}

export const ProteinQualityContract: QualityContract<S, A, I> = {
  domain: 'protein',
  version: '1.0.0',
  strata: ['Form', 'Field'] as const,
  engineOwner: 'Protein Engineering Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'protein-default', name: 'Default protein', intent: 'baseline', seed: { $domain: 'protein', $name: 'protein-default', genes: {} } as S },
    { id: 'protein-bright', name: 'Bright protein', intent: 'high-energy', seed: { $domain: 'protein', $name: 'protein-bright', genes: { energy: 0.9 } } as S },
    { id: 'protein-quiet', name: 'Quiet protein', intent: 'low-energy', seed: { $domain: 'protein', $name: 'protein-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'protein',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(ProteinQualityContract);
