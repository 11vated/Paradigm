/**
 * Nanobot Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateNanobot } from './nanobot';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'nanobot'; $name?: string; genes?: Record<string, unknown> }
interface A {
  filePath: string; // json content for compat
  stlPath: string;
  botCount: number;
  meta: Record<string, unknown>;
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
    stlPath?: string;
  };
}
interface I { size: number; botCount: number; facets?: number }

function hashArtifact(a: A): string {
  const payload = (a.filePath || '') + '|' + (a.stlPath || '') + '|' + a.botCount + '|' + JSON.stringify(a.meta ?? {});
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'nanobot-'));
  const out = path.join(dir, 'nanobot.json');
  const r = await withKernelClock(0, () => generateNanobot(seed as any, out)) as { filePath: string; stlPath: string; botCount: number };
  const jsonContent = await fsp.readFile(r.filePath, 'utf-8').catch(() => '{}');
  const stlContent = await fsp.readFile(r.stlPath, 'utf-8').catch(() => 'solid empty\nendsolid empty');
  // Count facets for rich report (real detailed geometry)
  const facetCount = (stlContent.match(/facet normal/g) || []).length;
  let parsed: any = {};
  try { parsed = JSON.parse(jsonContent); } catch { /* fallback */ }
  const summary = `Nanobot swarm of ${r.botCount} bots with ${facetCount} facets. Efficiency: ${parsed.swarm?.taskAllocation?.efficiency?.toFixed?.(2) || 'n/a'}`;
  const metrics: Record<string, number> = {
    botCount: r.botCount,
    facetCount,
    efficiency: parsed.swarm?.taskAllocation?.efficiency || 0,
    resolution: parsed.design?.components?.find((c: any) => c.name === 'sensor')?.resolution || 0
  };
  const previewData = jsonContent;
  return {
    filePath: jsonContent,
    stlPath: r.stlPath,
    botCount: r.botCount,
    meta: {
      stlSize: stlContent.length,
      facetCount,
      botCount: r.botCount,
      stlHead: stlContent.slice(0, 64)
    },
    previewData,
    structuredData: parsed,
    summary,
    metrics,
    visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
    emergent_assets: {
      preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: r.filePath },
      stlPath: r.stlPath
    }
  };
}

function invert(a: A): I {
  return { size: (a.filePath || '').length + ((a.meta?.stlSize as number) || 0), botCount: a.botCount, facets: (a.meta?.facetCount as number) || 0 };
}

function rate(a: A): QualityReport {
  const jsonLen = (a.filePath || '').length;
  const stlLen = (a.meta?.stlSize as number) || 0;
  const facets = (a.meta?.facetCount as number) || 0;
  const botC = a.botCount || 1;
  const facetScore = Math.min(1, facets / 180); // world-class detailed requires >~150 facets
  const sizeScore = Math.min(1, (jsonLen + stlLen) / 45000);
  const botScore = Math.min(1, Math.log10(botC + 1) / 6);
  const score = facetScore * 0.45 + sizeScore * 0.35 + botScore * 0.2;
  const axes: Record<string, number> = {
    hasOutput: jsonLen > 10 ? 1 : 0,
    facetDetail: facetScore,
    stlBytes: Math.min(1, stlLen / 30000),
    swarmScale: botScore,
    manifoldEvidence: facets > 40 ? 1 : 0.3
  };
  const notes = [`bots=${botC} facets=${facets} stl=${stlLen}B`, `detail=${facetScore.toFixed(2)}`];
  return { score: Math.max(0, Math.min(1, score)), axes, notes };
}

export const NanobotQualityContract: QualityContract<S, A, I> = {
  domain: 'nanobot',
  version: '1.0.0',
  strata: ['Form', 'Motion', 'Field'] as const,
  engineOwner: 'Nanobot Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'nanobot-default', name: 'Default nanobot', intent: 'baseline', seed: { $domain: 'nanobot', $name: 'nanobot-default', genes: {} } as S },
    { id: 'nanobot-bright', name: 'Bright nanobot', intent: 'high-energy', seed: { $domain: 'nanobot', $name: 'nanobot-bright', genes: { energy: 0.9 } } as S },
    { id: 'nanobot-quiet', name: 'Quiet nanobot', intent: 'low-energy', seed: { $domain: 'nanobot', $name: 'nanobot-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'nanobot',
      version: '1.0.0',
      strata: ['Form', 'Motion', 'Field'],
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
      outputs: ['JSON (design+swarm+assembly)', 'STL (detailed ASCII, 100s of facets, manifold)'],
      notes: 'Real multi-faceted nanobot geometry (capsule+flagella+sensor+actuators) generated from seed; complete detailed STL.'
    };
  },
};
registerContract(NanobotQualityContract);
