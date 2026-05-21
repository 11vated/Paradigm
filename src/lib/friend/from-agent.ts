/**
 * Friend × Sovereign-Agent bridge
 *
 * Translate the Sovereign Agent's ResolvedIntent into a typed
 * FriendSeedData. The template-bridge speaks in canonical agent
 * paths (`body.bigFive.openness`, `bond.warmth`, `persona.archetype`,
 * `body.attachment`); the Friend domain has its own type shape
 * (BigFive lives on persona, bond uses `initialTrust/initialWarmth`,
 * etc.). This module is the explicit, narrow translator.
 */

import { createHash } from 'node:crypto';
import { createFriendSeed } from './genesis';
import { mutateFriend, breedFriends } from './breeding';
import type { FriendSeedData, BigFive } from './types';
import type { ResolvedIntent, ResolvedGeneSpec } from '../intelligence/agent/types';

function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }

function specAt(intent: ResolvedIntent, path: string): ResolvedGeneSpec | undefined {
  return intent.geneSpecs.find((g) => g.path === path);
}

function asNumber(spec: ResolvedGeneSpec | undefined, fallback: number): number {
  if (!spec) return fallback;
  if (typeof spec.value === 'number') return spec.value;
  const n = Number(spec.value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(spec: ResolvedGeneSpec | undefined): string | undefined {
  if (!spec) return undefined;
  return typeof spec.value === 'string' ? spec.value : undefined;
}

function asStringArray(spec: ResolvedGeneSpec | undefined): string[] | undefined {
  if (!spec) return undefined;
  if (Array.isArray(spec.value) && spec.value.every((x) => typeof x === 'string')) {
    return spec.value as string[];
  }
  return undefined;
}

/** SHA-256 over the agent's resolved intent + a salt — stable, deterministic. */
function deriveAgentSeedHash(intent: ResolvedIntent, salt: string = ''): string {
  const payload = JSON.stringify({
    raw: intent.intent.raw,
    top: intent.intent.top,
    sub: intent.intent.sub,
    template: intent.templateId,
    specs: intent.geneSpecs.map((g) => ({ p: g.path, v: g.value })),
    salt,
  });
  return createHash('sha256').update(payload).digest('hex');
}

/**
 * Apply agent overrides to a base FriendSeed. Maps:
 *   body.bigFive.*       → persona.bigFive.*
 *   bond.warmth          → bond.initialWarmth
 *   bond.trust           → bond.initialTrust
 *   bond.loyalty         → persona.values (append "loyalty")
 *   persona.archetype    → persona.values (append archetype name)
 *   narrative.tone       → ignored (used elsewhere)
 *   body.attachment      → ignored (no destination yet — TODO when Friend grows attachment)
 */
function applyOverrides(seed: FriendSeedData, intent: ResolvedIntent): FriendSeedData {
  const persona = { ...seed.genes.persona, bigFive: { ...seed.genes.persona.bigFive } };
  const bond = { ...seed.genes.bond };

  const bf: BigFive = persona.bigFive;
  bf.openness = clamp01(asNumber(specAt(intent, 'body.bigFive.openness'), bf.openness));
  bf.conscientiousness = clamp01(asNumber(specAt(intent, 'body.bigFive.conscientiousness'), bf.conscientiousness));
  bf.extraversion = clamp01(asNumber(specAt(intent, 'body.bigFive.extraversion'), bf.extraversion));
  bf.agreeableness = clamp01(asNumber(specAt(intent, 'body.bigFive.agreeableness'), bf.agreeableness));
  bf.neuroticism = clamp01(asNumber(specAt(intent, 'body.bigFive.neuroticism'), bf.neuroticism));

  bond.initialWarmth = clamp01(asNumber(specAt(intent, 'bond.warmth'), bond.initialWarmth));
  bond.initialTrust = clamp01(asNumber(specAt(intent, 'bond.trust'), bond.initialTrust));

  const values = [...(persona.values ?? [])];
  const loyaltySpec = specAt(intent, 'bond.loyalty');
  if (loyaltySpec && asNumber(loyaltySpec, 0) > 0.7 && !values.includes('loyalty')) values.push('loyalty');
  const archetype = asString(specAt(intent, 'persona.archetype'));
  if (archetype && !values.includes(archetype)) values.push(archetype);
  persona.values = values;

  const interests = asStringArray(specAt(intent, 'persona.interests'));
  if (interests) persona.interests = Array.from(new Set([...persona.interests, ...interests]));

  return {
    ...seed,
    genes: { ...seed.genes, persona, bond },
  };
}

/** Create a new friend deterministically from an agent-resolved intent. */
export function createFriendFromAgent(
  intent: ResolvedIntent,
  opts: { name?: string } = {},
): FriendSeedData {
  const seedHash = deriveAgentSeedHash(intent, 'genesis');
  const baseName =
    opts.name ?? intent.intent.entities.find((e) => e.kind === 'character')?.text ?? 'unnamed';
  const base = createFriendSeed(seedHash, { name: baseName });
  return applyOverrides(base, intent);
}

/** Evolve an existing friend toward the agent-resolved direction. */
export function evolveFriendFromAgent(
  parent: FriendSeedData,
  intent: ResolvedIntent,
  opts: { magnitude?: number; salt?: string } = {},
): FriendSeedData {
  const magnitude = opts.magnitude ?? 0.15;
  const salt = opts.salt ?? deriveAgentSeedHash(intent, 'evolve');
  const mutated = mutateFriend(parent, magnitude, salt);
  return applyOverrides(mutated, intent);
}

/** Breed two friends with agent-resolved bias on the child. */
export function breedFriendFromAgent(
  parentA: FriendSeedData,
  parentB: FriendSeedData,
  intent: ResolvedIntent,
  opts: { salt?: string } = {},
): FriendSeedData {
  const salt = opts.salt ?? deriveAgentSeedHash(intent, 'breed');
  const child = breedFriends(parentA, parentB, salt);
  return applyOverrides(child, intent);
}

/** Convenience dispatcher: picks create / evolve / breed based on intent.top. */
export function friendFromAgent(
  intent: ResolvedIntent,
  context: { parent?: FriendSeedData; mate?: FriendSeedData } = {},
): FriendSeedData {
  if (intent.intent.top === 'EVOLVE' && context.parent) {
    return evolveFriendFromAgent(context.parent, intent);
  }
  if (intent.intent.top === 'BREED' && context.parent && context.mate) {
    return breedFriendFromAgent(context.parent, context.mate, intent);
  }
  return createFriendFromAgent(intent);
}
