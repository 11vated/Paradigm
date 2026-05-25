/**
 * Engine composition combinator.
 *
 * Provides `compose(a, b, ...)` and the binary `chain(a, b)` operator that
 * sequence engine invocations against a shared seed, threading the upstream
 * artifact's `primaryPath` (and optionally aux paths) into the downstream
 * engine's request. The result is itself an Engine — composition is closed
 * over the engine algebra.
 *
 * Doctrine: 12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md Part III (substrate
 * composability) + Part IV (Multiverse Director uses compose as its primary
 * mechanism for tying engines together).
 *
 * Determinism: compose adds no entropy. The composed engine's output is a
 * pure function of (seed, upstream artifacts), which themselves are pure
 * functions of seed. Replay yields bit-identical results.
 */
import type { Engine, EngineCapability, EngineContext } from './types';

/**
 * The shape every Engine's `generate` accepts. Engines define their own
 * concrete request types but they share these fields. The compose layer
 * uses only the seed + outputPath + optional `upstream` aux.
 */
interface MinimalRequest {
  kind?: string;
  seed: { $hash?: string; $domain?: string; $kind?: string } | unknown;
  outputPath: string;
  upstream?: Array<{ engine: string; primaryPath: string }>;
}

interface MinimalArtifact {
  kind?: string;
  primaryPath: string;
  auxPaths?: string[];
  metrics?: Record<string, unknown>;
  raw?: unknown;
}

export interface ComposeOptions {
  /** Optional id for the composed engine. Defaults to `compose(a→b→…)`. */
  id?: string;
  /** Optional human-friendly name. Defaults to `<a>+<b>+…`. */
  name?: string;
  /**
   * Per-step request builder. Given the upstream artifact and the original
   * request to compose(), produce the request for the next engine. The
   * default behavior threads upstream as a parallel `upstream` array but
   * leaves seed/outputPath untouched, so the next engine can opt in.
   */
  threadRequest?: (
    prevArtifact: MinimalArtifact,
    fromEngineId: string,
    originalReq: MinimalRequest,
  ) => MinimalRequest;
}

/**
 * Compose two or more engines into a single engine that runs them in
 * sequence. The composed engine's `generate` returns an array of artifacts
 * (one per stage) plus a final `primaryPath` that is the last stage's path.
 *
 * Throws synchronously when given fewer than 2 engines.
 */
export function compose(
  ...engines: Engine[]
): Engine {
  return composeWithOptions({}, ...engines);
}

export function composeWithOptions(
  opts: ComposeOptions,
  ...engines: Engine[]
): Engine {
  if (engines.length < 2) {
    throw new Error('compose requires at least 2 engines');
  }

  const id =
    opts.id ?? `compose(${engines.map((e) => e.capability.id).join('→')})`;
  const name =
    opts.name ?? engines.map((e) => e.capability.name).join(' + ');

  // Composed engine outputs = union of every stage's outputs.
  const outputs = Array.from(
    new Set(engines.flatMap((e) => e.capability.outputs)),
  );
  // composesWith = engines we can chain further with (anything we already
  // compose with at the last stage).
  const composesWith = Array.from(
    new Set(engines[engines.length - 1].capability.composesWith ?? []),
  );

  const capability: EngineCapability = Object.freeze({
    id,
    name,
    version: '0.1.0',
    outputs,
    composesWith,
  });

  const thread = opts.threadRequest ?? defaultThread;

  const composedEngine: Engine = Object.freeze({
    capability,
    generate: async (req: unknown, ctx?: EngineContext): Promise<unknown> => {
      const initial = req as MinimalRequest;
      const stages: Array<{ engine: string; artifact: MinimalArtifact }> = [];
      let current = initial;
      const effectiveCtx: EngineContext =
        ctx ??
        ({
          rng: undefined as unknown,
          now: () => 0,
          quality: 'production',
        } as unknown as EngineContext);
      for (let i = 0; i < engines.length; i++) {
        const eng = engines[i];
        const out = (await eng.generate(current as never, effectiveCtx)) as MinimalArtifact;
        stages.push({ engine: eng.capability.id, artifact: out });
        if (i < engines.length - 1) {
          current = thread(out, eng.capability.id, current);
        }
      }
      const last = stages[stages.length - 1].artifact;
      return {
        kind: id,
        primaryPath: last.primaryPath,
        auxPaths: stages.flatMap((s) => s.artifact.auxPaths ?? []),
        metrics: {
          stages: stages.length,
          stageIds: stages.map((s) => s.engine),
        },
        stages,
        raw: { stages, finalArtifact: last },
      };
    },
    validate: (output: unknown) => {
      const o = output as { primaryPath?: string; stages?: unknown[] } | null;
      if (!o || typeof o.primaryPath !== 'string' || o.primaryPath.length === 0) {
        return { ok: false as const, reason: `${id}: composed artifact missing primaryPath` };
      }
      if (!Array.isArray(o.stages) || o.stages.length !== engines.length) {
        return { ok: false as const, reason: `${id}: stages length mismatch` };
      }
      return { ok: true as const };
    },
  });

  return composedEngine;
}

/**
 * Default request-threading: keep seed + outputPath stable, append the
 * upstream artifact to a parallel `upstream` array. Downstream engines can
 * ignore this field — they remain backwards-compatible.
 */
function defaultThread(
  prev: MinimalArtifact,
  fromId: string,
  original: MinimalRequest,
): MinimalRequest {
  const upstream = (original.upstream ?? []).concat({
    engine: fromId,
    primaryPath: prev.primaryPath,
  });
  return { ...original, upstream };
}

/**
 * Convenience binary operator. `chain(a, b) === compose(a, b)`.
 */
export function chain(a: Engine, b: Engine): Engine {
  return compose(a, b);
}
