/**
 * Quest composition — the keystone of Paradigm game generation.
 *
 * Combines a Friend (protagonist) and a World (setting) into a Quest seed
 * that can drive narrative-v3, character-v3, or any future game generator.
 *
 * This is the FIRST deterministic multi-source compose in the substrate.
 * Same friend + same world + same salt → byte-identical quest, forever.
 */
import { createHash } from 'crypto';
import { Xoshiro256StarStar } from '../kernel/rng';
import { kernelNowIso } from '../kernel/clock';
import type { FriendSeedData } from '../friend/types';
import type { WorldSeedData } from '../world/types';

export type QuestArchetype =
  | 'heros-journey'
  | 'mystery-investigation'
  | 'survival-crawl'
  | 'political-intrigue'
  | 'redemption-arc'
  | 'discovery-expedition'
  | 'underdog-rebellion';

export interface QuestSeedData {
  /** Stable id derived from (friend.seedHash, world.seedHash, salt). */
  id: string;
  /** sha256 of canonical inputs. */
  seedHash: string;
  /** Schema version. */
  genomeVersion: number;
  /** Title for the quest. */
  title: string;

  /** The composed "quest genes" — used as inputs to narrative/character generators. */
  genes: {
    archetype: QuestArchetype;
    /** 0 → 1 — protagonist's stake. */
    stake: number;
    /** 0 → 1 — antagonist's strength. */
    antagonist: number;
    /** 0 → 1 — moral complexity (gray vs. clear). */
    moralComplexity: number;
    /** 0 → 1 — pacing (contemplative → frenetic). */
    pacing: number;
    /** 0 → 1 — emotional intensity. */
    intensity: number;
    /** Estimated act count (3-5 typical). */
    actCount: number;
    /** Estimated word count for narrative-v3 to target. */
    targetWordCount: number;
    /** The hook line (inherited from world). */
    hook: string;
  };

  /** Source references — provenance is first-class. */
  parents: {
    friend: { id: string; name: string; seedHash: string };
    world:  { id: string; name: string; seedHash: string };
  };
  /** Optional salt for variation. */
  salt?: string;
  /** Wall-clock metadata (not RNG input). */
  bornAt: string;
}

const GENOME_VERSION = 1;
const GENERATOR_VERSION = '1.0.0';

// Friend persona + world conflict → quest archetype.
function selectArchetype(friend: FriendSeedData, world: WorldSeedData): QuestArchetype {
  const c = world.genes.conflict.kind;
  const persona = friend.genes.persona;
  const bigFive = persona.bigFive;

  // Direct mapping table; ties broken by persona traits.
  switch (c) {
    case 'mystery':     return 'mystery-investigation';
    case 'survival':    return 'survival-crawl';
    case 'political':   return 'political-intrigue';
    case 'redemption':  return 'redemption-arc';
    case 'discovery':   return 'discovery-expedition';
    case 'exploration':
      return bigFive.openness > 0.6 ? 'discovery-expedition' : 'heros-journey';
    case 'invasion':
      return bigFive.agreeableness < 0.4 ? 'underdog-rebellion' : 'heros-journey';
  }
}

function buildQuestGenes(friend: FriendSeedData, world: WorldSeedData) {
  const persona = friend.genes.persona;
  const bigFive = persona.bigFive;
  const conflict = world.genes.conflict;
  const mood = world.genes.mood;
  const bond = friend.genes.bond;

  return {
    archetype: selectArchetype(friend, world),
    // Stake combines friend's emotional intensity with world's urgency
    stake: clamp01(0.6 * bigFive.neuroticism + 0.4 * conflict.urgency),
    // Antagonist strength scales with world's conflict scale + low pluralism
    antagonist: clamp01(0.5 * conflict.scale + 0.3 * (1 - world.genes.society.pluralism) + 0.2),
    // Moral complexity is high when friend agreeableness is mid AND world clarity is low
    moralComplexity: clamp01(0.5 * (1 - conflict.clarity) + 0.5 * Math.abs(bigFive.agreeableness - 0.5) * 2),
    // Pacing combines friend conscientiousness (deliberate) with world mood pace
    pacing: clamp01(0.4 * (1 - bigFive.conscientiousness) + 0.6 * mood.pace),
    // Intensity scales with world urgency + low bond softness
    intensity: clamp01(0.6 * conflict.urgency + 0.4 * (1 - bond.initialWarmth)),
    // Act count: 3 if low complexity, 5 if high
    actCount: world.genes.conflict.scale > 0.7 ? 5 : world.genes.conflict.scale > 0.4 ? 4 : 3,
    // Word count: scales with scale and intensity
    targetWordCount: Math.floor(3000 + conflict.scale * 12000 + bigFive.openness * 5000),
    // Hook is inherited from world's deterministic hook generator below
    hook: '',  // filled in by compose()
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function buildTitle(friend: FriendSeedData, world: WorldSeedData, archetype: QuestArchetype): string {
  // Title formulas — deterministic, no RNG
  switch (archetype) {
    case 'heros-journey':         return `The Long Road of ${friend.name}`;
    case 'mystery-investigation': return `The ${world.name} Inquiry`;
    case 'survival-crawl':        return `What ${friend.name} Carried Out of ${world.name}`;
    case 'political-intrigue':    return `The Quiet Throne of ${world.name}`;
    case 'redemption-arc':        return `${friend.name}, Returned`;
    case 'discovery-expedition':  return `Maps of the Unmade ${world.name}`;
    case 'underdog-rebellion':    return `The ${friend.name} Rising`;
  }
}

function buildHook(friend: FriendSeedData, world: WorldSeedData): string {
  // Deterministic hook that names the friend explicitly so each Friend's quest
  // in the same world differs in narration even though the underlying world is shared.
  const base = world.genes.conflict.kind;
  const place = world.name;
  switch (base) {
    case 'invasion':    return `Strangers cross the borders of ${place}. ${friend.name} is the only one who recognizes the language.`;
    case 'mystery':     return `A door in ${place} has opened that has been sealed for ages. ${friend.name}'s name is carved above it.`;
    case 'exploration': return `Maps drawn last winter no longer match the land around ${place}. ${friend.name} can still navigate.`;
    case 'survival':    return `Winter has come to ${place}. ${friend.name} will not last it alone.`;
    case 'political':   return `In ${place}, the heir is poisoned and the council is silent. ${friend.name} is the only honest voice left.`;
    case 'redemption':  return `The exile of ${place} returns, carrying a debt only blood can settle. The exile is ${friend.name}.`;
    case 'discovery':   return `${friend.name} dreams in a dead language and wakes drawing maps of ${place}.`;
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return '{' + keys.map((k) =>
    JSON.stringify(k) + ':' + canonicalJson((value as Record<string, unknown>)[k]),
  ).join(',') + '}';
}

/**
 * The multi-source compose. Same inputs → same quest seed, forever.
 */
export function composeQuest(
  friend: FriendSeedData,
  world: WorldSeedData,
  options?: { salt?: string; title?: string },
): QuestSeedData {
  const salt = options?.salt ?? '';
  // Compose inputs in a canonical, sorted way so order of arguments doesn't matter for the hash
  const inputHash = createHash('sha256')
    .update(canonicalJson({
      friend: friend.seedHash,
      world: world.seedHash,
      salt,
    }))
    .digest('hex');

  // Deterministic RNG seeded by the compose hash — used for any sampling we might add later
  // (currently quest genes are all deterministic from inputs, no RNG sampling needed)
  void new Xoshiro256StarStar(inputHash);

  const genes = buildQuestGenes(friend, world);
  genes.hook = buildHook(friend, world);
  const archetype = genes.archetype;
  const title = options?.title ?? buildTitle(friend, world, archetype);

  return {
    id: inputHash.slice(0, 16),
    seedHash: inputHash,
    genomeVersion: GENOME_VERSION,
    title,
    genes,
    parents: {
      friend: { id: friend.id, name: friend.name, seedHash: friend.seedHash },
      world:  { id: world.id,  name: world.name,  seedHash: world.seedHash },
    },
    salt: salt || undefined,
    bornAt: kernelNowIso(),
  };
}

/** Render a one-paragraph "quest brief" suitable for show-and-tell. */
export function questBrief(quest: QuestSeedData): string {
  const g = quest.genes;
  return [
    `# ${quest.title}`,
    '',
    `> ${quest.parents.friend.name} in ${quest.parents.world.name}`,
    '',
    g.hook,
    '',
    `**Archetype:** ${g.archetype}`,
    `**Acts:** ${g.actCount}  ·  **Target words:** ${g.targetWordCount.toLocaleString()}`,
    `**Stake:** ${(g.stake * 10).toFixed(1)}/10  ·  **Antagonist:** ${(g.antagonist * 10).toFixed(1)}/10`,
    `**Pacing:** ${(g.pacing * 10).toFixed(1)}/10  ·  **Moral grayness:** ${(g.moralComplexity * 10).toFixed(1)}/10`,
  ].join('\n');
}

export const QUEST_GENERATOR_VERSION = GENERATOR_VERSION;
