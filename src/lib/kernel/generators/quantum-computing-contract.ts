/**
 * QuantumComputing Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateQuantumComputing } from './quantum-computing';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: 'quantum-computing'; $name?: string; genes?: Record<string, unknown> }
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
    circuitPath?: string;
  };
}
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta ?? {})).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'quantum-computing-'));
  const out = path.join(dir, 'a.json');
  // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
  const r = await withKernelClock(0, () => generateQuantumComputing(seed as any, out)) as { filePath?: string; circuitPath?: string; qubitType?: string };
  const filePath = r.filePath ?? out;
  const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
  let parsed: any = {};
  try { parsed = JSON.parse(data); } catch { /* fallback */ }
  const summary = `Quantum ${parsed.quantumComputing?.qubitType || r.qubitType || 'computing'} with ${parsed.quantumComputing?.qubitCount || '?'} qubits. Fidelity: ${parsed.processor?.fidelity?.toFixed?.(3) || 'n/a'}`;
  const metrics: Record<string, number> = {
    qubitCount: parsed.quantumComputing?.qubitCount || 0,
    errorRate: parsed.quantumComputing?.errorRate || 0,
    fidelity: parsed.processor?.fidelity || 0,
    coherence: parsed.processor?.coherence || 0
  };
  const previewData = data;
  return {
    filePath: data,
    meta: { circuitPath: r.circuitPath, qubitType: r.qubitType },
    previewData,
    structuredData: parsed,
    summary,
    metrics,
    visual: { type: 'structured' as const, previewData, structuredData: parsed, summary, metrics },
    emergent_assets: {
      preview: { type: 'structured' as const, data: { structuredData: parsed, summary, metrics }, path: filePath },
      circuitPath: r.circuitPath
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

export const QuantumComputingQualityContract: QualityContract<S, A, I> = {
  domain: 'quantum-computing',
  version: '1.0.0',
  strata: ['Field', 'Form'] as const,
  engineOwner: 'Quantum Computing Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'quantum-computing-default', name: 'Default quantum-computing', intent: 'baseline', seed: { $domain: 'quantum-computing', $name: 'quantum-computing-default', genes: {} } as S },
    { id: 'quantum-computing-bright', name: 'Bright quantum-computing', intent: 'high-energy', seed: { $domain: 'quantum-computing', $name: 'quantum-computing-bright', genes: { energy: 0.9 } } as S },
    { id: 'quantum-computing-quiet', name: 'Quiet quantum-computing', intent: 'low-energy', seed: { $domain: 'quantum-computing', $name: 'quantum-computing-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'quantum-computing',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(QuantumComputingQualityContract);
