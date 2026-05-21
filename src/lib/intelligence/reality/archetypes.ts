/**
 * Archetype Lattice — Reality-OS substrate primitive
 *
 * The 15 Jungian-derived archetypes from PersonalityAgent, structured
 * as a graph of relationships:
 *
 *   pair       — archetypes that complement / amplify each other
 *   oppose     — archetypes that conflict / create dramatic tension
 *   transformInto — canonical growth path (which archetype follows which)
 *
 * Used by the Sovereign Agent for:
 *   - Character-pair generation (give me a friend who completes this hero)
 *   - Narrative conflict design (the right antagonist for this protagonist)
 *   - Character-arc planning (where will this archetype grow to?)
 *   - Composition tiebreaking (which archetype dominates when blending?)
 */

export type Archetype =
  | 'hero'
  | 'sage'
  | 'rebel'
  | 'caregiver'
  | 'jester'
  | 'lover'
  | 'ruler'
  | 'creator'
  | 'explorer'
  | 'innocent'
  | 'magician'
  | 'everyman'
  | 'outlaw'
  | 'shadow'
  | 'mentor';

export const ALL_ARCHETYPES: readonly Archetype[] = [
  'hero', 'sage', 'rebel', 'caregiver', 'jester',
  'lover', 'ruler', 'creator', 'explorer', 'innocent',
  'magician', 'everyman', 'outlaw', 'shadow', 'mentor',
] as const;

export interface ArchetypeNode {
  id: Archetype;
  /** Core motivation in one short phrase. */
  motivation: string;
  /** Dominant fear that drives transformation. */
  fear: string;
  /** Canonical 12-D adjective center (used for resonance matching). */
  vad12: number[]; // length 12
  /** Archetypes that pair well (complementary). */
  pairs: Archetype[];
  /** Archetypes that create dramatic opposition. */
  opposes: Archetype[];
  /** Archetypes this one canonically transforms into via growth. */
  transformsInto: Archetype[];
}

// Convenience: dimensions referenced are
// [valence, arousal, dominance, warmth, brightness, hardness, density,
//  smoothness, speed, novelty, openness, focus]

export const ARCHETYPE_LATTICE: Record<Archetype, ArchetypeNode> = {
  hero: {
    id: 'hero',
    motivation: 'prove worth through courageous action',
    fear: 'weakness, cowardice',
    vad12: [0.5, 0.8, 0.8, 0.3, 0.5, 0.7, 0.5, 0.0, 0.7, 0.3, 0.3, 0.8],
    pairs: ['mentor', 'innocent', 'lover'],
    opposes: ['shadow', 'outlaw'],
    transformsInto: ['mentor', 'ruler'],
  },
  sage: {
    id: 'sage',
    motivation: 'find truth, understand the world',
    fear: 'deception, ignorance',
    vad12: [0.2, 0.0, 0.5, 0.0, 0.7, 0.4, 0.6, 0.4, -0.3, 0.6, 0.9, 0.9],
    pairs: ['hero', 'explorer', 'magician'],
    opposes: ['jester', 'innocent'],
    transformsInto: ['magician', 'mentor'],
  },
  rebel: {
    id: 'rebel',
    motivation: 'break what doesn\'t serve, overturn the order',
    fear: 'powerlessness, conformity',
    vad12: [0.0, 0.9, 0.7, -0.3, 0.4, 0.9, 0.4, -0.5, 0.8, 0.8, 0.5, 0.4],
    pairs: ['outlaw', 'creator', 'magician'],
    opposes: ['ruler', 'caregiver'],
    transformsInto: ['outlaw', 'creator'],
  },
  caregiver: {
    id: 'caregiver',
    motivation: 'protect and nurture others',
    fear: 'selfishness, neglect',
    vad12: [0.8, 0.3, 0.4, 0.9, 0.6, 0.2, 0.7, 0.8, 0.2, -0.2, 0.5, 0.6],
    pairs: ['innocent', 'everyman', 'lover'],
    opposes: ['rebel', 'outlaw'],
    transformsInto: ['mentor', 'ruler'],
  },
  jester: {
    id: 'jester',
    motivation: 'find joy, lighten the world',
    fear: 'boredom, gravity, taking life too seriously',
    vad12: [0.7, 0.7, 0.3, 0.5, 0.9, -0.3, 0.5, 0.6, 0.7, 0.7, 0.7, 0.0],
    pairs: ['everyman', 'innocent', 'lover'],
    opposes: ['sage', 'ruler'],
    transformsInto: ['everyman', 'creator'],
  },
  lover: {
    id: 'lover',
    motivation: 'connect deeply, experience beauty',
    fear: 'isolation, unloved',
    vad12: [0.8, 0.6, 0.3, 0.9, 0.7, 0.0, 0.6, 0.9, 0.4, 0.4, 0.7, 0.5],
    pairs: ['caregiver', 'innocent', 'hero'],
    opposes: ['outlaw', 'shadow'],
    transformsInto: ['caregiver', 'creator'],
  },
  ruler: {
    id: 'ruler',
    motivation: 'create lasting order, exercise responsible power',
    fear: 'chaos, being usurped',
    vad12: [0.3, 0.5, 0.95, 0.0, 0.4, 0.8, 0.8, 0.3, 0.0, -0.3, 0.2, 0.9],
    pairs: ['mentor', 'sage', 'caregiver'],
    opposes: ['rebel', 'outlaw'],
    transformsInto: ['mentor', 'magician'],
  },
  creator: {
    id: 'creator',
    motivation: 'bring new things into being',
    fear: 'mediocrity, sterile imitation',
    vad12: [0.7, 0.6, 0.6, 0.4, 0.8, 0.3, 0.7, 0.5, 0.5, 0.9, 0.95, 0.7],
    pairs: ['magician', 'rebel', 'explorer'],
    opposes: ['everyman'],
    transformsInto: ['magician', 'mentor'],
  },
  explorer: {
    id: 'explorer',
    motivation: 'discover new territory, escape stagnation',
    fear: 'entrapment, the known',
    vad12: [0.5, 0.7, 0.5, 0.2, 0.7, 0.5, 0.3, 0.4, 0.8, 0.95, 0.95, 0.6],
    pairs: ['sage', 'creator', 'hero'],
    opposes: ['everyman', 'innocent'],
    transformsInto: ['sage', 'creator'],
  },
  innocent: {
    id: 'innocent',
    motivation: 'see goodness, live simply',
    fear: 'corruption, wickedness',
    vad12: [0.9, 0.2, 0.1, 0.7, 0.95, -0.5, 0.3, 0.95, 0.2, 0.0, 0.6, 0.4],
    pairs: ['caregiver', 'hero', 'lover'],
    opposes: ['outlaw', 'shadow'],
    transformsInto: ['hero', 'sage'],
  },
  magician: {
    id: 'magician',
    motivation: 'understand reality\'s laws and reshape them',
    fear: 'unintended consequences, hubris\' price',
    vad12: [0.4, 0.5, 0.9, 0.3, 0.6, 0.6, 0.8, 0.5, 0.4, 0.9, 0.95, 0.95],
    pairs: ['sage', 'creator', 'rebel'],
    opposes: ['everyman'],
    transformsInto: ['mentor', 'sage'],
  },
  everyman: {
    id: 'everyman',
    motivation: 'belong, connect with others on level ground',
    fear: 'standing out, exclusion',
    vad12: [0.4, 0.2, 0.0, 0.6, 0.5, 0.0, 0.4, 0.5, 0.0, -0.4, 0.3, 0.3],
    pairs: ['jester', 'caregiver', 'innocent'],
    opposes: ['ruler', 'magician'],
    transformsInto: ['hero', 'caregiver'],
  },
  outlaw: {
    id: 'outlaw',
    motivation: 'break corrupt rules, exact reckoning',
    fear: 'being controlled, being insignificant',
    vad12: [-0.3, 0.9, 0.8, -0.5, 0.2, 0.95, 0.6, -0.7, 0.7, 0.6, 0.5, 0.5],
    pairs: ['rebel', 'shadow'],
    opposes: ['ruler', 'innocent', 'caregiver'],
    transformsInto: ['rebel', 'magician'],
  },
  shadow: {
    id: 'shadow',
    motivation: 'embody what is denied / rejected',
    fear: 'integration, being known',
    vad12: [-0.6, 0.5, 0.6, -0.5, -0.6, 0.7, 0.7, -0.4, 0.3, 0.7, 0.5, 0.6],
    pairs: ['outlaw'],
    opposes: ['hero', 'innocent', 'lover'],
    transformsInto: ['mentor', 'magician'], // shadow integration → wisdom
  },
  mentor: {
    id: 'mentor',
    motivation: 'guide the next hero, pass on wisdom',
    fear: 'failure of student, irrelevance',
    vad12: [0.4, 0.3, 0.8, 0.7, 0.7, 0.5, 0.7, 0.7, 0.0, 0.3, 0.7, 0.95],
    pairs: ['hero', 'sage', 'ruler'],
    opposes: ['jester'],
    transformsInto: ['sage'],
  },
};

/** Best complementary archetype for a given one. */
export function pairFor(a: Archetype): Archetype[] {
  return ARCHETYPE_LATTICE[a].pairs;
}

/** Best dramatic opposite for a given archetype. */
export function opposeFor(a: Archetype): Archetype[] {
  return ARCHETYPE_LATTICE[a].opposes;
}

/** Where this archetype canonically grows to. */
export function arcOf(a: Archetype): Archetype[] {
  return ARCHETYPE_LATTICE[a].transformsInto;
}

/**
 * Find the archetype whose 12-D adjective center best matches the
 * given vector. Used by sub-agents to suggest archetypes from
 * free-form descriptions.
 */
export function classifyByVector(v12: number[]): {
  archetype: Archetype;
  confidence: number;
} {
  let best: Archetype = 'everyman';
  let bestScore = -Infinity;
  for (const arch of ALL_ARCHETYPES) {
    const center = ARCHETYPE_LATTICE[arch].vad12;
    const s = cosine12(v12, center);
    if (s > bestScore) {
      bestScore = s;
      best = arch;
    }
  }
  return { archetype: best, confidence: Math.max(0, bestScore) };
}

function cosine12(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < 12; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    na += av * av;
    nb += bv * bv;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom < 1e-9 ? 0 : dot / denom;
}
