/**
 * Engine: field — the Unseen Renderer.
 *
 * Renders the aspects of reality that human senses cannot directly perceive:
 * electromagnetic fields, quantum wavefunctions, gravitational/cosmological
 * curvature, gauge fields. Per the doctrine, this is the substrate that
 * elevates Paradigm from a generative tool into a renderer of reality itself.
 *
 * Phase 0 cut: dispatches to three existing FDTD/Schrödinger/N-body
 * generators. Subsequent phases extend to neutrino fluxes, dark-matter
 * lensing approximations, Calabi–Yau projections, and the negative-space
 * reports defined in `02_Sovereign_Agent_Canon_Synthesis.md` §IV.
 *
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Parts III and VII.
 *
 * Determinism: passthrough. Each underlying generator builds its own
 * Xoshiro256StarStar from `seed.$hash`. The engine adds no entropy.
 */
import * as path from 'node:path';
import type { EngineCapability } from './types';
import { generateField as growField } from '../kernel/generators/field';
import { generateQuantum as growQuantum } from '../kernel/generators/quantum';
import { generateCosmology as growCosmology } from '../kernel/generators/cosmology';

export type FieldKind =
  | 'electromagnetic' //  Maxwell / FDTD — Ex, Ey, Bz on a grid
  | 'quantum' //          Schrödinger evolution — |ψ|², phase, probability current
  | 'cosmological'; //    N-body gravity — large-scale structure, lensing

export interface FieldRequest<K extends FieldKind = FieldKind> {
  seed: { $hash?: string; $domain?: string; genes?: Record<string, unknown> };
  kind: K;
  outputPath: string;
}

export interface FieldArtifact {
  kind: FieldKind;
  /** Primary visualisation (SVG/PNG/etc.). Always exists. */
  primaryPath: string;
  /** Companion data files (JSON snapshots, raw grids, etc.). */
  auxPaths: string[];
  /** Compact, kind-agnostic metrics for ranking, ranking, and golden hashes. */
  metrics: Record<string, number>;
  /** Raw generator result, preserved for callers that need it. */
  raw: unknown;
}

export const capability: EngineCapability = Object.freeze({
  id: 'field',
  name: 'Unseen Renderer',
  version: '0.1.0',
  outputs: ['svg', 'png', 'json', 'jsonl'],
  composesWith: ['form', 'motion', 'world'],
});

function normalizeEM(out: Awaited<ReturnType<typeof growField>>): FieldArtifact {
  return {
    kind: 'electromagnetic',
    primaryPath: out.svgPath ?? out.filePath,
    auxPaths: [out.filePath, ...(out.jsonPath ? [out.jsonPath] : [])].filter(
      (p) => p !== (out.svgPath ?? out.filePath),
    ),
    metrics: {
      gridSize: out.gridSize ?? 0,
      steps: out.steps ?? 0,
      peakMagnitude: out.peakMagnitude ?? 0,
      energyDensity: out.energyDensity ?? 0,
    },
    raw: out,
  };
}

function normalizeQuantum(out: Awaited<ReturnType<typeof growQuantum>>): FieldArtifact {
  return {
    kind: 'quantum',
    primaryPath: out.svgPath ?? out.filePath,
    auxPaths: [out.filePath, ...(out.jsonPath ? [out.jsonPath] : [])].filter(
      (p) => p !== (out.svgPath ?? out.filePath),
    ),
    metrics: {
      normalization: out.normalization ?? 1,
      groundStateEnergy: out.groundStateEnergy ?? 0,
      expectationX: out.expectationX ?? 0,
      expectationP: out.expectationP ?? 0,
      tunnelingProbability: out.tunnelingProbability ?? 0,
    },
    raw: out,
  };
}

function normalizeCosmology(
  out: Awaited<ReturnType<typeof growCosmology>>,
): FieldArtifact {
  return {
    kind: 'cosmological',
    primaryPath: out.svgPath ?? out.filePath,
    auxPaths: [out.filePath, ...(out.jsonPath ? [out.jsonPath] : [])].filter(
      (p) => p !== (out.svgPath ?? out.filePath),
    ),
    metrics: {
      bodies: out.bodyCount ?? 0,
      steps: out.timeSteps ?? 0,
      totalEnergy: (out.finalKE ?? 0) + (out.finalPE ?? 0),
      finalKE: out.finalKE ?? 0,
      finalPE: out.finalPE ?? 0,
    },
    raw: out,
  };
}

/**
 * Render an Unseen artifact from a seed.
 *
 * @throws if `kind` is not a known FieldKind (exhaustiveness guard).
 */
export async function generateField<K extends FieldKind>(
  req: FieldRequest<K>,
): Promise<FieldArtifact> {
  const { seed, kind, outputPath } = req;
  const out = path.resolve(outputPath);

  switch (kind) {
    case 'electromagnetic':
      return normalizeEM(await growField(seed as never, out));
    case 'quantum':
      return normalizeQuantum(await growQuantum(seed as never, out));
    case 'cosmological':
      return normalizeCosmology(await growCosmology(seed as never, out));
    default: {
      const exhaustive: never = kind;
      throw new Error(`field engine: unknown kind ${String(exhaustive)}`);
    }
  }
}

export const engine = Object.freeze({
  capability,
  generate: generateField,
});
