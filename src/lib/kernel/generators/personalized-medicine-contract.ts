/**
 * PersonalizedMedicine Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generatePersonalizedMedicine } from './personalized-medicine';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'personalized-medicine'; $name?: string; genes?: Record<string, unknown> }
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
    reportPath?: string;
  };
}
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'personalized-medicine-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generatePersonalizedMedicine(seed as any, out)) as { filePath?: string; reportPath?: string; treatmentType?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  let parsed: any = {};
  try { parsed = JSON.parse(data); } catch { /* fallback */ }
  const summary = `Personalized ${parsed.personalizedMedicine?.treatmentType || r.treatmentType || 'medicine'} with ${parsed.personalizedMedicine?.biomarkers || '?'} biomarkers. Efficacy: ${parsed.personalizedMedicine?.efficacy?.toFixed?.(2) || 'n/a'}`;
  const metrics: Record<string, number> = {
    biomarkers: parsed.personalizedMedicine?.biomarkers || 0,
    efficacy: parsed.personalizedMedicine?.efficacy || 0,
    responseRate: parsed.outcomes?.responseRate || 0,
    adverse: parsed.outcomes?.adverseEvents || 0
  };
  const previewData = data;
  return {
    filePath: data,
    meta: { reportPath: r.reportPath, treatmentType: r.treatmentType },
    previewData,
    structuredData: parsed,
    summary,
    metrics,
    visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
    emergent_assets: {
      preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: filePath },
      reportPath: r.reportPath
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

export const PersonalizedMedicineQualityContract: QualityContract<S, A, I> = {
  domain: 'personalized-medicine',
  version: '1.0.0',
  strata: ['Form', 'Field', 'Mind'] as const,
  engineOwner: 'Personalized Medicine Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'personalized-medicine-default', name: 'Default personalized-medicine', intent: 'baseline', seed: { $domain: 'personalized-medicine', $name: 'personalized-medicine-default', genes: {} } as S },
    { id: 'personalized-medicine-bright', name: 'Bright personalized-medicine', intent: 'high-energy', seed: { $domain: 'personalized-medicine', $name: 'personalized-medicine-bright', genes: { energy: 0.9 } } as S },
    { id: 'personalized-medicine-quiet', name: 'Quiet personalized-medicine', intent: 'low-energy', seed: { $domain: 'personalized-medicine', $name: 'personalized-medicine-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'personalized-medicine',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(PersonalizedMedicineQualityContract);
