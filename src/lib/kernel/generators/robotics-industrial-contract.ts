/**
 * RoboticsIndustrial Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateRoboticsIndustrial } from './robotics-industrial';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'robotics-industrial'; $name?: string; genes?: Record<string, unknown> }
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
    cadPath?: string;
  };
}
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'robotics-industrial-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateRoboticsIndustrial(seed as any, out)) as { filePath?: string; cadPath?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  let parsed: any = {};
  try { parsed = JSON.parse(data); } catch { /* fallback */ }
  const summary = `Industrial robot ${parsed.robotics?.type || '?'} payload ${parsed.robotics?.payload || '?'}kg. Precision: ${parsed.performance?.precision?.toFixed?.(2) || 'n/a'}`;
  const metrics: Record<string, number> = {
    payload: parsed.robotics?.payload || 0,
    precision: parsed.performance?.precision || 0,
    uptime: parsed.performance?.uptime || 0
  };
  const previewData = data;
  return {
    filePath: data,
    meta: { cadPath: r.cadPath },
    previewData,
    structuredData: parsed,
    summary,
    metrics,
    visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
    emergent_assets: {
      preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: filePath },
      cadPath: r.cadPath
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

export const RoboticsIndustrialQualityContract: QualityContract<S, A, I> = {
  domain: 'robotics-industrial',
  version: '1.0.0',
  strata: ['Form', 'Motion', 'Mind', 'Field'] as const,
  engineOwner: 'Robotics Industrial Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'robotics-industrial-default', name: 'Default robotics-industrial', intent: 'baseline', seed: { $domain: 'robotics-industrial', $name: 'robotics-industrial-default', genes: {} } as S },
    { id: 'robotics-industrial-bright', name: 'Bright robotics-industrial', intent: 'high-energy', seed: { $domain: 'robotics-industrial', $name: 'robotics-industrial-bright', genes: { energy: 0.9 } } as S },
    { id: 'robotics-industrial-quiet', name: 'Quiet robotics-industrial', intent: 'low-energy', seed: { $domain: 'robotics-industrial', $name: 'robotics-industrial-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'robotics-industrial',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(RoboticsIndustrialQualityContract);
