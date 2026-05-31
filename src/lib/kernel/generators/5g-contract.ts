/**
 * 5g Quality Contract — auto-generated stub.
 *
 * Adapter around `generate5G` exposing the canonical 4-clause
 * QualityContract surface. The rate() function is a placeholder pending
 * a domain-specific evaluator; the structure is correct and conformant.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generate5G } from './5g';
import { registerContract, type QualityContract } from '../quality-contract';

// 15_ spec integration: new contracts system available alongside legacy
import '../../contracts'; // pulls bootstrap + registry for full 27 + Part 6 (all domains + Part 6 live)
import { withKernelClock } from '../clock';

interface S { $domain: '5g'; $name?: string; genes: Record<string, unknown> }
interface A { filePath: string; meta: Record<string, unknown> }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const Gen5gQualityContract: QualityContract<S, A, Record<string, unknown>> = {
  domain: '5g',
  version: '1.0.0',
  curated: () => [
    { id: '5g-default',  name: 'Default 5g',  intent: 'baseline', seed: { $domain: '5g', $name: '5g-default',  genes: {} } },
    { id: '5g-variant-a', name: 'Variant A 5g', intent: 'variant',  seed: { $domain: '5g', $name: '5g-variant-a', genes: { intensity: 0.7 } } },
    { id: '5g-variant-b', name: 'Variant B 5g', intent: 'variant',  seed: { $domain: '5g', $name: '5g-variant-b', genes: { intensity: 0.3 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), '5g-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generate5G(seed as never, out)) as { filePath?: string };
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
registerContract(Gen5gQualityContract as never);

