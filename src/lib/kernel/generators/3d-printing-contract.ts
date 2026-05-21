/**
 * 3dPrinting Quality Contract — auto-generated stub.
 *
 * Adapter around `generate3DPrinting` exposing the canonical 4-clause
 * QualityContract surface. The rate() function is a placeholder pending
 * a domain-specific evaluator; the structure is correct and conformant.
 */
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { generate3DPrinting } from './3d-printing';
import { registerContract, type QualityContract } from '../quality-contract';
import { withKernelClock } from '../clock';

interface S { $domain: '3d-printing'; $name?: string; genes: Record<string, unknown> }
interface A { filePath: string; meta: Record<string, unknown> }

function hashArtifact(a: A): string {
  return crypto.createHash('sha256').update(a.filePath + JSON.stringify(a.meta)).digest('hex');
}

export const Gen3dPrintingQualityContract: QualityContract<S, A, Record<string, unknown>> = {
  domain: '3d-printing',
  version: '1.0.0',
  curated: () => [
    { id: '3d-printing-default',  name: 'Default 3dPrinting',  intent: 'baseline', seed: { $domain: '3d-printing', $name: '3d-printing-default',  genes: {} } },
    { id: '3d-printing-variant-a', name: 'Variant A 3dPrinting', intent: 'variant',  seed: { $domain: '3d-printing', $name: '3d-printing-variant-a', genes: { intensity: 0.7 } } },
    { id: '3d-printing-variant-b', name: 'Variant B 3dPrinting', intent: 'variant',  seed: { $domain: '3d-printing', $name: '3d-printing-variant-b', genes: { intensity: 0.3 } } },
  ],
  synthesize: async (seed) => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), '3d-printing-'));
    const out = path.join(dir, 'a.json');
    const r = await withKernelClock(0, () => generate3DPrinting(seed as never, out)) as { filePath?: string };
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
registerContract(Gen3dPrintingQualityContract as never);
