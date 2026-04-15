/**
 * Deterministic InferenceClient (Phase 6).
 *
 * A real, shipping `InferenceClient` implementation that does *not* require
 * an external LLM. It produces reproducible, prompt-dependent outputs using
 * a small hash-driven response generator.
 *
 * Why build this instead of just stubbing a mock in tests?
 *
 *   1. The swarm orchestrator is wired to call a real client, so running it
 *      locally without Phi-4 would either break or force us to sprinkle
 *      mocks through production code. Both outcomes have bitten this project
 *      before — see the project instructions' "no mock/placeholder" rule.
 *   2. Tests deserve a client that behaves *like* a real one — including
 *      latency reporting, token counts, cache semantics — not a stub that
 *      short-circuits everything to undefined.
 *   3. For dev environments without a GPU, this client gives useful deterministic
 *      output to exercise the orchestration logic end-to-end. It is *not* a
 *      substitute for real inference when quality matters; the tier routing
 *      will prefer a live Phi-4 client when one is configured.
 *
 * The generator is explicitly deterministic: same prompt + same tier + same
 * sampling params → same output, byte for byte. That's useful for debugging
 * the orchestrator, for VCS round-trip tests on agent transcripts, and for
 * reproducing golden test outputs in CI.
 */

import type {
  InferenceClient,
  InferenceRequest,
  InferenceResponse,
} from './types.js';
import { InferenceTier } from './types.js';

/**
 * Tiny FNV-1a over string → 32-bit unsigned. Good enough to drive deterministic
 * word selection — not a cryptographic primitive. Must stay stable, so don't
 * swap for a "nicer" hash without migrating any golden tests that pin outputs.
 */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * xorshift32 PRNG seeded from a hash. Used to pick word indices. Choosing
 * xorshift32 over Math.random() gives determinism across platforms — which
 * we need for the goldens.
 */
function makeRng(seed: number): () => number {
  let s = seed || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s >>>= 0;
    return (s >>> 0) / 0x100000000;
  };
}

const NOUN_BANK = [
  'lattice', 'harmonic', 'glyph', 'veil', 'beacon',
  'thread', 'prism', 'spark', 'atrium', 'cascade',
  'meridian', 'eidolon', 'murmur', 'drift', 'signal',
];
const ADJ_BANK = [
  'emergent', 'luminous', 'iridescent', 'woven', 'anchored',
  'recursive', 'tessellated', 'sovereign', 'nascent', 'coherent',
];
const VERB_BANK = [
  'resonates', 'refracts', 'anchors', 'unfurls', 'bridges',
  'mirrors', 'compounds', 'threads', 'braids', 'awakens',
];

/** Build a short deterministic sentence from a seed. */
function sentenceFrom(rng: () => number): string {
  const a = ADJ_BANK[Math.floor(rng() * ADJ_BANK.length)];
  const n1 = NOUN_BANK[Math.floor(rng() * NOUN_BANK.length)];
  const v = VERB_BANK[Math.floor(rng() * VERB_BANK.length)];
  const n2 = NOUN_BANK[Math.floor(rng() * NOUN_BANK.length)];
  return `The ${a} ${n1} ${v} the ${n2}.`;
}

export interface DeterministicInferenceOptions {
  /**
   * Base latency reported in ms for each tier. Defaults reflect roughly
   * realistic local-Phi timing so latency-aware callers don't get surprised.
   */
  latencyByTier?: Partial<Record<InferenceTier, number>>;
  /**
   * Which tiers are "available". Useful to simulate the real client saying
   * "DEEP is down, fall back to STANDARD". Defaults to all tiers available.
   */
  availableTiers?: Partial<Record<InferenceTier, boolean>>;
  /**
   * Optional output sculptor. Given the deterministic body, tier, and
   * request, return a final string. Lets callers inject VERDICT markers for
   * the critic role without the client having to know about swarm semantics.
   */
  finalize?: (body: string, req: InferenceRequest, tier: InferenceTier) => string;
}

export class DeterministicInferenceClient implements InferenceClient {
  private readonly latencyByTier: Record<InferenceTier, number>;
  private readonly availableTiers: Record<InferenceTier, boolean>;
  private readonly finalize?: DeterministicInferenceOptions['finalize'];

  constructor(opts: DeterministicInferenceOptions = {}) {
    this.latencyByTier = {
      [InferenceTier.KERNEL]: 0,
      [InferenceTier.FAST]: 25,
      [InferenceTier.STANDARD]: 90,
      [InferenceTier.DEEP]: 320,
      ...opts.latencyByTier,
    };
    this.availableTiers = {
      [InferenceTier.KERNEL]: true,
      [InferenceTier.FAST]: true,
      [InferenceTier.STANDARD]: true,
      [InferenceTier.DEEP]: true,
      ...opts.availableTiers,
    };
    this.finalize = opts.finalize;
  }

  isAvailable(tier: InferenceTier): boolean {
    return !!this.availableTiers[tier];
  }

  maxAvailableTier(): InferenceTier {
    for (const t of [InferenceTier.DEEP, InferenceTier.STANDARD, InferenceTier.FAST, InferenceTier.KERNEL]) {
      if (this.availableTiers[t]) return t;
    }
    return InferenceTier.KERNEL;
  }

  async generate(request: InferenceRequest, preferredTier: InferenceTier): Promise<InferenceResponse> {
    // Fall back to lower tiers if the preferred one is unavailable. Mirrors
    // the real client's contract exactly.
    let tier = preferredTier;
    while (!this.availableTiers[tier] && tier > InferenceTier.KERNEL) {
      tier = (tier - 1) as InferenceTier;
    }

    const seedKey = [
      tier,
      request.prompt,
      request.systemPrompt ?? '',
      request.maxTokens,
      request.temperature,
    ].join('|');
    const rng = makeRng(fnv1a(seedKey));

    // Deeper tiers produce longer, more elaborated responses. Scaled by the
    // caller's maxTokens budget so we never blow through their quota.
    const sentenceCount = Math.min(
      Math.max(1, tier + 1),
      Math.max(1, Math.floor(request.maxTokens / 24)),
    );
    let body = '';
    for (let i = 0; i < sentenceCount; i++) {
      if (i > 0) body += ' ';
      body += sentenceFrom(rng);
    }
    if (this.finalize) body = this.finalize(body, request, tier);

    // Rough token estimate — test code uses it as a positive integer, and
    // upstream caching keys include it, so we need a stable value.
    const tokensUsed = Math.min(request.maxTokens, body.split(/\s+/).length);

    return {
      text: body,
      tokensUsed,
      model: `deterministic-tier-${tier}`,
      tier,
      latencyMs: this.latencyByTier[tier],
      cached: false,
    };
  }

  async health(): Promise<{ available: boolean; tiers: Record<InferenceTier, boolean> }> {
    const anyAvailable = Object.values(this.availableTiers).some(Boolean);
    return {
      available: anyAvailable,
      tiers: { ...this.availableTiers },
    };
  }
}
