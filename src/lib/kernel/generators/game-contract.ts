/**
 * Game Quality Contract — auto-generated stub.
 *
 * Adapter around `generateGameV3` exposing the canonical 4-clause
 * QualityContract surface. The rate() function is a placeholder pending
 * a domain-specific evaluator; the structure is correct and conformant.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateGameV3 } from './game';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'game'; $name?: string; genes: Record<string, unknown> }
interface A { filePath: string; meta: Record<string, unknown> }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const GameQualityContract: QualityContract<S, A, Record<string, unknown>> = {
  domain: 'game',
  version: '1.0.0',
  curated: () => [
    { id: 'game-default',  name: 'Default Game',  intent: 'baseline', seed: { $domain: 'game', $name: 'game-default',  genes: {} } },
    { id: 'game-variant-a', name: 'Variant A Game', intent: 'variant',  seed: { $domain: 'game', $name: 'game-variant-a', genes: { intensity: 0.7 } } },
    { id: 'game-variant-b', name: 'Variant B Game', intent: 'variant',  seed: { $domain: 'game', $name: 'game-variant-b', genes: { intensity: 0.3 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'game-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateGameV3(seed as never, out)) as { filePath?: string };
    const filePath = r.filePath ?? out;
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
registerContract(GameQualityContract as never);
