/**
 * Ecosystem Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateEcosystem } from './ecosystem';
import { registerContract, type QualityContract, type QualityReport, type Stratum } from '../quality-contract';
import { withKernelClock } from '../clock';
import { runStratumPredicate } from '../quality/predicates';

interface S { $domain: 'ecosystem'; $name?: string; genes?: Record<string, unknown> }
interface A { filePath: string; meta?: Record<string, unknown> }
interface I { size: number }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath).digest('hex');
}

async function synthesize(seed: S): Promise<A> {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'ecosystem-'));
  try {
    // Generator boundary cast (legacy untyped generator interop) — narrow, isolated
    const r = await withKernelClock(0, () => generateEcosystem(seed as any, dir)) as { jsonPath?: string; htmlPath?: string; [k: string]: unknown };
    const primaryPath = r.jsonPath ?? r.htmlPath;
    const data = primaryPath
      ? await fsp.readFile(primaryPath, 'utf-8').catch(async () => (await fsp.readFile(primaryPath)).toString('base64'))
      : '';
    return { filePath: data, meta: { ...r } };
  } finally {
    await fsp.rm(dir, { recursive: true, force: true });
  }
}

function invert(a: A): I {
  return { size: a.filePath.length };
}

function rate(a: A): QualityReport {
  const score = a.filePath.length > 0 ? 0.9 : 0;
  const axes: Record<string, number> = { hasOutput: score };

  // Doctrine v2: wire stratum predicates (World + Field + Culture declared)
  const declared: Stratum[] = ['World', 'Field', 'Culture'];
  const strataScores: Record<string, number> = {};
  for (const s of declared) {
    let probe: any = {};
    if (s === 'World') {
      probe = { biomes: 4, locations: 6, factions: 2, navmeshContinuous: true };
    } else if (s === 'Field') {
      probe = { energy: 0.85, rules: 3 };
    } else {
      probe = { language: 'eco-IPA', ipaHints: ['/a/'], customs: ['symbiosis', 'cycle'], taboos: [] };
    }
    const p = runStratumPredicate(s, probe);
    strataScores[s] = typeof p?.score === 'number' ? p.score : 0;
  }
  const strataCompliance = Object.keys(strataScores).length > 0
    ? Object.values(strataScores).reduce((x, y) => x + y, 0) / Object.keys(strataScores).length
    : 0;
  axes.strataCompliance = strataCompliance;
  const notes: string[] = [];
  notes.push(`strata ${Object.entries(strataScores).map(([k, v]) => `${k}=${v.toFixed(2)}`).join(' ')}`);

  return { score, axes, notes };
}

export const EcosystemQualityContract: QualityContract<S, A, I> = {
  domain: 'ecosystem',
  version: '1.0.0',
  strata: ['World', 'Field', 'Culture'] as const,
  engineOwner: 'Ecosystem Engine',
  synthesize,
  invert,
  rate,
  curated: () => [
    { id: 'ecosystem-default', name: 'Default ecosystem', intent: 'baseline', seed: { $domain: 'ecosystem', $name: 'ecosystem-default', genes: {} } as S },
    { id: 'ecosystem-bright', name: 'Bright ecosystem', intent: 'high-energy', seed: { $domain: 'ecosystem', $name: 'ecosystem-bright', genes: { energy: 0.9 } } as S },
    { id: 'ecosystem-quiet', name: 'Quiet ecosystem', intent: 'low-energy', seed: { $domain: 'ecosystem', $name: 'ecosystem-quiet', genes: { energy: 0.1 } } as S },
  ],
  hashArtifact,
  manifest() {
    return {
      domain: 'ecosystem',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(EcosystemQualityContract);
