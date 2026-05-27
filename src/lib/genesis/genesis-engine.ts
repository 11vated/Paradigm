/**
 * Genesis Engine — Doctrine v2 Part XII (Public Site GA hero loop).
 *
 * The substrate eats itself. Every visitor's first impression is a
 * deterministic genesis seed — uniquely theirs, signed, licensed,
 * graded, cost-modeled, and lineage-rooted. The whole Paradigm
 * thesis happens in <60 seconds, on first page load.
 *
 * Composition layer over: Maker (Phase 13) + License (Phase 18) +
 * Royalty (Phase 17) + Cost (Phase 20). No new substrate; pure
 * composition.
 *
 * Determinism:
 *   - sessionToken → genesisSeedHash is bijective and stable.
 *   - Same token always produces the same genesis package.
 *   - Fork: parentSeedHash + forkerToken → derivedSeedHash, also
 *     deterministic and reproducible.
 *
 * Aesthetics:
 *   - Each genesis seed has a "soul card" deterministically derived
 *     from its hash: palette (3 colors), glyph (procedural SVG path
 *     parameters), name (phonetic syllables), tone (musical motif).
 *   - These exist so the page can render something beautiful and
 *     uniquely identifying without external assets.
 */
import { createHash, randomBytes } from 'node:crypto';
import { canonicalize } from '../intelligence/federation/peer-store.js';
import { buildLicense, type SeedLicense, evaluateLicense } from '../kernel/seed-license.js';
import { computeSeedCost, type SeedCostResult } from '../kernel/seed-cost.js';
import type { LineageNode } from '../kernel/lineage-royalty.js';

export interface SoulCard {
  /** 3-color palette as #RRGGBB strings, derived from hash. */
  readonly palette: readonly [string, string, string];
  /** Procedural glyph parameters; consumer renders as SVG. */
  readonly glyph: {
    readonly seed: string;          // 32-hex char for the path RNG
    readonly symmetry: number;      // 3..12
    readonly density: number;       // 0..1
  };
  /** Phonetic name, 2-4 syllables. */
  readonly name: string;
  /** Tone fingerprint: pitch in Hz + 8-step rhythm bitmask. */
  readonly tone: {
    readonly pitchHz: number;
    readonly rhythm: number;  // 0..255
  };
}

export interface GenesisSeed {
  readonly $domain: 'genesis';
  readonly $hash: string;             // sha256 of canonical body
  readonly $name: string;
  readonly $lineage: { readonly parents: readonly string[]; readonly depth: number };
  readonly $sovereignty: {
    readonly authorToken: string;     // anonymized; not the raw session
    readonly created: 0;              // deterministic kernel clock
  };
  readonly genes: {
    readonly soulCard: SoulCard;
    readonly disposition: number;     // 0..1 — "warmth"
    readonly curiosity: number;       // 0..1
    readonly resonance: number;       // 0..1
  };
}

export interface GenesisPackage {
  readonly seed: GenesisSeed;
  readonly license: SeedLicense;
  readonly costIfRemixed: SeedCostResult;
  readonly costIfCommercial: SeedCostResult;
  readonly grade: GenesisGrade;
  readonly permalink: string;        // /genesis/<short-hash>
  readonly forkUrl: string;          // /genesis/<short-hash>/fork
}

export interface GenesisGrade {
  readonly score: number;            // 0..100
  readonly clauses: ReadonlyArray<{
    readonly id: string;
    readonly passed: boolean;
    readonly weight: number;
    readonly reason?: string;
  }>;
}

/**
 * Hash a session token to a stable author-token (so the raw session
 * stays opaque; only its fingerprint travels through federation).
 */
export function authorTokenOf(sessionToken: string): string {
  return createHash('sha256').update('paradigm:genesis:author:' + sessionToken, 'utf8').digest('hex');
}

/** Generate a fresh session token. */
export function newSessionToken(): string {
  return randomBytes(24).toString('hex');
}

function rngFromHash(hash: string, salt: string): () => number {
  let state = createHash('sha256').update(salt + hash, 'utf8').digest();
  let cursor = 0;
  return () => {
    if (cursor >= state.length - 4) {
      state = createHash('sha256').update(state).digest();
      cursor = 0;
    }
    const u32 = state.readUInt32BE(cursor);
    cursor += 4;
    return u32 / 0x100000000;
  };
}

const SYLLABLES = [
  'an', 'ar', 'el', 'en', 'in', 'ir', 'on', 'or', 'un',
  'ka', 'la', 'ma', 'na', 'ra', 'sa', 'ta', 'va', 'za',
  'mi', 'ki', 'li', 'ni', 'ri', 'si', 'ti', 'vi',
  'lo', 'mo', 'ko', 'ro',
];

function soulCardFrom(hash: string): SoulCard {
  const rng = rngFromHash(hash, 'soul:');
  // Palette: HSL-derived for harmonic colors
  const baseHue = Math.floor(rng() * 360);
  const palette: [string, string, string] = [
    hslToHex(baseHue, 0.55, 0.45),
    hslToHex((baseHue + 137) % 360, 0.50, 0.55),
    hslToHex((baseHue + 274) % 360, 0.45, 0.40),
  ];
  // Name: 2-4 syllables
  const syllableCount = 2 + Math.floor(rng() * 3);
  let name = '';
  for (let i = 0; i < syllableCount; i++) {
    name += SYLLABLES[Math.floor(rng() * SYLLABLES.length)];
  }
  name = name.charAt(0).toUpperCase() + name.slice(1);
  // Glyph
  const glyph = {
    seed: createHash('sha256').update('glyph:' + hash).digest('hex').slice(0, 32),
    symmetry: 3 + Math.floor(rng() * 10),
    density: 0.2 + rng() * 0.7,
  };
  // Tone
  const pitches = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];
  const tone = {
    pitchHz: pitches[Math.floor(rng() * pitches.length)],
    rhythm: Math.floor(rng() * 256),
  };
  return { palette, glyph, name, tone };
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) {         g = c; b = x; }
  else if (h < 240) {         g = x; b = c; }
  else if (h < 300) { r = x;         b = c; }
  else              { r = c;         b = x; }
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function gradeOf(seed: GenesisSeed): GenesisGrade {
  const c = seed.genes;
  const clauses = [
    { id: 'soul-card-coherent', passed: c.soulCard.palette.length === 3, weight: 20,
      reason: c.soulCard.palette.length === 3 ? undefined : 'palette must have 3 colors' },
    { id: 'glyph-bounded', passed: c.soulCard.glyph.symmetry >= 3 && c.soulCard.glyph.symmetry <= 12, weight: 15 },
    { id: 'name-pronounceable', passed: c.soulCard.name.length >= 4, weight: 15 },
    { id: 'tone-audible', passed: c.soulCard.tone.pitchHz >= 20 && c.soulCard.tone.pitchHz <= 20000, weight: 15 },
    { id: 'disposition-in-range', passed: c.disposition >= 0 && c.disposition <= 1, weight: 10 },
    { id: 'curiosity-in-range', passed: c.curiosity >= 0 && c.curiosity <= 1, weight: 10 },
    { id: 'resonance-in-range', passed: c.resonance >= 0 && c.resonance <= 1, weight: 15 },
  ];
  const score = clauses.reduce((s, cl) => s + (cl.passed ? cl.weight : 0), 0);
  return { score, clauses };
}

/**
 * Build a deterministic genesis seed from a session token.
 */
export function genesisFromToken(sessionToken: string, parents: ReadonlyArray<string> = []): GenesisSeed {
  const authorToken = authorTokenOf(sessionToken);
  const rng = rngFromHash(authorToken, 'genes:' + parents.join(','));
  const soulCard = soulCardFrom(authorToken + parents.join(''));
  const body = {
    $domain: 'genesis' as const,
    $name: soulCard.name,
    $lineage: { parents, depth: parents.length },
    $sovereignty: { authorToken, created: 0 as const },
    genes: {
      soulCard,
      disposition: Number(rng().toFixed(6)),
      curiosity: Number(rng().toFixed(6)),
      resonance: Number(rng().toFixed(6)),
    },
  };
  const $hash = createHash('sha256').update(canonicalize(body), 'utf8').digest('hex');
  return { ...body, $hash };
}

export function permalinkOf(seed: GenesisSeed): string {
  return `/genesis/${seed.$hash.slice(0, 16)}`;
}

/**
 * Build the full genesis package: seed + license + cost models + grade + URLs.
 * Default license: attribution (the most permissive option that still preserves
 * lineage). Custodian = the author token.
 */
export async function packageGenesis(seed: GenesisSeed, lineage: ReadonlyArray<LineageNode> = []): Promise<GenesisPackage> {
  const license = buildLicenseSync('attribution', seed.$sovereignty.authorToken);
  const baseLineage = [
    { seedId: seed.$hash, authorAddress: seed.$sovereignty.authorToken, parents: seed.$lineage.parents.map(String) },
    ...lineage,
  ];
  const remixCost = await computeSeedCost({
    seedId: seed.$hash,
    license,
    intendedUse: 'remix',
    saleAmountCents: 1000,
    lineage: baseLineage,
  });
  const commercialCost = await computeSeedCost({
    seedId: seed.$hash,
    license,
    intendedUse: 'commercial-resale',
    saleAmountCents: 1000,
    lineage: baseLineage,
  });
  return {
    seed,
    license,
    costIfRemixed: remixCost,
    costIfCommercial: commercialCost,
    grade: gradeOf(seed),
    permalink: permalinkOf(seed),
    forkUrl: `${permalinkOf(seed)}/fork`,
  };
}

/**
 * Internal helper — deterministic license build (default expiry omitted,
 * royaltyBp 250 = 2.5% to author on any commercial reuse).
 */
function buildLicenseSync(type: SeedLicense['type'], custodian: string): SeedLicense {
  const unsigned = buildLicense({
    type,
    version: '1.0.0',
    custodian,
    attribution: { required: true, canonicalLine: `Genesis seed by ${custodian.slice(0, 12)}` },
    royaltyBp: 250,
  });
  return unsigned as SeedLicense;
}

/** Sanity self-check used by `/api/genesis/health`. */
export async function genesisSelfCheck(): Promise<{ ok: true; sampleHash: string } | { ok: false; reason: string }> {
  try {
    const seed = genesisFromToken('paradigm-self-check-fixed-token');
    const pkg = await packageGenesis(seed);
    const ev = evaluateLicense(pkg.license, 'remix');
    if (!ev.allowed) return { ok: false, reason: 'default genesis license disallows remix' };
    if (pkg.grade.score < 50) return { ok: false, reason: `grade ${pkg.grade.score} below floor 50` };
    return { ok: true, sampleHash: seed.$hash };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}
