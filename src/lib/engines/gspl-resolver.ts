/**
 * GSPL ↔ engine substrate resolver bridge.
 *
 * Wires the GSPL interpreter's `engine <id> { ... }` block to the live
 * 9-engine registry without making the kernel depend on src/lib/engines.
 *
 * Doctrine: 12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md Part V (GSPL v∞).
 * Added by paradigm-infinite/ws-24.
 */
import { ENGINES, getEngine, type EngineId } from './index';

export interface GsplEngineResolver {
  dispatch(engineId: string, request: Record<string, unknown>): Promise<unknown>;
}

export interface CreateResolverOptions {
  /** Default seed used when the GSPL block omits a `seed` entry. */
  defaultSeedHash?: string;
  /** Default outputPath used when the block omits an `outputPath`. */
  defaultOutputPath?: string;
  /** Strict mode: throw on unknown engine ids. Default true. */
  strict?: boolean;
}

const KNOWN_IDS: ReadonlySet<string> = new Set(Object.keys(ENGINES) as string[]);

function buildSeed(hash: string): { $hash: string } {
  return { $hash: hash };
}

/**
 * Build a resolver bridge that the GSPL interpreter can hand each
 * `engine <id> { ... }` block to.
 *
 * The resolver:
 *   1. Validates the engine id against the registry.
 *   2. Builds a `(seed, kind, outputPath, ...rest)` request from the
 *      block entries, filling in defaults where the block omits them.
 *   3. Invokes the engine's generate() function and returns the artifact.
 */
export function createGsplEngineResolver(
  opts: CreateResolverOptions = {},
): GsplEngineResolver {
  const strict = opts.strict !== false;
  return {
    async dispatch(engineId: string, request: Record<string, unknown>) {
      if (!KNOWN_IDS.has(engineId)) {
        if (strict) {
          throw new Error(
            `GSPL engine dispatch: unknown engine "${engineId}". ` +
            `Known: ${Array.from(KNOWN_IDS).sort().join(', ')}`,
          );
        }
        return { __engineDispatch: true, engine: engineId, status: 'unknown-engine' };
      }
      const eng = getEngine(engineId as EngineId)!;
      const seedHash =
        (typeof request.seed === 'string' && request.seed) ||
        opts.defaultSeedHash ||
        'gspl-engine-default-seed';
      const outputPath =
        (typeof request.outputPath === 'string' && request.outputPath) ||
        opts.defaultOutputPath ||
        '/tmp/paradigm-gspl-engine-out';
      const kind = (request.kind as string | undefined) ?? '';
      const finalRequest = {
        ...request,
        kind,
        seed: buildSeed(seedHash),
        outputPath,
      };
      return eng.generate(finalRequest as any, {} as any);
    },
  };
}

/** Inspect-only resolver — never calls generate(); returns a structured
 * record describing what would have been dispatched. Useful for tests,
 * lint, and dry-run validation of GSPL programs. */
export function createInspectResolver(): GsplEngineResolver {
  return {
    async dispatch(engineId: string, request: Record<string, unknown>) {
      return {
        __engineDispatch: 'inspect',
        engine: engineId,
        request,
        known: KNOWN_IDS.has(engineId),
      };
    },
  };
}
