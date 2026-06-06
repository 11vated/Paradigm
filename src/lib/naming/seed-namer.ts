/**
 * SeedNamer — names seeds from intent.
 *
 * Three-tier: when an LLM is reachable, uses it (Tier 2) for the highest quality
 * names. When not, falls back to a deterministic PoS-pairing algorithm using
 * domain-curated vocabularies (Tier 1). Tier 1.5 uses gene-to-name mapping when
 * seed genes are available. Tier 0 is a hash-based fallback for when intent is empty.
 *
 * Every name is a two-word PoS pair (adjective + noun) optionally extended
 * with a 3-5 word modifier. The result is a real, memorable name like
 *   "Vellum Vesper"           — character
 *   "Lantern Hollow"          — world
 *   "Velvet Nocturne"         — music
 *   "Marrow Intermezzo"       — music
 *   "Spectral Mandala"        — visual2d
 *   "Optimized Caffeine"      — molecule
 *   "Spiral Cartograph"       — cosmology
 *   "Brutalist Atelier"       — website
 *   "Tidepool Witness"        — fullgame
 *
 * Determinism: Tier 1 and 1.5 are fully deterministic — same intent + domain + index → same name.
 * Tier 2 (LLM) is reproducible when the LLM is seeded, otherwise best-effort.
 * Tier 0 is hash-based.
 *
 * The kernel clock is consulted for `kernelNow()` only in Tier 2 to record
 * "when" the name was issued. The name itself does not depend on wall time.
 */
import vocabIndex from './vocab/index.js';
import { nameFromGenes } from './gene-derivation';

export interface Vocab {
  domain: string;
  adjectives: string[];
  nouns: string[];
  modifiers: string[];
}

export interface SeedName {
  /** Display name (Title Case) — e.g. "Vellum Vesper". */
  name: string;
  /** File-safe slug — e.g. "vellum-vesper". */
  slug: string;
  /** 8-char disambiguator derived from intent hash. */
  handle: string;
  /** One-line etymology explaining how the name was derived. */
  etymology: string;
  /** Tier used (0|1|1.5|2). */
  tier: 0 | 1 | 1.5 | 2;
  /** Domain used. */
  domain: string;
}

const HASH_FALLBACK = 'Untitled Seed';

/** djb2-ish stable hash of a string → 6-char hex. */
function shortHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0').slice(0, 6);
}

/** Title-case a word: "neon" -> "Neon", "in tattered cerements" -> "In Tattered Cerements". */
function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

/** File-safe slug. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

/** Deterministic numeric seed from (intent, domain). */
function seedFromIntent(intent: string, domain: string): number {
  const s = `${domain}::${intent}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h * 31) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Deterministic PRNG (mulberry32) for repeatable PoS picks. */
function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tier 1.5: gene-to-name derivation.
 * Maps seed genes to meaningful names based on their values.
 * Falls back to Tier 1 if gene derivation fails.
 */
function nameTier1_5(seed: any, domain: string, intent: string): SeedName | null {
  const geneName = nameFromGenes(seed);
  if (geneName) {
    const name = titleCase(geneName.name);
    return {
      name,
      slug: slugify(name),
      handle: shortHash(intent),
      etymology: geneName.etymology,
      tier: 1.5,
      domain,
    };
  }
  return null;
}

/**
 * Tier 1: deterministic PoS pairing from the domain vocab.
 * Same (intent, domain) → same name, forever.
 */
function nameTier1(intent: string, domain: string, seedOverride?: number): SeedName {
  const vocab: Vocab =
    (vocabIndex as Record<string, Vocab>)[domain] ??
    (vocabIndex as Record<string, Vocab>).default;
  const seed = seedOverride ?? seedFromIntent(intent, domain);
  const rand = mulberry32(seed);
  const adj = vocab.adjectives[Math.floor(rand() * vocab.adjectives.length)];
  const noun = vocab.nouns[Math.floor(rand() * vocab.nouns.length)];
  const name = titleCase(`${adj} ${noun}`);
  const handle = shortHash(intent);
  return {
    name,
    slug: slugify(name),
    handle,
    etymology: `From the ${domain} vocabulary: *${adj}* (${pickMeaning(adj)}) + *${noun}* (${pickMeaning(noun)}). You asked for "${intent.slice(0, 60)}${intent.length > 60 ? '…' : ''}".`,
    tier: 1,
    domain,
  };
}

/**
 * Tier 0: pure-hash fallback for empty/missing intent.
 * Still returns a name from the domain vocab, but with hash-only disambiguation.
 */
function nameTier0(domain: string, intent: string | undefined | null): SeedName {
  const intentStr = (intent ?? '').trim() || 'untitled';
  const vocab: Vocab =
    (vocabIndex as Record<string, Vocab>)[domain] ??
    (vocabIndex as Record<string, Vocab>).default;
  const seed = seedFromIntent(intentStr, domain);
  const rand = mulberry32(seed);
  const adj = vocab.adjectives[Math.floor(rand() * vocab.adjectives.length)];
  const noun = vocab.nouns[Math.floor(rand() * vocab.nouns.length)];
  const name = titleCase(`${adj} ${noun}`);
  const handle = shortHash(intentStr);
  return {
    name,
    slug: slugify(name),
    handle,
    etymology: `No intent provided — the substrate named this from the ${domain} vocabulary (${adj} + ${noun}).`,
    tier: 0,
    domain,
  };
}

/**
 * Tier 2: LLM-based naming (best-effort). Uses /api/agent/name when available.
 * If the endpoint is unreachable, falls through to Tier 1.
 */
async function nameTier2(intent: string, domain: string): Promise<SeedName | null> {
  if (typeof fetch === 'undefined') return null;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 1500);
    const r = await fetch('/api/agent/name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent, domain }),
      signal: ctl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const json = (await r.json()) as { name?: string; etymology?: string };
    if (!json?.name || typeof json.name !== 'string') return null;
    const name = titleCase(json.name.trim());
    return {
      name,
      slug: slugify(name),
      handle: shortHash(intent),
      etymology: json.etymology ?? `LLM-named from intent "${intent.slice(0, 60)}${intent.length > 60 ? '…' : ''}".`,
      tier: 2,
      domain,
    };
  } catch {
    return null;
  }
}

/**
 * Main entry point. Always resolves a SeedName; never throws.
 *
 * - intent empty / null / undefined  → Tier 0
 * - intent present + seed with genes → Tier 1.5 (gene derivation)
 * - intent present                  → Tier 1 (sync) + optional Tier 2 (async best-effort)
 */
export async function nameSeed(
  intent: string | undefined | null,
  domain: string,
  seed?: any,
): Promise<SeedName> {
  const safeDomain = (domain || 'default').toLowerCase();
  if (!intent || typeof intent !== 'string' || intent.trim().length === 0) {
    return nameTier0(safeDomain, intent);
  }
  // Try gene derivation first if seed is provided
  if (seed && seed.genes) {
    const geneName = nameTier1_5(seed, safeDomain, intent);
    if (geneName) return geneName;
  }
  // Try LLM next (best quality when available)
  const llm = await nameTier2(intent, safeDomain);
  if (llm) return llm;
  // Fall back to deterministic PoS pairing
  return nameTier1(intent, safeDomain);
}

/**
 * Synchronous version — always Tier 1.5, 1, or 0. Use this in code paths that
 * cannot await (display name derivations, header rendering, etc.).
 */
export function nameSeedSync(
  intent: string | undefined | null,
  domain: string,
  seed?: any,
): SeedName {
  const safeDomain = (domain || 'default').toLowerCase();
  if (!intent || typeof intent !== 'string' || intent.trim().length === 0) {
    return nameTier0(safeDomain, intent);
  }
  // Try gene derivation first if seed is provided
  if (seed && seed.genes) {
    const geneName = nameTier1_5(seed, safeDomain, intent);
    if (geneName) return geneName;
  }
  return nameTier1(intent, safeDomain);
}

/**
 * Quick lookup for a name only (no etymology). For display headers where
 * etymology is shown on hover.
 */
export function nameOnly(intent: string | undefined | null, domain: string): string {
  return nameSeedSync(intent, domain).name;
}

/**
 * Etymology: a short one-liner explaining the name.
 */
export function etymologyFor(intent: string | undefined | null, domain: string): string {
  return nameSeedSync(intent, domain).etymology;
}

// ─── A tiny inline "meaning" dictionary for the etymology line ──────────────
// Pure display; never used for selection.

const MEANINGS: Record<string, string> = {
  // adjectives
  neon: 'electric, modern, glowing', velvet: 'soft, deep, tactile', ember: 'glowing from within', vesper: 'of the evening',
  lacquered: 'shiny, layered, artificial', feral: 'wild, untamed', bioluminescent: 'self-lit, alive', draconic: 'dragon-like, ancient',
  spectral: 'ghostly, color-rich', argent: 'silver, moonlit', ashen: 'pale, burnt', fey: 'otherworldly, mischievous',
  lunar: 'moon-pale', solar: 'sun-bright', obsidian: 'black, glassy, volcanic', ivory: 'white, ancient, carved',
  verdant: 'green, lush', crimson: 'red, royal', azure: 'blue, vast', amber: 'golden, fossilized',
  cobalt: 'blue, intense', scarlet: 'red, sharp', jade: 'green, cool', molten: 'liquid-fire', frozen: 'ice, stopped',
  // nouns
  samurai: 'warrior of the code', cat: 'companion, watcher', cartographer: 'map-maker', assassin: 'silent-killer',
  monk: 'seeker, solitary', ghost: 'the unburied', weaver: 'thread-worker', sentinel: 'watcher at the edge',
  herald: 'announcer, first-rider', pilgrim: 'long-walker', vagrant: 'free-roamer', arcanist: 'magician',
  warden: 'keeper of bounds', outlaw: 'beyond the law', lyricist: 'song-maker', alchemist: 'transformer',
  soothsayer: 'reader of signs', maskmaker: 'face-builder', seamstress: 'cloth-worker', ferryman: 'crossing-keeper',
  tidepool: 'shallow, alive, contained', hollow: 'empty, echoing, hidden', meridian: 'line of noon, axis',
  foundry: 'place of making-fire', bazaar: 'market, gathering',
  'vesper-tide': 'the coming of dusk',
  evensong: 'sung at twilight, fading',
  catacomb: 'burial-vault', lighthouse: 'signal at the edge', monastery: 'place of solitary work',
};

function pickMeaning(word: string): string {
  return MEANINGS[word.toLowerCase()] ?? 'a word from the domain vocabulary';
}

export const __INTERNAL__ = { shortHash, titleCase, slugify, seedFromIntent, mulberry32 };
