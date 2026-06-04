/**
 * SpaceTourism Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSpaceTourism } from './space-tourism';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'space-tourism'; $name?: string; genes?: Record<string, unknown> }
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
    itineraryPath?: string;
  };
}
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'space-tourism-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateSpaceTourism(seed as any, out)) as { filePath?: string; itineraryPath?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  let parsed: any = {};
  try { parsed = JSON.parse(data); } catch { /* fallback */ }
  const summary = `Space tourism ${parsed.spaceTourism?.vehicle || '?'} for ${parsed.spaceTourism?.passengers || '?'} passengers. Duration: ${parsed.itinerary?.duration || '?'} days.`;
  const metrics: Record<string, number> = {
    passengers: parsed.spaceTourism?.passengers || 0,
    duration: parsed.itinerary?.duration || 0,
    safety: parsed.safety?.score || 0
  };
  const previewData = data;
  return {
    filePath: data,
    meta: { itineraryPath: r.itineraryPath },
    previewData,
    structuredData: parsed,
    summary,
    metrics,
    visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
    emergent_assets: {
      preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: filePath },
      itineraryPath: r.itineraryPath
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

export const SpaceTourismQualityContract: QualityContract<S, A, I> = {
  domain: 'space-tourism',
  version: '1.0.0',
  strata: ['World', 'Form', 'Story'] as const,
  engineOwner: 'Space Tourism Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'space-tourism-default', name: 'Default space-tourism', intent: 'baseline', seed: { $domain: 'space-tourism', $name: 'space-tourism-default', genes: {} } as S },
    { id: 'space-tourism-bright', name: 'Bright space-tourism', intent: 'high-energy', seed: { $domain: 'space-tourism', $name: 'space-tourism-bright', genes: { energy: 0.9 } } as S },
    { id: 'space-tourism-quiet', name: 'Quiet space-tourism', intent: 'low-energy', seed: { $domain: 'space-tourism', $name: 'space-tourism-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'space-tourism',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(SpaceTourismQualityContract);
