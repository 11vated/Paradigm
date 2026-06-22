/**
 * Reality Substrate — the doctrinal "render reality itself, including the unseen" seed type.
 *
 * Per 12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md Part III, the field
 * engine elevates Paradigm from a generative tool into a renderer of
 * reality. RealitySeed is the typed surface for that elevation: a seed
 * that names *which aspect of reality* to render — visible spectrum,
 * radio/IR/UV/X-ray/gamma fields, quantum wavefunctions, gravitational
 * curvature, higher-dimensional projections — alongside the fundamental
 * constants that parameterize the chosen physics.
 *
 * The 12 unseen channels enumerate the aspects of reality humans cannot
 * directly perceive. Each channel maps cleanly to a field-engine kind.
 *
 * Determinism: every reality seed is fully describable by its $hash; same
 * hash + same channel + same dimensions → same field render forever.
 *
 * Added by paradigm-infinite/ws-29.
 */
import type { Seed } from './index';

/** Aspects of reality the field engine can render. */
export const UNSEEN_CHANNELS = [
  'electromagnetic-radio',
  'electromagnetic-microwave',
  'electromagnetic-infrared',
  'electromagnetic-visible',
  'electromagnetic-ultraviolet',
  'electromagnetic-xray',
  'electromagnetic-gamma',
  'gravitational',
  'quantum-wavefunction',
  'neutrino-flux',
  'magnetic-vector',
  'cosmological-curvature',
] as const;

export type UnseenChannel = typeof UNSEEN_CHANNELS[number];

/** Higher-dimensional projection targets supported by the substrate. */
export const DIMENSIONS = [3, 4, 5, 6, 7, 8, 10, 11, 26] as const;
export type Dimension = typeof DIMENSIONS[number];

/**
 * Fundamental constants of the rendered universe. Defaults match our
 * universe; alternate values explore counterfactual physics. Per the
 * doctrine, alternate-physics rendering is a first-class capability.
 */
export interface FundamentalConstants {
  /** Speed of light (m/s). */
  c: number;
  /** Planck's constant (J·s). */
  h: number;
  /** Newton's gravitational constant (m³/(kg·s²)). */
  G: number;
  /** Fine-structure constant (dimensionless). */
  alpha: number;
  /** Cosmological constant (m⁻²). */
  Lambda: number;
  /** Vacuum permittivity (F/m). */
  epsilon0: number;
}

export const STANDARD_CONSTANTS: Readonly<FundamentalConstants> = Object.freeze({
  c: 299792458,
  h: 6.62607015e-34,
  G: 6.67430e-11,
  alpha: 7.2973525693e-3,
  Lambda: 1.1056e-52,
  epsilon0: 8.8541878128e-12,
});

/**
 * RealitySeed — a Seed augmented with reality-substrate parameters.
 * Maps cleanly to the field engine's `kind` parameter.
 */
export interface RealitySeed extends Seed {
  $domain: 'reality';
  /** Which aspect of reality to render. */
  channel: UnseenChannel;
  /** Dimensions of the rendered field. Default 3. */
  dimensions: Dimension;
  /** Fundamental constants — defaults to STANDARD_CONSTANTS (our universe). */
  constants: Readonly<FundamentalConstants>;
  /** Optional counterfactual flag — when true, alternate-physics rendering is expected. */
  counterfactual?: boolean;
  /** Human prompt that grew this seed (provenance). */
  prompt?: string;
}

/** Deterministic hash derivation from prompt + channel + dimensions + constants. */
export function deriveRealitySeedHash(
  prompt: string,
  channel: UnseenChannel,
  dimensions: Dimension,
  constants: FundamentalConstants,
): string {
  const input = JSON.stringify({ prompt, channel, dimensions, constants });
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < input.length; i++) {
    h = BigInt.asUintN(64, (h ^ BigInt(input.charCodeAt(i))) * 0x100000001b3n);
  }
  return h.toString(16).padStart(16, '0');
}

export interface CreateRealitySeedOptions {
  prompt: string;
  channel: UnseenChannel;
  dimensions?: Dimension;
  constants?: Partial<FundamentalConstants>;
  counterfactual?: boolean;
}

/** Build a RealitySeed deterministically. */
export function createRealitySeed(opts: CreateRealitySeedOptions): RealitySeed {
  if (!opts.prompt || typeof opts.prompt !== 'string') {
    throw new Error('createRealitySeed: prompt is required (non-empty string)');
  }
  if (!(UNSEEN_CHANNELS as readonly string[]).includes(opts.channel)) {
    throw new Error(`createRealitySeed: unknown channel "${opts.channel}"`);
  }
  const dimensions = opts.dimensions ?? 3;
  if (!(DIMENSIONS as readonly number[]).includes(dimensions)) {
    throw new Error(`createRealitySeed: unsupported dimensions ${dimensions}`);
  }
  const constants: FundamentalConstants = Object.freeze({
    ...STANDARD_CONSTANTS,
    ...opts.constants,
  });
  const counterfactual = opts.counterfactual === true ||
    (opts.constants !== undefined && JSON.stringify(constants) !== JSON.stringify(STANDARD_CONSTANTS));
  const hash = deriveRealitySeedHash(opts.prompt, opts.channel, dimensions, constants);
  return {
    $hash: hash,
    $domain: 'reality',
    $name: `reality:${opts.channel}:${dimensions}d`,
    $lineage: { generation: 0, operation: 'createRealitySeed' },
    channel: opts.channel,
    dimensions,
    constants,
    counterfactual,
    prompt: opts.prompt,
    genes: {
      channel: { type: 'string', value: opts.channel },
      dimensions: { type: 'number', value: dimensions },
      counterfactual: { type: 'boolean', value: counterfactual },
    },
  };
}

/** Map a RealitySeed channel to the field-engine kind it should dispatch to. */
export function realityToFieldKind(channel: UnseenChannel): 'electromagnetic' | 'quantum' | 'cosmology' {
  if (channel === 'quantum-wavefunction') return 'quantum';
  if (channel === 'gravitational' || channel === 'cosmological-curvature') return 'cosmology';
  return 'electromagnetic';
}
