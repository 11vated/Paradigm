/**
 * Engine: world — terrain, atmosphere, ecosystem, weather, time-of-day.
 *
 * Phase 0 cut: dispatches by kind to two existing world-tier generators:
 *  - world      → political/geographical world (regions, cities, rivers)
 *  - ecosystem  → biome + species + food-web simulation
 *
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part III. Engine layer adds no entropy.
 */
import * as fs from 'node:fs';
import type { Seed } from '../kernel/engines';
import type { Engine, EngineCapability } from './types';
import { generateWorld as growWorld } from '../kernel/generators/world';
import { generateEcosystem } from '../kernel/generators/ecosystem';

export type WorldKind = 'world' | 'ecosystem';

export interface WorldRequest {
  kind: WorldKind;
  seed: Seed;
  outputPath: string;
}

// Engine-level normalized artifact (avoids collision with generators/world.ts
// WorldArtifact which has a different domain-specific shape).
export interface WorldEngineArtifact {
  kind: WorldKind;
  primaryPath: string;
  auxPaths: string[];
  metrics: Record<string, number | string>;
  raw: unknown;
}

export const capability: EngineCapability = Object.freeze({
  id: 'world',
  name: 'World Engine',
  version: '0.1.0',
  outputs: ['svg', 'html', 'json'],
  composesWith: ['form', 'motion', 'field', 'mind', 'story'],
});

export async function generateWorld(req: WorldRequest): Promise<WorldEngineArtifact> {
  ensureDir(req.outputPath);
  switch (req.kind) {
    case 'world': {
      const out = await growWorld(req.seed, req.outputPath);
      return {
        kind: 'world',
        primaryPath: out.htmlPath,
        auxPaths: [out.svgPath, out.jsonPath],
        metrics: { regionCount: out.regionCount, cityCount: out.cityCount, riverCount: out.riverCount },
        raw: out,
      };
    }
    case 'ecosystem': {
      const out = await generateEcosystem(req.seed, req.outputPath);
      return {
        kind: 'ecosystem',
        primaryPath: out.htmlPath,
        auxPaths: [out.jsonPath],
        metrics: { speciesCount: out.speciesCount, biomeCount: out.biomeCount },
        raw: out,
      };
    }
    default: {
      const _exhaustive: never = req.kind;
      throw new Error(`world: unsupported kind ${String(_exhaustive)}`);
    }
  }
}

function ensureDir(p: string): void {
  try { fs.mkdirSync(p, { recursive: true }); } catch { /* p may be a file path */ }
}

export const engine: Engine = Object.freeze({
  capability,
  generate: generateWorld as unknown as (req: unknown) => Promise<unknown>,
  validate(output: unknown) {
    const o = output as { primaryPath?: string } | null;
    if (!o || typeof o.primaryPath !== 'string' || o.primaryPath.length === 0) {
      return { ok: false as const, reason: 'world artifact missing primaryPath' };
    }
    return { ok: true as const };
  },
});
