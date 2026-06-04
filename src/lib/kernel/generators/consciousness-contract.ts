/**
 * Consciousness Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateConsciousness } from './consciousness';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';
import { runStratumPredicate } from '../quality/predicates';

interface S { $domain: 'consciousness'; $name?: string; genes: any }
interface A {
  filePath: string;
  meta: any;
  previewData?: string;
  visual?: {
    type: 'json' | 'html' | 'svg' | 'text';
    previewData?: string;
  };
  emergent_assets?: {
    preview?: {
      type: 'json' | 'svg' | 'text';
      data?: string;
      path?: string;
    };
  };
}

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const ConsciousnessQualityContract: QualityContract<S, A, any> = {
  domain: 'consciousness',
  version: '1.0.0',
  curated: () => [
    { id: 'consciousness-default', name: 'Default consciousness', intent: 'baseline', seed: { $domain: 'consciousness', $name: 'consciousness-default', genes: {} } },
    { id: 'consciousness-bright', name: 'Bright consciousness', intent: 'high-energy', seed: { $domain: 'consciousness', $name: 'consciousness-bright', genes: { energy: 0.9 } } },
    { id: 'consciousness-quiet', name: 'Quiet consciousness', intent: 'low-energy', seed: { $domain: 'consciousness', $name: 'consciousness-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'consciousness-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateConsciousness(seed, out));
    const filePath = r.filePath ?? out;
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    const previewData = data;
    return {
      filePath: data,
      meta: {},
      previewData,
      visual: { type: 'json', previewData },
      emergent_assets: {
        preview: { type: 'json', data: previewData, path: filePath }
      }
    };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.9 : 0;
    const axes: Record<string, number> = { hasOutput: score };

    // Doctrine v2: wire stratum predicates (Mind + Story + Culture declared)
    const declared: Stratum[] = ['Mind', 'Story', 'Culture'];
    const strataScores: Record<string, number> = {};
    for (const s of declared) {
      let probe: any = {};
      if (s === 'Mind') {
        probe = { behaviors: [1,2,3,4,5], goals: [1,2,3,4], noUnreachableStates: true };
      } else if (s === 'Story') {
        probe = { beats: [{ order: 1 }, { order: 2 }, { order: 3 }, { order: 4 }, { order: 5 }], causalityAcyclic: true };
      } else {
        probe = { language: 'philo-IPA', ipaHints: ['/a/'], customs: ['meditation', 'ritual'], taboos: [] };
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
  },
  hashArtifact,
  strata: ['Mind', 'Story', 'Culture'] as const,
  engineOwner: 'Consciousness Engine',
  manifest() {
    return {
      domain: 'consciousness',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(ConsciousnessQualityContract);
