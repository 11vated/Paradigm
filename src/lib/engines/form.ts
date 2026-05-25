/**
 * Engine: form
 *
 * The first working substrate engine. Adapts the existing form-family
 * generators (`character`, `sprite`, `typography`) to the engine contract
 * defined in `./types.ts`.
 *
 * Per `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part III: `form` owns geometry, mesh, topology, surface, volume, sprite,
 * typography. This adapter is the first of nine engines to be wired.
 *
 * Determinism contract:
 * - Engine is pure modulo the kernel clock + the seeded RNG carried by the
 *   underlying generator.
 * - The underlying generators each construct their own `Xoshiro256StarStar`
 *   from `seed.$hash` — the engine adds no entropy.
 * - Same seed + same `kind` + same `outputPath` MUST yield bit-identical
 *   artifacts. Cross-machine reproducibility is enforced by the golden hash
 *   suite (`npm run golden:verify`).
 */
import type { Seed } from '../kernel/engines';
import { generateCharacterV3 } from '../kernel/generators/character';
import { generateSpriteV3 } from '../kernel/generators/sprite';
import { generateTypographyV3 } from '../kernel/generators/typography';
import type { EngineCapability } from './types';

/** Form kinds currently wired to the engine. */
export type FormKind = 'character' | 'sprite' | 'typography';

/** Normalized output shape across all form kinds. */
export interface FormArtifact {
  /** Which form variant produced this artifact. */
  kind: FormKind;
  /** Primary on-disk artifact (GLTF / atlas / SVG path). */
  primaryPath: string;
  /** Auxiliary paths produced by the generator (e.g. HTML companion). */
  auxPaths: string[];
  /** Normalized scalar metrics for fitness / quality contracts. */
  metrics: Readonly<Record<string, number>>;
  /** Original generator return value, untouched. */
  raw: unknown;
}

export interface FormRequest {
  seed: Seed;
  kind: FormKind;
  outputPath: string;
}

export const capability: EngineCapability = {
  id: 'form',
  name: 'Form Engine',
  version: '0.2.0',
  outputs: ['gltf', 'obj', 'png', 'svg', 'html'],
  composesWith: ['matter', 'motion', 'mind', 'story'],
};

/**
 * Render a form artifact from a seed.
 *
 * Single deterministic dispatch surface for the form engine. Returns a
 * normalized `FormArtifact` with metrics keyed for quality contracts and
 * fitness functions across the substrate.
 */
export async function generateForm(req: FormRequest): Promise<FormArtifact> {
  const { seed, kind, outputPath } = req;
  switch (kind) {
    case 'character': {
      const r = await generateCharacterV3(seed as never, outputPath);
      return {
        kind,
        primaryPath: r.filePath,
        auxPaths: r.textures.slice(),
        metrics: {
          vertices: r.vertices,
          faces: r.faces,
          textureCount: r.textures.length,
          animations: r.animations,
          bones: r.bones,
        },
        raw: r,
      };
    }
    case 'sprite': {
      const r = await generateSpriteV3(seed as never, outputPath);
      return {
        kind,
        primaryPath: r.filePath,
        auxPaths: [r.atlas],
        metrics: {
          frames: r.frames,
          resolution: r.resolution,
          paletteSize: r.paletteSize,
        },
        raw: r,
      };
    }
    case 'typography': {
      const r = await generateTypographyV3(seed as never, outputPath);
      return {
        kind,
        primaryPath: r.svgPath,
        auxPaths: [r.htmlPath],
        metrics: {
          glyphs: r.glyphCount,
        },
        raw: r,
      };
    }
    default: {
      // Exhaustiveness — compile-time guaranteed
      const _exhaustive: never = kind;
      throw new Error(`form engine: unknown kind: ${_exhaustive as string}`);
    }
  }
}

/** Engine handle for the dispatcher. */
export const engine = Object.freeze({
  capability,
  generate: generateForm,
});

export type FormEngine = typeof engine;
