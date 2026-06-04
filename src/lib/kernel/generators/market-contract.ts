/**
 * Market Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateMarket } from './market';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'market'; $name?: string; genes?: Record<string, unknown> }
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
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'market-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateMarket(seed as any, out)) as { filePath?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  let parsed: any = {};
  try { parsed = JSON.parse(data); } catch { /* fallback */ }
  const summary = `Market ${parsed.market?.segment || 'segment'} trend ${parsed.market?.trend || ''}. Volume: ${parsed.economics?.volume || '?'}`;
  const metrics: Record<string, number> = {
    volume: parsed.economics?.volume || 0,
    volatility: parsed.economics?.volatility || 0,
    growth: parsed.economics?.growthRate || 0
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

export const MarketQualityContract: QualityContract<S, A, I> = {
  domain: 'market',
  version: '1.0.0',
  strata: ['Field', 'Story', 'Culture'] as const,
  engineOwner: 'Market / Economics Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'market-default', name: 'Default market', intent: 'baseline', seed: { $domain: 'market', $name: 'market-default', genes: {} } as S },
    { id: 'market-bright', name: 'Bright market', intent: 'high-energy', seed: { $domain: 'market', $name: 'market-bright', genes: { energy: 0.9 } } as S },
    { id: 'market-quiet', name: 'Quiet market', intent: 'low-energy', seed: { $domain: 'market', $name: 'market-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'market',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(MarketQualityContract);
