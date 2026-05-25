/**
 * Engine: motion — kinematics, dynamics, particles, integration, constraints.
 *
 * Phase 0 cut: dispatches by kind to three existing solvers:
 *  - physics   → rigid/soft/fluid body simulation
 *  - particle  → emitter-driven particle systems with force fields
 *  - dance     → choreographed skeletal motion (style-conditioned)
 *
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part III. The engine layer adds no entropy; same seed → bit-identical
 * artifact path-set + metrics.
 */
import * as fs from 'node:fs';
import type { Seed } from '../kernel/engines';
import type { Engine, EngineCapability } from './types';
import { generatePhysics } from '../kernel/generators/physics';
import { generateParticle } from '../kernel/generators/particle';
import { generateDance } from '../kernel/generators/dance';

export type MotionKind = 'physics' | 'particle' | 'dance';

export interface MotionRequest {
  kind: MotionKind;
  seed: Seed;
  outputPath: string;
}

export interface MotionArtifact {
  kind: MotionKind;
  primaryPath: string;
  auxPaths: string[];
  metrics: Record<string, number | string>;
  raw: unknown;
}

export const capability: EngineCapability = Object.freeze({
  id: 'motion',
  name: 'Motion Engine',
  version: '0.1.0',
  outputs: ['json', 'html', 'jsonl'],
  composesWith: ['form', 'field', 'world', 'sound'],
});

export async function generateMotion(req: MotionRequest): Promise<MotionArtifact> {
  ensureDir(req.outputPath);
  switch (req.kind) {
    case 'physics': {
      const out = await generatePhysics(req.seed, req.outputPath);
      return {
        kind: 'physics',
        primaryPath: out.htmlPath,
        auxPaths: [out.jsonPath],
        metrics: { frameCount: out.frameCount, objectCount: out.objectCount },
        raw: out,
      };
    }
    case 'particle': {
      const out = await generateParticle(req.seed, req.outputPath);
      return {
        kind: 'particle',
        primaryPath: out.htmlPath,
        auxPaths: [out.jsonPath],
        metrics: { particleCount: out.particleCount, emitterCount: out.emitterCount },
        raw: out,
      };
    }
    case 'dance': {
      const out = await generateDance(req.seed, req.outputPath);
      return {
        kind: 'dance',
        primaryPath: (out as { choreoPath?: string; filePath: string }).choreoPath
          ?? (out as { filePath: string }).filePath,
        auxPaths: [(out as { filePath: string }).filePath],
        metrics: { style: (out as { style: string }).style },
        raw: out,
      };
    }
    default: {
      const _exhaustive: never = req.kind;
      throw new Error(`motion: unsupported kind ${String(_exhaustive)}`);
    }
  }
}

function ensureDir(p: string): void {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export const engine: Engine = Object.freeze({
  capability,
  generate: generateMotion as unknown as (req: unknown) => Promise<unknown>,
});
