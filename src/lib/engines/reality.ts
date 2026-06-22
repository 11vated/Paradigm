/**
 * Reality activation — bridge RealitySeed → field engine.
 *
 * Turns a typed RealitySeed into a concrete field artifact via the field
 * engine. The substrate elevation that lets WS29's typed surface
 * (12 unseen channels × 9 dimensions × counterfactual constants) produce
 * real output.
 *
 * Doctrine: 12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md Part III + WS29.
 * Added by paradigm-infinite/ws-30.
 */
import * as path from 'node:path';
import type { RealitySeed, FundamentalConstants, Dimension } from '../../seeds/reality-seed';
import { realityToFieldKind, STANDARD_CONSTANTS } from '../../seeds/reality-seed';
import { generateField, type FieldKind } from './field';
import { normalizeForEngine } from './outputpath';

export interface RealityRenderManifest {
  channel: string;
  dimensions: Dimension;
  fieldKind: FieldKind;
  primaryPath: string;
  auxPaths: string[];
  metrics: Record<string, unknown>;
  counterfactual: boolean;
  fundamentalConstants: Readonly<FundamentalConstants>;
}

/**
 * Render a RealitySeed to disk. Asserts the seed is well-formed, derives
 * the field kind via realityToFieldKind(), normalizes the output path
 * shape for the field engine, dispatches, and emits a typed manifest.
 *
 * Determinism: identical seed + same outDir = bit-identical output.
 */
export async function renderReality(seed: RealitySeed, outDir: string): Promise<RealityRenderManifest> {
  if (!seed || seed.$domain !== 'reality') {
    throw new Error('renderReality: not a RealitySeed (expected $domain="reality")');
  }
  const raw = realityToFieldKind(seed.channel);
  const fieldKind: FieldKind = raw === 'cosmology' ? 'cosmological' : (raw as FieldKind);
  const baseDir = path.join(outDir, seed.channel + '-' + String(seed.$hash ?? 'unknown').slice(0, 8));
  const outputPath = normalizeForEngine('field', fieldKind, baseDir);
  // RealitySeed extends Seed; the field engine accepts a Seed-shaped record.
  const out = await generateField({ kind: fieldKind, seed: seed as never, outputPath });
  return {
    channel: seed.channel,
    dimensions: seed.dimensions,
    fieldKind,
    primaryPath: out.primaryPath,
    auxPaths: (out as { auxPaths?: string[] }).auxPaths ?? [],
    metrics: ((out as { metrics?: Record<string, unknown> }).metrics) ?? {},
    counterfactual: !!seed.counterfactual,
    fundamentalConstants: seed.constants ?? STANDARD_CONSTANTS,
  };
}

/**
 * Render a batch of RealitySeeds in deterministic input order.
 * Failures are surfaced as errored manifest entries when {continueOnError}.
 */
export async function renderRealityBatch(
  seeds: RealitySeed[],
  outDir: string,
  opts: { continueOnError?: boolean } = {},
): Promise<RealityRenderManifest[]> {
  const out: RealityRenderManifest[] = [];
  for (const s of seeds) {
    try {
      out.push(await renderReality(s, outDir));
    } catch (e) {
      if (!opts.continueOnError) throw e;
      out.push({
        channel: s.channel,
        dimensions: s.dimensions,
        fieldKind: 'electromagnetic' as FieldKind,
        primaryPath: '',
        auxPaths: [],
        metrics: { error: (e as Error).message },
        counterfactual: !!s.counterfactual,
        fundamentalConstants: s.constants ?? STANDARD_CONSTANTS,
      });
    }
  }
  return out;
}
