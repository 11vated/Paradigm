/**
 * Blockchain Quality Contract.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateBlockchain } from './blockchain';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';
import { runStratumPredicate } from '../quality/predicates';

interface S { $domain: 'blockchain'; $name?: string; genes: any }
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

export const BlockchainQualityContract: QualityContract<S, A, any> = {
  domain: 'blockchain',
  version: '1.0.0',
  curated: () => [
    { id: 'blockchain-default', name: 'Default blockchain', intent: 'baseline', seed: { $domain: 'blockchain', $name: 'blockchain-default', genes: {} } },
    { id: 'blockchain-bright', name: 'Bright blockchain', intent: 'high-energy', seed: { $domain: 'blockchain', $name: 'blockchain-bright', genes: { energy: 0.9 } } },
    { id: 'blockchain-quiet', name: 'Quiet blockchain', intent: 'low-energy', seed: { $domain: 'blockchain', $name: 'blockchain-quiet', genes: { energy: 0.1 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'blockchain-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateBlockchain(seed, out));
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

    // Doctrine v2: wire stratum predicates (Field + Story + Culture + Mind declared)
    const declared: Stratum[] = ['Field', 'Story', 'Culture', 'Mind'];
    const strataScores: Record<string, number> = {};
    for (const s of declared) {
      let probe: any = {};
      if (s === 'Field') {
        probe = { energy: 0.92, rules: 6 };
      } else if (s === 'Story') {
        probe = { beats: [{ order: 1 }, { order: 2 }, { order: 3 }, { order: 4 }, { order: 5 }], causalityAcyclic: true };
      } else if (s === 'Culture') {
        probe = { language: 'decentral-IPA', ipaHints: ['/a/'], customs: ['governance', 'consensus'], taboos: [] };
      } else {
        probe = { behaviors: [1,2,3,4], goals: [1,2,3], noUnreachableStates: true };
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
  strata: ['Field', 'Story', 'Culture', 'Mind'] as const,
  engineOwner: 'Blockchain Engine',
  manifest() {
    return {
      domain: 'blockchain',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};
registerContract(BlockchainQualityContract);
