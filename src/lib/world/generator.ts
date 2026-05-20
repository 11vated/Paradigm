/**
 * Paradigm World — generator. Deterministic phenotype + locations + factions + hook.
 */
import { createHash } from 'crypto';
import { Xoshiro256StarStar } from '../kernel/rng';
import { kernelNowIso } from '../kernel/clock';
import type {
  WorldSeedData, WorldArtifact, WorldLocation, WorldFaction, WorldRng,
} from './types';
import { asWorldRng } from './types';

const GENERATOR_VERSION = '1.0.0';

const LOCATION_PREFIXES = ['Old', 'New', 'High', 'Low', 'Black', 'Silver', 'Iron', 'Sun', 'Moon', 'Star', 'Bone', 'Glass', 'Stone'];
const LOCATION_ROOTS = ['Hold', 'Reach', 'Ford', 'Watch', 'Spire', 'Grove', 'Marsh', 'Quay', 'Vault', 'Sanctum', 'Pass', 'Mire'];
const FACTION_PREFIXES = ['Order of', 'House', 'Brotherhood of', 'Circle of', 'Throne of', 'Council of', 'Children of'];
const FACTION_ROOTS = ['the Veil', 'the Ember', 'the Hollow', 'the Bright', 'the Old Path', 'the Black Gate', 'the Silent Hours', 'the First Word'];
const ALIGNMENTS: Array<'lawful' | 'neutral' | 'chaotic'> = ['lawful', 'neutral', 'chaotic'];

function pick<T>(rng: WorldRng, arr: readonly T[]): T {
  return arr[Math.floor(rng.nextFloat() * arr.length)];
}

function sampleLocations(world: WorldSeedData, rng: WorldRng): WorldLocation[] {
  const out: WorldLocation[] = [];
  const kinds: WorldLocation['kind'][] = ['settlement', 'wilderness', 'ruin', 'sanctum', 'frontier'];
  for (let i = 0; i < 3; i++) {
    const prefix = pick(rng, LOCATION_PREFIXES);
    const root = pick(rng, LOCATION_ROOTS);
    const kind = kinds[i % kinds.length];
    out.push({
      name: `${prefix} ${root}`,
      kind,
      description: kindDescription(kind, world),
    });
  }
  return out;
}

function kindDescription(kind: WorldLocation['kind'], world: WorldSeedData): string {
  const biome = world.genes.setting.biome;
  const mood = world.genes.mood.brightness < 0.4 ? 'shadowed' : world.genes.mood.brightness > 0.7 ? 'sun-warmed' : 'half-lit';
  switch (kind) {
    case 'settlement':  return `A ${mood} ${biome} settlement clinging to the old roads.`;
    case 'wilderness':  return `${biome.charAt(0).toUpperCase() + biome.slice(1)} that does not forgive carelessness.`;
    case 'ruin':        return `Stones older than memory, slowly returning to the ${biome}.`;
    case 'sanctum':     return `A place kept secret from the wider ${biome}.`;
    case 'frontier':    return `The edge of mapped ${biome}; rumor goes further than law.`;
  }
}

function sampleFactions(world: WorldSeedData, rng: WorldRng): WorldFaction[] {
  const out: WorldFaction[] = [];
  // Three factions: one aligned with society order, one against, one neutral
  for (let i = 0; i < 3; i++) {
    const prefix = pick(rng, FACTION_PREFIXES);
    const root = pick(rng, FACTION_ROOTS);
    const alignment = i === 0 && world.genes.society.order > 0.5
      ? 'lawful'
      : i === 1 && world.genes.society.pluralism > 0.5
        ? 'chaotic'
        : pick(rng, ALIGNMENTS);
    out.push({
      name: `${prefix} ${root}`,
      alignment,
      goal: factionGoal(alignment, world),
    });
  }
  return out;
}

function factionGoal(a: 'lawful' | 'neutral' | 'chaotic', world: WorldSeedData): string {
  if (a === 'lawful') {
    return world.genes.society.prosperity > 0.5
      ? 'preserve the long peace'
      : 'restore the old order';
  }
  if (a === 'chaotic') {
    return world.genes.conflict.urgency > 0.5
      ? 'overturn the throne before the season turns'
      : 'unmake every contract that binds them';
  }
  return 'survive the unmaking, in whatever form survival takes';
}

function buildHook(world: WorldSeedData, rng: WorldRng): string {
  const kind = world.genes.conflict.kind;
  const urgency = world.genes.conflict.urgency > 0.6 ? 'urgently' : 'slowly';
  const places = sampleLocations(world, rng).map((l) => l.name);
  const place = places[0];
  switch (kind) {
    case 'invasion':    return `Strangers ${urgency} cross the borders of ${place}. None speak its tongue.`;
    case 'mystery':     return `A door in ${place} has opened that has been sealed for ages.`;
    case 'exploration': return `Maps drawn last winter no longer match the land around ${place}.`;
    case 'survival':    return `Winter has come ${urgency}. ${place} will not last it alone.`;
    case 'political':   return `In ${place}, the heir is poisoned and the council is silent.`;
    case 'redemption':  return `The exile of ${place} returns, carrying a debt only blood can settle.`;
    case 'discovery':   return `A child of ${place} dreams in a dead language and wakes drawing maps.`;
  }
}

function buildSummary(world: WorldSeedData): string {
  const { setting, mood, conflict } = world.genes;
  const dark = mood.brightness < 0.4 ? 'shadowed' : mood.brightness > 0.7 ? 'bright' : 'twilit';
  return `${world.name}: a ${dark} ${setting.era} ${setting.biome} world; ages ${world.genes.history.agesSinceFall} after the last fall; ${conflict.kind} on the horizon.`;
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

export function generateWorld(seed: WorldSeedData): WorldArtifact {
  const rng = asWorldRng(new Xoshiro256StarStar(seed.seedHash));
  const startedAt = kernelNowIso();
  const locations = sampleLocations(seed, rng);
  const factions = sampleFactions(seed, rng);
  const hook = buildHook(seed, rng);
  const summary = buildSummary(seed);
  return {
    worldId: seed.id,
    seedHash: seed.seedHash,
    summary,
    locations,
    factions,
    hook,
    meta: {
      generatorVersion: GENERATOR_VERSION,
      elapsedMs: 0,  // observability-only, excluded from hashArtifact
    },
  };
}

export function hashArtifact(a: WorldArtifact): string {
  const { meta, ...rest } = a;
  return createHash('sha256').update(canonicalJson(rest)).digest('hex');
}
