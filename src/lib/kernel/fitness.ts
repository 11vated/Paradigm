/**
 * Domain-Specific Fitness Evaluators
 *
 * Replaces random fitness assignment with meaningful, deterministic quality scores.
 * Each evaluator inspects the seed's genes and/or the grown artifact to produce
 * a FitnessReport with overall score, per-dimension scores, and penalties.
 *
 * All evaluators are pure functions — deterministic, no side effects, no Math.random.
 */

import { growSeed } from './engines.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FitnessReport {
  overall: number;                          // 0-1
  dimensions: Record<string, number>;       // per-dimension scores, each 0-1
  penalties: string[];                      // human-readable deductions
}

interface Seed {
  $domain?: string;
  $name?: string;
  genes?: Record<string, { type?: string; value?: any }>;
  [key: string]: any;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function geneVal(seed: Seed, name: string, fallback: any = null): any {
  return seed.genes?.[name]?.value ?? fallback;
}

function geneCount(seed: Seed): number {
  return seed.genes ? Object.keys(seed.genes).length : 0;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function isValidNumber(v: any): v is number {
  return typeof v === 'number' && !isNaN(v) && isFinite(v);
}

function diversity(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return clamp01(Math.sqrt(variance) * 3); // normalized so ~0.3 std dev = 1.0
}

// ─── Domain Evaluators ───────────────────────────────────────────────────────

function evaluateCharacter(seed: Seed): FitnessReport {
  const dims: Record<string, number> = {};
  const penalties: string[] = [];

  // Gene richness
  const gc = geneCount(seed);
  dims.gene_richness = clamp01(gc / 7);
  if (gc < 3) penalties.push('Fewer than 3 genes');

  // Stat diversity (avoid all-zero or all-max)
  const stats = ['strength', 'agility', 'size'].map(g => {
    const v = geneVal(seed, g, 0.5);
    return isValidNumber(v) ? v : 0.5;
  });
  dims.stat_diversity = diversity(stats);
  if (stats.every(s => s > 0.9)) penalties.push('All stats maxed — no diversity');
  if (stats.every(s => s < 0.1)) penalties.push('All stats near zero');

  // Palette validity
  const palette = geneVal(seed, 'palette', null);
  dims.palette_valid = Array.isArray(palette) && palette.length >= 3 ? 1.0 : 0.3;

  // Archetype presence
  dims.archetype = geneVal(seed, 'archetype', null) ? 1.0 : 0.3;

  const overall = Object.values(dims).reduce((a, b) => a + b, 0) / Object.keys(dims).length;
  return { overall: clamp01(overall), dimensions: dims, penalties };
}

function evaluateMusic(seed: Seed): FitnessReport {
  const dims: Record<string, number> = {};
  const penalties: string[] = [];

  let tempo = geneVal(seed, 'tempo', 0.5);
  if (isValidNumber(tempo) && tempo <= 1) tempo = 60 + tempo * 140;
  dims.tempo_valid = (isValidNumber(tempo) && tempo >= 40 && tempo <= 240) ? 1.0 : 0.2;
  if (isValidNumber(tempo) && (tempo < 40 || tempo > 240)) penalties.push(`Tempo ${tempo} BPM out of range`);

  const validScales = ['major', 'minor', 'pentatonic', 'blues', 'dorian', 'mixolydian', 'chromatic'];
  const scale = geneVal(seed, 'scale', 'major');
  dims.scale_valid = validScales.includes(scale) ? 1.0 : 0.4;

  dims.key_present = geneVal(seed, 'key', null) ? 1.0 : 0.3;
  dims.gene_richness = clamp01(geneCount(seed) / 5);

  const melody = geneVal(seed, 'melody', []);
  dims.melody_length = Array.isArray(melody) ? clamp01(melody.length / 16) : 0;

  const overall = Object.values(dims).reduce((a, b) => a + b, 0) / Object.keys(dims).length;
  return { overall: clamp01(overall), dimensions: dims, penalties };
}

function evaluateGeometry3d(seed: Seed): FitnessReport {
  const dims: Record<string, number> = {};
  const penalties: string[] = [];

  const detail = geneVal(seed, 'detail', 0.5);
  dims.detail_score = isValidNumber(detail) ? clamp01(detail) : 0.5;

  const validPrimitives = ['sphere', 'cube', 'cylinder', 'torus', 'cone', 'icosahedron'];
  const prim = geneVal(seed, 'primitive', 'sphere');
  dims.primitive_valid = validPrimitives.includes(prim) ? 1.0 : 0.5;

  const material = geneVal(seed, 'material', null);
  dims.material_present = material ? 1.0 : 0.3;

  dims.gene_richness = clamp01(geneCount(seed) / 4);

  const overall = Object.values(dims).reduce((a, b) => a + b, 0) / Object.keys(dims).length;
  return { overall: clamp01(overall), dimensions: dims, penalties };
}

function evaluatePhysics(seed: Seed): FitnessReport {
  const dims: Record<string, number> = {};
  const penalties: string[] = [];

  const grav = geneVal(seed, 'gravity', 0.5);
  dims.gravity_valid = isValidNumber(grav) ? 1.0 : 0.3;
  if (isValidNumber(grav) && grav > 0.95) penalties.push('Extreme gravity');

  const friction = geneVal(seed, 'friction', 0.3);
  dims.friction_range = isValidNumber(friction) && friction >= 0 && friction <= 1 ? 1.0 : 0.3;

  const elasticity = geneVal(seed, 'elasticity', 0.8);
  dims.elasticity_range = isValidNumber(elasticity) && elasticity >= 0 && elasticity <= 1 ? 1.0 : 0.3;

  dims.gene_richness = clamp01(geneCount(seed) / 4);

  const overall = Object.values(dims).reduce((a, b) => a + b, 0) / Object.keys(dims).length;
  return { overall: clamp01(overall), dimensions: dims, penalties };
}

function evaluateNarrative(seed: Seed): FitnessReport {
  const dims: Record<string, number> = {};
  const penalties: string[] = [];

  const characters = geneVal(seed, 'characters', []);
  const castSize = Array.isArray(characters) ? characters.length : 0;
  dims.cast_size = clamp01(castSize / 5);
  if (castSize === 0) penalties.push('No characters defined');

  const structure = geneVal(seed, 'structure', null);
  const validStructures = ['heros_journey', 'five_act', 'nonlinear', 'frame', 'episodic'];
  dims.structure_valid = structure && validStructures.includes(structure) ? 1.0 : 0.4;

  dims.tone_present = geneVal(seed, 'tone', null) ? 1.0 : 0.3;
  dims.plot_present = geneVal(seed, 'plot', null) ? 1.0 : 0.3;
  dims.gene_richness = clamp01(geneCount(seed) / 5);

  const overall = Object.values(dims).reduce((a, b) => a + b, 0) / Object.keys(dims).length;
  return { overall: clamp01(overall), dimensions: dims, penalties };
}

function evaluateFullgame(seed: Seed): FitnessReport {
  const dims: Record<string, number> = {};
  const penalties: string[] = [];

  dims.genre_present = geneVal(seed, 'genre', null) ? 1.0 : 0.3;

  const diff = geneVal(seed, 'difficulty', 0.5);
  dims.difficulty_range = isValidNumber(diff) && diff >= 0.1 && diff <= 0.9 ? 1.0 : 0.5;
  if (isValidNumber(diff) && (diff < 0.05 || diff > 0.95)) penalties.push('Extreme difficulty');

  const mechanics = geneVal(seed, 'mechanics', []);
  dims.mechanics_count = Array.isArray(mechanics) ? clamp01(mechanics.length / 3) : 0.3;

  dims.gene_richness = clamp01(geneCount(seed) / 4);

  const overall = Object.values(dims).reduce((a, b) => a + b, 0) / Object.keys(dims).length;
  return { overall: clamp01(overall), dimensions: dims, penalties };
}

// ─── Generic Fallback ────────────────────────────────────────────────────────

function evaluateGeneric(seed: Seed): FitnessReport {
  const dims: Record<string, number> = {};
  const penalties: string[] = [];

  const gc = geneCount(seed);
  dims.gene_richness = clamp01(gc / 5);
  if (gc === 0) penalties.push('No genes defined');

  // Check all genes validate (value is not null/undefined)
  let validGenes = 0;
  for (const [, gene] of Object.entries(seed.genes || {})) {
    if (gene.value !== null && gene.value !== undefined) validGenes++;
  }
  dims.gene_validity = gc > 0 ? validGenes / gc : 0;

  dims.domain_present = seed.$domain ? 1.0 : 0;
  dims.name_present = seed.$name ? 1.0 : 0.3;

  const overall = Object.values(dims).reduce((a, b) => a + b, 0) / Object.keys(dims).length;
  return { overall: clamp01(overall), dimensions: dims, penalties };
}

// ─── Domain Router ───────────────────────────────────────────────────────────

const DOMAIN_EVALUATORS: Record<string, (seed: Seed) => FitnessReport> = {
  character: evaluateCharacter,
  music: evaluateMusic,
  geometry3d: evaluateGeometry3d,
  physics: evaluatePhysics,
  narrative: evaluateNarrative,
  fullgame: evaluateFullgame,
};

export function evaluateFitness(seed: Seed): FitnessReport {
  const domain = seed.$domain || '';
  const evaluator = DOMAIN_EVALUATORS[domain] || evaluateGeneric;
  return evaluator(seed);
}
