// Local type definitions to avoid circular dependencies
// Mirrors the Seed class shape in seed-class.ts without importing it
import { nameSeedSync } from '../naming/seed-namer';

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
 * Pure deterministic title derivation from intent/prompt.
 * Used to ensure human-readable display_name / name / $name instead of raw hashes/IDs.
 *
 * Delegates to the SeedNamer (Tier 1 PoS-pairing → Tier 0 hash fallback). The
 * intent and seed hash are both deterministic, so same input → same output
 * forever, which preserves the determinism contract. No RNG, no wall-clock.
 */
export function deriveCleanTitle(intent: string | undefined | null, seedHash?: string): string {
  if (!intent || typeof intent !== 'string' || intent.trim().length === 0) {
    const h = (seedHash || '').slice(0, 8);
    return h ? `Seed-${h}` : 'Untitled Seed';
  }
  
  // Check if the intent looks like an explicit name override (no spaces, or camelCase/PascalCase)
  // This preserves names like 'ToolTestHero', 'Aria', 'Echo' that are explicitly provided
  const hasSpaces = /\s/.test(intent);
  const isCamelCase = /^[a-z]+([A-Z][a-z]*)*$/.test(intent);
  const isPascalCase = /^[A-Z][a-z]+([A-Z][a-z]*)*$/.test(intent);
  
  // If it's a single word without special characters, treat it as an explicit name
  if (!hasSpaces && (isCamelCase || isPascalCase || /^[a-zA-Z]+$/.test(intent))) {
    // Clean up the name: capitalize first letter, lowercase the rest
    const cleaned = intent.charAt(0).toUpperCase() + intent.slice(1);
    return cleaned;
  }
  
  const named = nameSeedSync(intent, 'character');
  // If SeedNamer gave us back a hash-style name (Tier 0 for very short / empty
  // intent), fall back to the original intent+hash to preserve readability.
  if (named.tier === 0) {
    const words = intent
      .replace(/[^a-zA-Z0-9\s-]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 6);
    let title = words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    if (!title) title = 'Vision';
    const h = (seedHash || '').slice(0, 6);
    if (h) title += ` ${h}`;
    if (title.length > 60) title = title.slice(0, 57) + '...';
    return title;
  }
  return named.name;
}
