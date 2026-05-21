/**
 * World Memory — Layer 4 (global, read-only, Reality Libraries)
 *
 * Source: PAradigm-reference/research/086A–H (Reality Libraries) +
 * brief 087 (visual phenomena atlas) + brief 092 (power systems).
 *
 * Holds canonical knowledge about how reality works. Read-only at
 * runtime; updated only by curated ingestion.
 */

import { kernelNow } from '../../kernel/clock';
import type { MemoryEntry, MemoryLayer, MemoryQuery } from './types';

export type RealityLibrary =
  | 'cosmology'
  | 'mathematics'
  | 'music-theory'
  | 'language'
  | 'culture'
  | 'built-world'
  | 'lifestyle'
  | 'psychology'
  | 'chemistry'
  | 'physics'
  | 'materials'
  | 'particles-fields'
  | 'visual-phenomena'
  | 'power-systems';

interface WorldEntryRaw {
  id: string;
  library: RealityLibrary;
  title: string;
  content: string;
  tags: string[];
  refs?: string[];
}

const SEED_ENTRIES: WorldEntryRaw[] = [
  {
    id: 'physics:gravity-baseline',
    library: 'physics',
    title: 'Standard gravitational acceleration',
    content:
      'Earth surface gravity g = 9.80665 m/s². Mars 3.71. Moon 1.62. ' +
      'Jupiter 24.79. Use as default for "realistic" world seeds; use ' +
      '~6 m/s² for "dreamy/light" worlds; ~15 m/s² for "oppressive/heavy".',
    tags: ['physics', 'gravity', 'world-design'],
    refs: ['086F'],
  },
  {
    id: 'music:circle-of-fifths',
    library: 'music-theory',
    title: 'Circle of fifths',
    content:
      'C → G → D → A → E → B → F♯ → C♯ → G♯ → D♯ → A♯ → F → C. ' +
      'Adjacent keys share 6 of 7 notes — natural choice for modulation. ' +
      'Diametrically opposite keys feel "alien" — useful for unease.',
    tags: ['music', 'harmony', 'modulation'],
    refs: ['086C'],
  },
  {
    id: 'music:mode-affect',
    library: 'music-theory',
    title: 'Modal emotional affect',
    content:
      'Ionian (major): bright, resolved, heroic. ' +
      'Aeolian (minor): melancholy, introspective. ' +
      'Dorian: serious but hopeful, folk. ' +
      'Phrygian: tense, exotic. ' +
      'Lydian: dreamy, magical. ' +
      'Mixolydian: bluesy, dominant. ' +
      'Locrian: unstable, unresolved.',
    tags: ['music', 'mode', 'emotion'],
    refs: ['086C'],
  },
  {
    id: 'color:warmth-mapping',
    library: 'visual-phenomena',
    title: 'Hue → temperature affect',
    content:
      'Warm hues (350–60°): red/orange/yellow → energy, urgency, comfort. ' +
      'Cool hues (180–270°): cyan/blue → calm, distance, melancholy. ' +
      'Neutral (60–180°): green → safety, growth, nature. ' +
      'Magenta (270–350°): violet → mystical, regal, transgressive.',
    tags: ['color', 'palette', 'emotion'],
    refs: ['087'],
  },
  {
    id: 'narrative:hero-journey',
    library: 'culture',
    title: "Hero's journey (Campbell)",
    content:
      '12 stages: Ordinary World → Call → Refusal → Mentor → Threshold ' +
      '→ Tests/Allies/Enemies → Approach → Ordeal → Reward → Road Back ' +
      '→ Resurrection → Return with Elixir. Kishōtenketsu is a 4-act ' +
      'non-conflict alternative.',
    tags: ['narrative', 'structure', 'archetype'],
    refs: ['086E'],
  },
  {
    id: 'psychology:big-five',
    library: 'psychology',
    title: 'Big Five (OCEAN) personality dimensions',
    content:
      'Openness (curiosity), Conscientiousness (organization), ' +
      'Extraversion (social energy), Agreeableness (cooperation), ' +
      'Neuroticism (emotional volatility). Each in [0,1].',
    tags: ['psychology', 'personality', 'character-design'],
    refs: ['086H'],
  },
  {
    id: 'cosmology:scale-ladder',
    library: 'cosmology',
    title: 'Cosmological scale ladder',
    content:
      'Planck 1.6e-35 m → atomic 1e-10 → cell 1e-5 → human 1 → city 1e4 ' +
      '→ planet 1e7 → star 1e9 → AU 1.5e11 → light-year 9.5e15 → galaxy 1e21 ' +
      '→ observable universe 8.8e26 m.',
    tags: ['cosmology', 'scale', 'world-design'],
    refs: ['086A'],
  },
  {
    id: 'language:phonosemantics',
    library: 'language',
    title: 'Phonosemantic clusters (bouba-kiki)',
    content:
      'Rounded vowels (o,u) + voiced consonants (b,m,l) → soft, friendly. ' +
      'Sharp vowels (i,e) + unvoiced stops (k,t,p) → angular, fast.',
    tags: ['language', 'naming', 'character-design'],
    refs: ['086D'],
  },
  {
    id: 'power-systems:5tuple',
    library: 'power-systems',
    title: 'Power-system substrate primitives',
    content:
      'A coherent power system declares: ' +
      '(1) source — what fuels the ability (ki, chakra, will, mana, blood) ' +
      '(2) cost — what is paid per use (stamina, lifespan, sanity, time) ' +
      '(3) form — how it manifests (projectile, transformation, area, summon) ' +
      '(4) cap — canonical limit and what breaks it ' +
      '(5) signature — unique aesthetic per practitioner.',
    tags: ['power-systems', 'character', 'world-design'],
    refs: ['092'],
  },
  {
    id: 'mathematics:phi-fractal',
    library: 'mathematics',
    title: 'Golden ratio + fractal organic structure',
    content:
      'φ ≈ 1.618. Spiral arrangements at golden angle (137.5°) maximize ' +
      'non-overlap → sunflower seeds, pine cones, branch placement. ' +
      'Self-similar fractals generate natural-looking terrain, plants, organic forms.',
    tags: ['mathematics', 'fractal', 'phi', 'visual-design'],
    refs: ['086B'],
  },
];

function rawToEntry(r: WorldEntryRaw): MemoryEntry {
  return {
    key: r.id,
    value: { title: r.title, content: r.content, refs: r.refs ?? [] },
    topic: r.library,
    source: 'reality-library',
    createdAt: 0,
    updatedAt: 0,
  };
}

export class WorldMemory implements MemoryLayer {
  readonly name = 'world' as const;
  private readonly index: WorldEntryRaw[];
  private readonly cache: Map<string, MemoryEntry>;

  constructor(extra: WorldEntryRaw[] = []) {
    this.index = [...SEED_ENTRIES, ...extra];
    this.cache = new Map(this.index.map((e) => [e.id, rawToEntry(e)]));
  }

  async get(key: string): Promise<MemoryEntry | undefined> {
    return this.cache.get(key);
  }

  async put(): Promise<void> {
    throw new Error('WorldMemory is read-only — use curated ingestion pipeline');
  }

  async remove(): Promise<boolean> {
    return false;
  }

  async query(q: MemoryQuery): Promise<MemoryEntry[]> {
    let candidates = this.index.slice();
    if (q.topic) {
      candidates = candidates.filter((e) => e.library === q.topic || e.tags.includes(q.topic!));
    }
    if (q.text) {
      const lc = q.text.toLowerCase();
      candidates = candidates.filter(
        (e) =>
          e.title.toLowerCase().includes(lc) ||
          e.content.toLowerCase().includes(lc) ||
          e.tags.some((t) => t.includes(lc)),
      );
    }
    if (q.source) {
      candidates = candidates.filter(() => 'reality-library' === q.source);
    }
    return candidates.slice(0, q.limit ?? 20).map(rawToEntry);
  }

  async *all(): AsyncIterable<MemoryEntry> {
    for (const e of this.index) yield rawToEntry(e);
  }

  /** All entries in a given library. */
  byLibrary(lib: RealityLibrary): MemoryEntry[] {
    return this.index.filter((e) => e.library === lib).map(rawToEntry);
  }

  /** Libraries that have at least one entry. */
  libraries(): RealityLibrary[] {
    return Array.from(new Set(this.index.map((e) => e.library)));
  }
}

// Silence unused-import warnings if kernelNow isn't referenced.
void kernelNow;
