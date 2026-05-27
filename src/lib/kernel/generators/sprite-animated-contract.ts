/**
 * SpriteAnimated Quality Contract — auto-generated stub.
 *
 * Adapter around `generateSpriteAnimated` exposing the canonical 4-clause
 * QualityContract surface. The rate() function is a placeholder pending
 * a domain-specific evaluator; the structure is correct and conformant.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generateSpriteAnimated } from './sprite-animated';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: 'sprite-animated'; $name?: string; genes: Record<string, unknown> }
interface A { filePath: string; meta: Record<string, unknown> }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const SpriteAnimatedQualityContract: QualityContract<S, A, Record<string, unknown>> = {
  domain: 'sprite-animated',
  version: '1.0.0',
  curated: () => [
    { id: 'sprite-animated-default',  name: 'Default SpriteAnimated',  intent: 'baseline', seed: { $domain: 'sprite-animated', $name: 'sprite-animated-default',  genes: {} } },
    { id: 'sprite-animated-variant-a', name: 'Variant A SpriteAnimated', intent: 'variant',  seed: { $domain: 'sprite-animated', $name: 'sprite-animated-variant-a', genes: { intensity: 0.7 } } },
    { id: 'sprite-animated-variant-b', name: 'Variant B SpriteAnimated', intent: 'variant',  seed: { $domain: 'sprite-animated', $name: 'sprite-animated-variant-b', genes: { intensity: 0.3 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sprite-animated-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generateSpriteAnimated(seed as never, out)) as { filePath?: string };
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

  // Doctrine v2 Part VI.10 — declared strata for the Substrate Conformance Index.
  strata: ['form', 'motion', 'time'] as const,
  engineOwner: 'sprite-animated engine custodian',
};
registerContract(SpriteAnimatedQualityContract);
