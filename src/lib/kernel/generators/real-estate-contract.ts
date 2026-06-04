/**
 * RealEstate Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateRealEstate } from './real-estate';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'real-estate'; $name?: string; genes?: Record<string, unknown> }
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
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'real-estate-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateRealEstate(seed as any, out)) as { filePath?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  let parsed: any = {};
  try { parsed = JSON.parse(data); } catch { /* fallback */ }
  const summary = `Real estate ${parsed.realEstate?.propertyType || 'property'} in ${parsed.realEstate?.location || 'location'}. Value: ${parsed.economics?.estimatedValue || '?'}`;
  const metrics: Record<string, number> = {
    estimatedValue: parsed.economics?.estimatedValue || 0,
    size: parsed.property?.size || 0,
    roi: parsed.investment?.projectedROI || 0
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

export const RealEstateQualityContract: QualityContract<S, A, I> = {
  domain: 'real-estate',
  version: '1.0.0',
  strata: ['Form', 'World', 'Story'] as const,
  engineOwner: 'Real Estate Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'real-estate-default', name: 'Default real-estate', intent: 'baseline', seed: { $domain: 'real-estate', $name: 'real-estate-default', genes: {} } as S },
    { id: 'real-estate-bright', name: 'Bright real-estate', intent: 'high-energy', seed: { $domain: 'real-estate', $name: 'real-estate-bright', genes: { energy: 0.9 } } as S },
    { id: 'real-estate-quiet', name: 'Quiet real-estate', intent: 'low-energy', seed: { $domain: 'real-estate', $name: 'real-estate-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'real-estate',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(RealEstateQualityContract);
