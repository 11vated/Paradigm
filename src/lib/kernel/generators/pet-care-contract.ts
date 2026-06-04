/**
 * PetCare Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generatePetCare } from './pet-care';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'pet-care'; $name?: string; genes?: Record<string, unknown> }
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
    planPath?: string;
  };
}
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pet-care-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generatePetCare(seed as any, out)) as { filePath?: string; planPath?: string; service?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  let parsed: any = {};
  try { parsed = JSON.parse(data); } catch { /* fallback */ }
  const summary = `Pet care for ${parsed.petCare?.petType || '?'}s: ${parsed.petCare?.service || r.service || 'service'} ${parsed.petCare?.duration || '?'} days. Cost est: ${parsed.economics?.consultation?.toFixed?.(0) || 'n/a'}`;
  const metrics: Record<string, number> = {
    duration: parsed.petCare?.duration || 0,
    consultation: parsed.economics?.consultation || 0,
    veterinarians: parsed.staff?.veterinarians || 0
  };
  const previewData = data;
  return {
    filePath: data,
    meta: { planPath: r.planPath, service: r.service },
    previewData,
    structuredData: parsed,
    summary,
    metrics,
    visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
    emergent_assets: {
      preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: filePath },
      planPath: r.planPath
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

export const PetCareQualityContract: QualityContract<S, A, I> = {
  domain: 'pet-care',
  version: '1.0.0',
  strata: ['Form', 'Mind', 'Story'] as const,
  engineOwner: 'Pet Care Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'pet-care-default', name: 'Default pet-care', intent: 'baseline', seed: { $domain: 'pet-care', $name: 'pet-care-default', genes: {} } as S },
    { id: 'pet-care-bright', name: 'Bright pet-care', intent: 'high-energy', seed: { $domain: 'pet-care', $name: 'pet-care-bright', genes: { energy: 0.9 } } as S },
    { id: 'pet-care-quiet', name: 'Quiet pet-care', intent: 'low-energy', seed: { $domain: 'pet-care', $name: 'pet-care-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'pet-care',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(PetCareQualityContract);
