/**
 * Paradigm World — types.
 *
 * A World is a typed, deterministic setting: era, biome, conflict, mood,
 * magic/tech levels. Multi-domain composable with Friend → produces quests,
 * narratives, environments, characters, and ultimately games.
 *
 * Phase 3 (2/n) deliverable. Mirrors src/lib/friend in shape: types →
 * genesis → generator → contract → composition.
 */

import { Xoshiro256StarStar } from '../kernel/rng';

export type Era = 'medieval' | 'modern' | 'sci-fi' | 'mythic' | 'post-apocalyptic';
export type Biome =
  | 'forest' | 'desert' | 'ocean' | 'tundra'
  | 'urban' | 'underground' | 'sky' | 'volcanic';
export type ConflictKind =
  | 'invasion' | 'mystery' | 'exploration'
  | 'survival' | 'political' | 'redemption' | 'discovery';

export interface WorldSeedData {
  /** Stable deterministic id, lowercase-hex 16 chars. */
  id: string;
  /** Display name, e.g. "Vellichor Reach". */
  name: string;
  /** sha256 of the canonical genome (no metadata). */
  seedHash: string;
  /** Schema version of the World seed shape. */
  genomeVersion: number;
  /** Six gene categories. */
  genes: {
    setting: SettingGene;
    physics: PhysicsGene;
    society: SocietyGene;
    conflict: ConflictGene;
    mood:    MoodGene;
    history: HistoryGene;
  };
  /** Wall-clock metadata, NOT input to RNG. */
  bornAt: string;
  /** Optional derivation lineage. */
  derivation?: {
    operator: 'genesis' | 'breed' | 'mutate';
    parents: string[];
    salt?: string;
    generation: number;
  };
  /** Optional sovereignty receipt (mirrors FriendSovereignty). */
  sovereignty?: {
    author: string;
    timestamp: string;
    payloadHash: string;
    signature: string;
    algorithm: 'ECDSA-P256-SHA256';
    anchor?: {
      tokenId: string;
      contractAddress: string;
      transactionHash: string;
      network: string;
      anchoredAt: string;
      metadataUri: string;
      metadataHash: string;
    };
  };
}

export interface SettingGene {
  era: Era;
  biome: Biome;
  /** 0 → 1 — how much supernatural / magic. */
  magic: number;
  /** 0 → 1 — how much technology / artifice. */
  tech: number;
  /** 0 → 1 — how dense / populated the world is. */
  density: number;
}

export interface PhysicsGene {
  /** 0 → 1 — gravity multiplier (0 = floaty, 1 = heavy). */
  gravity: number;
  /** 0 → 1 — how punishing the environment is. */
  hostility: number;
  /** 0 → 1 — day/night cycle speed (0 = static, 1 = fast). */
  diurnalRate: number;
  /** 0 → 1 — weather volatility. */
  weatherVolatility: number;
}

export interface SocietyGene {
  /** 0 → 1 — civic order (0 = chaos, 1 = strict order). */
  order: number;
  /** 0 → 1 — moral plurality (0 = monolithic, 1 = many factions). */
  pluralism: number;
  /** 0 → 1 — economic prosperity. */
  prosperity: number;
  /** 0 → 1 — knowledge accessibility. */
  literacy: number;
}

export interface ConflictGene {
  kind: ConflictKind;
  /** 0 → 1 — scale (intimate → world-shaping). */
  scale: number;
  /** 0 → 1 — urgency (slow burn → ticking clock). */
  urgency: number;
  /** 0 → 1 — moral clarity (gray → clear good/evil). */
  clarity: number;
}

export interface MoodGene {
  /** 0 → 1 — light vs. dark. */
  brightness: number;
  /** 0 → 1 — warmth vs. cold. */
  warmth: number;
  /** 0 → 1 — pace (contemplative → frenetic). */
  pace: number;
  /** 0 → 1 — humor density. */
  levity: number;
}

export interface HistoryGene {
  /** Years since the inciting historical event. */
  agesSinceFall: number;
  /** 0 → 1 — how much the past haunts the present. */
  ghostliness: number;
  /** Number of canonical historical eras. */
  eraCount: number;
}

export interface WorldArtifact {
  worldId: string;
  seedHash: string;
  summary: string;
  locations: WorldLocation[];
  factions: WorldFaction[];
  hook: string;
  meta: {
    generatorVersion: string;
    elapsedMs: number;
  };
}

export interface WorldLocation {
  name: string;
  kind: 'settlement' | 'wilderness' | 'ruin' | 'sanctum' | 'frontier';
  description: string;
}

export interface WorldFaction {
  name: string;
  alignment: 'lawful' | 'neutral' | 'chaotic';
  goal: string;
}

export interface WorldRng { nextFloat(): number; }
export function asWorldRng(rng: Xoshiro256StarStar): WorldRng {
  return { nextFloat: () => rng.nextF64() };
}
