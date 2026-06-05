// Local type definitions to avoid circular dependencies
// Mirrors the Seed class shape in seed-class.ts without importing it
export interface Seed {
  id?: string;
  hash?: string;
  $name?: string;
  $domain?: string;
  $hash?: string;
  $lineage?: { generation?: number; parents?: string[]; operators?: string[]; timestamp?: number; fitness?: number };
  $fitness?: { overall?: number };
  metadata?: { name?: string; domain?: string; owner?: string; tags?: string[] };
  genes?: Record<string, { type?: string; value?: any; schema?: any }>;
  lineage?: { generation?: number; parents?: string[]; operators?: string[]; timestamp?: number; fitness?: number };
  signature?: string;
  [key: string]: any;
}

export interface Artifact {
  type: string;
  name: string;
  domain: string;
  seed_hash: string;
  generation: number;
  render_hints: Record<string, any>;
  [key: string]: any;
}

export type GeneratorOutput = any;

export interface SeedRouterConfig {
  domains?: string[];
  fallback?: string;
}

export interface SeedGraphNode {
  id: string;
  seed: Seed;
  source?: string;
  functor?: string;
}

export interface SeedGraphEdge {
  from: string;
  to: string;
  type: string;
}

/**
 * Tiny pure deterministic title derivation from intent/prompt.
 * Used to ensure human-readable display_name / name / $name instead of raw hashes/IDs.
 * Fully deterministic (string ops only), no RNG, no side effects.
 *
 * Produces a clean, human-readable name — NEVER appends a hash/ID suffix. The
 * short hash is surfaced separately as its own UI chip, so the name itself stays
 * a real title (e.g. "Cyberpunk City Skyline In Rain", "Aria"). Words that already
 * carry intentional casing (camelCase / PascalCase like "ToolTestHero") are
 * preserved verbatim; plain words are Title-Cased.
 */
export function deriveCleanTitle(intent: string | undefined | null, seedHash?: string): string {
  if (!intent || typeof intent !== 'string' || intent.trim().length === 0) {
    const h = (seedHash || '').slice(0, 8);
    return h ? `Seed-${h}` : 'Untitled Seed';
  }
  const words = intent
    .replace(/[^a-zA-Z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 6);
  let title = words
    .map((w) =>
      // Preserve words that already contain an intentional uppercase letter
      // (camelCase / PascalCase / acronyms) so names like "ToolTestHero" survive.
      /[A-Z]/.test(w)
        ? w.charAt(0).toUpperCase() + w.slice(1)
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(' ');
  if (!title) title = 'Vision';
  if (title.length > 60) title = title.slice(0, 57) + '...';
  return title;
}
