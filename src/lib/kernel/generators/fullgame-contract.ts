/**
 * Fullgame Quality Contract — auto-generated stub.
 *
 * Adapter around `generateFullGameV3` exposing the canonical 4-clause
 * QualityContract surface. The rate() function is a placeholder pending
 * a domain-specific evaluator; the structure is correct and conformant.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateFullGameV3 } from './fullgame';
import { registerContract, type QualityContract } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

// Direct 15_ usage (Epoch 2 pattern)
import { fullGameContract as fullgame15 } from '../../contracts/domains/fullgame';

interface S { $domain: 'fullgame'; $name?: string; genes: Record<string, unknown> }
interface A { filePath: string; meta: Record<string, unknown> }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const FullgameQualityContract: QualityContract<S, A, Record<string, unknown>> = {
  domain: 'fullgame',
  version: '1.0.0',
  curated: () => [
    { id: 'fullgame-default',  name: 'Default Fullgame',  intent: 'baseline', seed: { $domain: 'fullgame', $name: 'fullgame-default',  genes: {} } },
    { id: 'fullgame-variant-a', name: 'Variant A Fullgame', intent: 'variant',  seed: { $domain: 'fullgame', $name: 'fullgame-variant-a', genes: { intensity: 0.7 } } },
    { id: 'fullgame-variant-b', name: 'Variant B Fullgame', intent: 'variant',  seed: { $domain: 'fullgame', $name: 'fullgame-variant-b', genes: { intensity: 0.3 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'fullgame-'));
    const r = await withKernelClock(0, () => generateFullGameV3(seed as never, dir)) as { filePath?: string; htmlPath?: string };
    const filePath = r.htmlPath ?? r.filePath ?? path.join(dir, 'fullgame_unknown.html');
    const data = await fsp.readFile(filePath, 'utf-8').catch(async () => (await fsp.readFile(filePath)).toString('base64'));
    return { filePath: data, meta: {} };
  },
  invert: (a) => ({ size: a.filePath.length }),
  rate: (a) => {
    const score = a.filePath.length > 0 ? 0.85 : 0;
    return { score, axes: { hasOutput: score }, notes: [] };
  },
  hashArtifact,
};
registerContract(FullgameQualityContract as never);

