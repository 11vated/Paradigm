/**
 * Shared color constants for the Paradigm platform.
 * Single source of truth — import from here, never hardcode.
 */

// ─── Domain Colors ───────────────────────────────────────────────────────────
// Maps each creative domain to its display color (hex).

export const DOMAIN_COLORS: Record<string, string> = {
  // Core 27 engine domains
  character: '#00E5FF', sprite: '#10B981', music: '#8B5CF6', visual2d: '#06B6D4',
  procedural: '#EC4899', narrative: '#F59E0B', audio: '#EF4444', fullgame: '#14B8A6',
  animation: '#A855F7', geometry3d: '#22D3EE', physics: '#F43F5E', ecosystem: '#2DD4BF',
  game: '#FB923C', alife: '#818CF8', shader: '#D946EF', particle: '#D946EF',
  architecture: '#A855F7', vehicle: '#22D3EE', food: '#FB923C', choreography: '#E879F9',
  ui: '#FBBF24', typography: '#94A3B8', furniture: '#78716C', fashion: '#F472B6',
  robotics: '#6366F1', circuit: '#4ADE80', agent: '#FF6B6B',
  // Extended / library domains
  algorithm: '#10B981', building: '#A855F7', camera: '#06B6D4', creature: '#00E5FF',
  'cross-domain': '#8A2BE2', fluid: '#22D3EE', framework: '#8B5CF6', fx: '#D946EF',
  lighting: '#FBBF24', materials: '#EC4899', plant: '#10B981', scene: '#14B8A6',
  style: '#F472B6', weather: '#2DD4BF',
};

// ─── Operation Colors ────────────────────────────────────────────────────────
// Maps lineage operations to display colors.

export const OP_COLORS: Record<string, string> = {
  primordial: '#00E5FF',
  mutate: '#FF0055',
  breed: '#8A2BE2',
  compose: '#06B6D4',
  grow: '#F59E0B',
  evolve: '#EC4899',
  agent_mutate: '#FF0055',
  agent_breed: '#8A2BE2',
  agent_compose: '#06B6D4',
};

// ─── Gene Type Colors ────────────────────────────────────────────────────────
// Maps each of the 17 gene types to a display color.

export const TYPE_COLORS: Record<string, string> = {
  scalar: '#00E5FF', categorical: '#FF0055', vector: '#8A2BE2', expression: '#8B5CF6',
  struct: '#EC4899', array: '#F59E0B', graph: '#EF4444', topology: '#14B8A6',
  temporal: '#A855F7', regulatory: '#F43F5E', field: '#22D3EE', symbolic: '#D946EF',
  quantum: '#6366F1', gematria: '#FB923C', resonance: '#2DD4BF', dimensional: '#818CF8',
  sovereignty: '#FBBF24',
};

// ─── Helper ──────────────────────────────────────────────────────────────────

export function getDomainColor(domain: string): string {
  return DOMAIN_COLORS[domain] || '#6B7280';
}

export function getOpColor(op: string): string {
  return OP_COLORS[op] || '#6B7280';
}

export function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || '#6B7280';
}
