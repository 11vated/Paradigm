import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateQuantum } from './quantum';
import { registerContract } from '../quality-contract';
import type { QualityContract, QualityReport, Stratum } from '../quality-contract';

interface QSeed { $hash: string; genes?: Record<string, any>; }
interface QArtifact { densitySvg: string; phaseSvg: string; expectation: any; potentialType: string; normError: number; }
interface QInverted { potentialType: string; normError: number; svgHash: string; expectationX: number; }

async function synthesize(seed: QSeed): Promise<QArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdgm-qm-'));
  try {
    const r = await generateQuantum(seed as any, dir) as any;
    const dens = await fs.readFile(r.svgPath, 'utf8').catch(() => '');
    const phase = dens;
    const meta = JSON.parse(await fs.readFile(r.jsonPath, 'utf8').catch(() => '{}'));
    return { densitySvg: dens, phaseSvg: phase, expectation: meta.expectation ?? {},
      potentialType: meta.potential ?? '', normError: Math.abs(1 - (meta.normalization ?? 0)) };
  } finally { await fs.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

function invert(a: QArtifact): QInverted {
  return { potentialType: a.potentialType, normError: a.normError,
    expectationX: a.expectation?.x ?? 0,
    svgHash: crypto.createHash('sha256').update(a.densitySvg).digest('hex').slice(0, 16) };
}

function rate(a: QArtifact): QualityReport {
  const axes: Record<string, number> = {
    hasDensity: a.densitySvg.length > 200 ? 1 : 0,
    hasPhase:   a.phaseSvg.length   > 200 ? 1 : 0,
    normalized: a.normError < 0.05 ? 1 : Math.max(0, 1 - a.normError * 10),
    hasExpectation: Object.keys(a.expectation).length >= 3 ? 1 : 0,
  };
  const score = Object.values(axes).reduce((a, b) => a + b, 0) / Object.keys(axes).length;
  return { score, axes, notes: [`${a.potentialType}, normErr=${a.normError.toExponential(2)}`] };
}

function hashArtifact(a: QArtifact): string {
  return crypto.createHash('sha256').update(a.densitySvg + a.phaseSvg).digest('hex');
}

const CURATED = [
  { id: 'quantum-harmonic',    name: 'Harmonic',     intent: 'Quantum harmonic oscillator',      tags: ['qm','harmonic'],
    seed: { $hash: 'qm-harm',   genes: { potential: { value: 'harmonic' } } } as QSeed },
  { id: 'quantum-double-well', name: 'Double Well',  intent: 'Double-well tunneling',            tags: ['qm','tunneling'],
    seed: { $hash: 'qm-dwell',  genes: { potential: { value: 'double_well' } } } as QSeed },
  { id: 'quantum-tunneling',   name: 'Tunneling',    intent: 'Barrier tunneling visualization',  tags: ['qm','barrier'],
    seed: { $hash: 'qm-tunnel', genes: { potential: { value: 'tunneling' } } } as QSeed },
];

export const QuantumQualityContract: QualityContract<QSeed, QArtifact, QInverted> = {
  domain: 'quantum', version: '1.0.0',
  strata: ['Field'] as const,
  engineOwner: 'Quantum Engine',
  synthesize, invert, rate, curated: () => CURATED, hashArtifact,
  manifest() {
    return {
      domain: 'quantum',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(QuantumQualityContract);
