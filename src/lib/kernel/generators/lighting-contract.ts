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
  };
}
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
  let parsed: any = {};
  try { parsed = JSON.parse(data); } catch { /* fallback */ }
  const summary = `Lighting ${parsed.lighting?.type || 'system'} for ${parsed.lighting?.application || 'space'}. Efficiency: ${parsed.performance?.efficiency?.toFixed?.(2) || 'n/a'}`;
  const metrics: Record<string, number> = {
    efficiency: parsed.performance?.efficiency || 0,
    lumens: parsed.performance?.lumens || 0,
    cost: parsed.economics?.cost || 0
  };
  const previewData = data;
  return {
    filePath: data,
    meta: {},
    previewData,
    structuredData: parsed,
    summary,
    metrics,
    visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
    emergent_assets: {
      preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: filePath }
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
