/**
 * inferDomain — best-effort domain inference from a free-text prompt.
 *
 * Used by the EmptyState prompt cards, the "new" chip, and `/grow <prompt>`
 * to route a phrase to a growable domain. Falls back to `visual2d` (which
 * always grows successfully) when nothing matches.
 *
 * Determinism: same prompt → same domain, no RNG, pure keyword scoring.
 */

interface Rule {
  domain: string;
  keywords: string[];
  weight?: number;
}

const RULES: Rule[] = [
  // Visual / image / scene
  { domain: 'visual2d', keywords: ['art', 'painting', 'image', 'illustration', 'graphic', 'poster', 'abstract', 'pattern', 'collage'] },
  { domain: 'visual2d', keywords: ['sunset', 'mountains', 'sky', 'forest', 'ocean', 'landscape', 'cityscape', 'skyline'] },
  // Worlds + maps
  { domain: 'world', keywords: ['world', 'map', 'realm', 'kingdom', 'planet', 'continent', 'archipelago', 'biome', 'terrain'] },
  // Game
  { domain: 'game', keywords: ['game', 'gameplay', 'level', 'platformer', 'rpg', 'arena', 'quest'] },
  // Music
  { domain: 'music', keywords: ['music', 'song', 'melody', 'soundtrack', 'jazz', 'ambient', 'beat', 'rhythm'] },
  // Narrative
  { domain: 'narrative', keywords: ['story', 'tale', 'narrative', 'novel', 'chapter', 'plot', 'character arc', 'monologue'] },
  // Website
  { domain: 'website', keywords: ['website', 'landing page', 'portfolio', 'site', 'homepage', 'web app', 'product page'] },
  // Sprite
  { domain: 'sprite', keywords: ['sprite', 'pixel art', '8-bit', '16-bit', 'pixel character', 'tile'] },
  // Molecule / chem
  { domain: 'molecule', keywords: ['molecule', 'chemical', 'compound', 'protein', 'amino acid', 'caffeine', 'aspirin', 'serotonin'] },
  // Quantum
  { domain: 'quantum', keywords: ['quantum', 'wavefunction', 'orbital', 'particle', 'double-well', 'schrödinger', 'schrodinger'] },
  // Field / EM
  { domain: 'field', keywords: ['electromagnetic', 'field', 'em field', 'dipole', 'maxwell', 'antenna'] },
  // Cosmology
  { domain: 'cosmology', keywords: ['galaxy', 'cosmos', 'universe', 'n-body', 'spiral galaxy', 'cluster', 'gravitational'] },
];

const NEGATIVES: Record<string, string[]> = {
  visual2d: ['ocean world', 'fantasy world', 'cyberpunk city'], // these should be world/website
};

export function inferDomain(prompt: string): string {
  const text = prompt.toLowerCase();
  const scores = new Map<string, number>();

  for (const rule of RULES) {
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        scores.set(rule.domain, (scores.get(rule.domain) ?? 0) + (rule.weight ?? 1));
      }
    }
  }

  // Apply negative rules
  for (const [dom, negs] of Object.entries(NEGATIVES)) {
    for (const neg of negs) {
      if (text.includes(neg)) {
        scores.set(dom, (scores.get(dom) ?? 0) - 2);
      }
    }
  }

  if (scores.size === 0) return 'visual2d';

  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  return sorted[0][1] > 0 ? sorted[0][0] : 'visual2d';
}
