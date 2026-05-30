/**
 * Dance Quality Contract — wraps generateDance with an in-memory adapter.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateDance } from './dance';
import { registerContract, type QualityContract, type Stratum } from '../quality-contract';

interface DanceSeed { $hash?: string; $name?: string; genes?: any; }
interface DanceArtifact { choreo: string; style: string; size: number; }
interface DanceInverted { style: string; lines: number; bytes: number; }

async function synth(seed: DanceSeed): Promise<DanceArtifact> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'dance-q-'));
  try {
    const r = await generateDance(seed, path.join(dir, "dance.json"));
    const choreo = await fs.readFile(r.choreoPath, 'utf8');
    return { choreo, style: r.style, size: choreo.length };
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

function fingerprint(a: DanceArtifact): string { return crypto.createHash('sha256').update(a.choreo).digest('hex'); }

export const DanceQualityContract: QualityContract<DanceSeed, DanceArtifact, DanceInverted> = {
  domain: 'dance',
  version: '1.0.0',
  synthesize: synth,
  invert: (a) => ({ style: a.style, lines: a.choreo.split('\n').length, bytes: a.size }),
  rate: (a) => ({
    score: a.choreo.length > 50 ? 0.8 : 0,
    axes: { hasContent: a.choreo.length > 50 ? 1 : 0, hasStyle: a.style ? 1 : 0 },
    notes: [`${a.choreo.split('\n').length} lines, ${a.style}`],
  }),
  curated: () => [
    { id: 'dance-ballet', name: 'Ballet', intent: 'Classical ballet routine',
      seed: { $name: 'Swan', genes: { style: 'ballet', tempo: 80, complexity: 0.6 } } },
    { id: 'dance-contemporary', name: 'Contemporary', intent: 'Modern contemporary piece',
      seed: { $name: 'Yearning', genes: { style: 'contemporary', tempo: 100, complexity: 0.7 } } },
    { id: 'dance-hiphop', name: 'Hip-Hop', intent: 'Energetic hip-hop',
      seed: { $name: 'Concrete', genes: { style: 'hip-hop', tempo: 140, complexity: 0.8 } } },
  ],
  hashArtifact: fingerprint,
  strata: ['Motion', 'Sound', 'Culture'] as const,
  engineOwner: 'Dance Engine',
  manifest() {
    return {
      domain: 'dance',
      version: '1.0.0',
      clauses: ['synthesize', 'invert', 'rate', 'curated', 'deterministic'],
      determinism: 'strict',
    };
  },
};

registerContract(DanceQualityContract);
