/**
 * Engine contract types — the typed substrate.
 *
 * Every engine in `src/lib/engines/` MUST conform to `Engine<TInput, TOutput>`.
 * Engines are pure (modulo the kernel clock + seeded RNG) and deterministic
 * by construction. They MUST NOT import wall-clock or unseeded RNG; route all
 * non-determinism through `src/lib/kernel/clock.ts` + `Xoshiro256StarStar`.
 */

import type { Xoshiro256StarStar } from '../kernel/rng';

export interface EngineContext {
  /** Seeded RNG. The only legal source of non-determinism inside an engine. */
  rng: Xoshiro256StarStar;
  /** Kernel clock — monotonic, seedable, deterministic. */
  now: () => number;
  /** Quality tier — "draft" | "production" | "render". */
  quality: 'draft' | 'production' | 'render';
  /** Optional output directory for binary artifacts (GLTF, WAV, PNG, ...). */
  outDir?: string;
  /** Cancellation signal for long-running renders. */
  signal?: AbortSignal;
}

export interface EngineCapability {
  /** Stable engine id, e.g. "form", "motion". */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Engine version, semver. */
  version: string;
  /** Output artifact MIME types this engine can emit. */
  outputs: string[];
  /** Other engines this engine composes with. */
  composesWith: string[];
}

export interface EngineContract<TInput, TOutput> {
  capability: EngineCapability;
  /** Pure deterministic generation step. */
  generate(input: TInput, ctx: EngineContext): Promise<TOutput> | TOutput;
  /** Quality contract — assert output meets domain invariants. */
  validate(output: TOutput): { ok: true } | { ok: false; reason: string };
}

export type Engine<I = unknown, O = unknown> = EngineContract<I, O>;
