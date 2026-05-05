/**
 * Phase 9 — Cross-Domain Multi-Source Composition
 *
 * The existing `composeSeed` in `kernel/composition.ts` maps a SINGLE source
 * seed to a target domain via a direct functor or a BFS-found path. This
 * module extends that primitive to the platform's headline capability:
 * **fuse N seeds from N different domains into one target-domain seed**.
 *
 * Pipeline:
 *   1. For each input seed, call `composeSeed(seed, targetDomain)`. This
 *      walks the functor graph if no direct edge exists.
 *   2. Drop inputs whose domain is unreachable from the target (the caller
 *      can opt to throw instead via `strict: true`).
 *   3. Per-gene merge of the resulting same-domain seeds using the chosen
 *      strategy.
 *   4. Stitch full lineage so every input seed becomes a recorded parent,
 *      and the per-input functor path is preserved in `$metadata`.
 *
 * Strategies:
 *   - `first-wins`: take the first projection's gene; deterministic, cheap.
 *   - `dominant`: the input with the highest base $fitness.overall wins each
 *     gene. Ties broken by input order. Falls back to first-wins if no
 *     fitness present.
 *   - `mean`: numeric scalars and equal-length vectors are averaged across
 *     projections. Categoricals fall back to majority vote (ties → first).
 *     Non-mergeable types fall back to first-wins.
 *   - `weighted`: same as mean but with caller-supplied weights per input.
 *     Weights are normalized to sum=1; missing weights default to 1.
 *
 * Determinism axiom: every projection and every merge step is pure given
 * input + strategy + weights. Re-running with the same inputs produces a
 * byte-identical result (modulo the lineage timestamp). Token-id-style
 * stable identity is provided by `$hash` (sha256 of `genes` JSON) which is
 * recomputed by `finalizeMergedSeed`.
 */

import crypto from 'crypto';
import { composeSeed, findCompositionPath, getFunctor } from '../kernel/composition.js';
import { mergeTrees, type MergeConflict } from '../vcs/operations.js';
import type { SeedTree, Gene } from '../vcs/objects.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CrossDomainSeed {
  $gst?: string;
  $domain?: string;
  $name?: string;
  $hash?: string;
  $lineage?: {
    generation?: number;
    operation?: string;
    parents?: string[];
    timestamp?: string;
  };
  $fitness?: { overall?: number };
  $metadata?: Record<string, any>;
  genes?: Record<string, { type: string; value: any }>;
  [key: string]: any;
}

export type MergeStrategy = 'first-wins' | 'dominant' | 'mean' | 'weighted' | 'vcs-merge';

/** Strategies that vcs-merge can fall back to on a per-gene conflict. */
export type VcsMergeFallback = 'first-wins' | 'dominant' | 'mean' | 'weighted';

export interface ComposeMultiDomainOptions {
  strategy?: MergeStrategy;
  /** Per-input weight, indexed by position in `seeds`. Used by `weighted`. */
  weights?: number[];
  /** If true, throw when any input cannot reach `targetDomain`. */
  strict?: boolean;
  /** Override the resulting seed's display name. */
  name?: string;
  /** When strategy='vcs-merge', the per-gene fallback used to resolve conflicts.
   *  Defaults to 'mean'. Cannot itself be 'vcs-merge'. */
  vcsMergeFallback?: VcsMergeFallback;
}

export interface ComposeMultiDomainResult {
  seed: CrossDomainSeed;
  /** One entry per input — hash, source domain, functor path used. */
  contributions: {
    inputHash: string;
    sourceDomain: string;
    path: { src: string; tgt: string; functor: string }[];
    reachable: boolean;
  }[];
  /** Per-gene record of which strategy resolved which input. */
  resolutions: Record<string, { strategy: MergeStrategy; chosenIndex?: number; mergedFrom?: number[]; conflictResolvedBy?: VcsMergeFallback }>;
  /** Only populated when strategy='vcs-merge'. Per-gene paths that hit a 3-way conflict. */
  vcsConflictPaths?: string[];
}

// ─── Public entry point ─────────────────────────────────────────────────────

export function composeMultiDomain(
  seeds: CrossDomainSeed[],
  targetDomain: string,
  options: ComposeMultiDomainOptions = {},
): ComposeMultiDomainResult {
  if (!Array.isArray(seeds) || seeds.length === 0) {
    throw new Error('composeMultiDomain requires at least one input seed');
  }
  if (!targetDomain || typeof targetDomain !== 'string') {
    throw new Error('composeMultiDomain requires a non-empty targetDomain');
  }

  const strategy: MergeStrategy = options.strategy ?? 'mean';
  const strict = options.strict ?? false;

  // ── Phase 1: project every input into the target domain ─────────────────
  const contributions: ComposeMultiDomainResult['contributions'] = [];
  const projections: { seed: CrossDomainSeed; weight: number; baseFitness: number; index: number }[] = [];

  seeds.forEach((seed, i) => {
    const sourceDomain = seed.$domain ?? '';
    const inputHash = seed.$hash ?? hashSeedShape(seed);
    const path =
      sourceDomain === targetDomain
        ? []
        : findCompositionPath(sourceDomain, targetDomain) ?? [];
    const directOrPath =
      sourceDomain === targetDomain ||
      Boolean(getFunctor(sourceDomain, targetDomain)) ||
      (path && path.length > 0);

    if (!directOrPath) {
      contributions.push({ inputHash, sourceDomain, path: [], reachable: false });
      if (strict) {
        throw new Error(
          `composeMultiDomain: seed ${inputHash.slice(0, 8)} (${sourceDomain}) cannot reach ${targetDomain}`,
        );
      }
      return;
    }

    const projected = composeSeed(seed, targetDomain);
    if (!projected) {
      contributions.push({ inputHash, sourceDomain, path: path ?? [], reachable: false });
      if (strict) {
        throw new Error(
          `composeMultiDomain: composeSeed returned null for ${sourceDomain}->${targetDomain}`,
        );
      }
      return;
    }

    contributions.push({ inputHash, sourceDomain, path: path ?? [], reachable: true });

    const declaredWeight = options.weights?.[i];
    const weight = typeof declaredWeight === 'number' && declaredWeight >= 0 ? declaredWeight : 1;
    const baseFitness = typeof seed.$fitness?.overall === 'number' ? seed.$fitness.overall : 0;
    projections.push({ seed: projected, weight, baseFitness, index: i });
  });

  if (projections.length === 0) {
    throw new Error(
      `composeMultiDomain: no input seed could reach target domain ${targetDomain}`,
    );
  }

  // ── Phase 2: per-gene merge ─────────────────────────────────────────────
  const vcsFallback: VcsMergeFallback = options.vcsMergeFallback ?? 'mean';
  const merged = mergeProjections(projections, strategy, vcsFallback);

  // ── Phase 3: lineage + finalize ─────────────────────────────────────────
  const parents = seeds.map((s, i) => s.$hash ?? hashSeedShape(s) ?? `input:${i}`);
  const generationMax = Math.max(0, ...seeds.map((s) => s.$lineage?.generation ?? 0));
  const compositionMeta: Record<string, any> = {
    strategy,
    targetDomain,
    inputCount: seeds.length,
    usedCount: projections.length,
    contributions: contributions.map((c) => ({
      inputHash: c.inputHash,
      sourceDomain: c.sourceDomain,
      reachable: c.reachable,
      functorPath: c.path.map((p) => p.functor),
    })),
  };
  if (strategy === 'vcs-merge') {
    compositionMeta.vcsConflicts = merged.vcsConflictPaths?.length ?? 0;
    compositionMeta.vcsConflictPaths = merged.vcsConflictPaths ?? [];
    compositionMeta.vcsMergeFallback = vcsFallback;
  }
  const finalized = finalizeMergedSeed({
    $gst: projections[0].seed.$gst ?? '1.0',
    $domain: targetDomain,
    $name: options.name ?? buildName(seeds, targetDomain),
    $lineage: {
      parents,
      operation: `compose:multi:${strategy}`,
      generation: generationMax + 1,
      timestamp: new Date().toISOString(),
    },
    genes: merged.genes,
    $metadata: { composition: compositionMeta },
  });

  return {
    seed: finalized,
    contributions,
    resolutions: merged.resolutions,
    ...(strategy === 'vcs-merge' ? { vcsConflictPaths: merged.vcsConflictPaths ?? [] } : {}),
  };
}

// ─── Merge core ─────────────────────────────────────────────────────────────

interface MergeOutput {
  genes: Record<string, { type: string; value: any }>;
  resolutions: Record<string, { strategy: MergeStrategy; chosenIndex?: number; mergedFrom?: number[]; conflictResolvedBy?: VcsMergeFallback }>;
  vcsConflictPaths?: string[];
}

function mergeProjections(
  projections: { seed: CrossDomainSeed; weight: number; baseFitness: number; index: number }[],
  strategy: MergeStrategy,
  vcsFallback: VcsMergeFallback = 'mean',
): MergeOutput {
  // ── vcs-merge takes a different path: fold real 3-way merges over the
  //    projections, treating projections[0] as a synthetic LCA. ────────
  if (strategy === 'vcs-merge') {
    return mergeViaVcs(projections, vcsFallback);
  }

  // Stable, deterministic gene-name iteration: union of all keys, sorted.
  const allGeneNames = new Set<string>();
  for (const p of projections) {
    for (const k of Object.keys(p.seed.genes ?? {})) allGeneNames.add(k);
  }
  const sortedGeneNames = [...allGeneNames].sort();

  const outGenes: Record<string, { type: string; value: any }> = {};
  const resolutions: MergeOutput['resolutions'] = {};

  for (const geneName of sortedGeneNames) {
    const present = projections
      .map((p, idx) => ({ p, idx, gene: p.seed.genes?.[geneName] }))
      .filter((entry) => entry.gene !== undefined);
    if (present.length === 0) continue;

    if (present.length === 1 || strategy === 'first-wins') {
      outGenes[geneName] = present[0].gene!;
      resolutions[geneName] = { strategy, chosenIndex: present[0].p.index };
      continue;
    }

    if (strategy === 'dominant') {
      // Highest baseFitness wins. Ties broken by earliest input index.
      let best = present[0];
      for (const e of present) {
        if (
          e.p.baseFitness > best.p.baseFitness ||
          (e.p.baseFitness === best.p.baseFitness && e.p.index < best.p.index)
        ) {
          best = e;
        }
      }
      outGenes[geneName] = best.gene!;
      resolutions[geneName] = { strategy, chosenIndex: best.p.index };
      continue;
    }

    // mean / weighted
    const weights = present.map((e) => (strategy === 'weighted' ? e.p.weight : 1));
    const merged = mergeGeneNumeric(present, weights);
    if (merged !== null) {
      outGenes[geneName] = merged;
      resolutions[geneName] = {
        strategy,
        mergedFrom: present.map((e) => e.p.index),
      };
    } else {
      // Categorical or unmergeable type → majority vote, deterministic tiebreak
      const voted = mergeGeneCategorical(present, weights);
      outGenes[geneName] = voted.gene;
      resolutions[geneName] = {
        strategy,
        chosenIndex: present[voted.chosenLocalIdx].p.index,
      };
    }
  }

  return { genes: outGenes, resolutions };
}

// ─── vcs-merge fold ─────────────────────────────────────────────────────────

/**
 * Fold the VCS three-way merge primitive over N projections.
 *
 * The VCS layer's `mergeTrees(base, ours, theirs)` is built for a normal git
 * scenario with one true LCA. Cross-domain composition has no natural LCA —
 * every projection comes out of an independent functor walk. We synthesise
 * one by treating projections[0] as the canonical reference (the "base") and
 * folding the rest in as deltas.
 *
 *   accumulator := projections[0]
 *   for each projections[i] (i >= 1):
 *     result = mergeTrees(base = projections[0], ours = accumulator, theirs = projections[i])
 *     if clean: accumulator = result.tree
 *     else: resolve each conflict via `vcsFallback` against the original
 *           projection set (so we use REAL data, not the synthetic base) and
 *           splice resolutions into the accumulator. Record the conflict path.
 *
 * Why fold instead of N-way merge? Because the VCS primitive is binary, and
 * a binary fold preserves three-way semantics step by step: every gene that
 * the accumulator changed vs proj[0] is "ours changed", every gene proj[i]
 * changed vs proj[0] is "theirs changed". Running the fold N-1 times costs
 * O(N * |genes|) which is fine — N is typically <10.
 */
function mergeViaVcs(
  projections: { seed: CrossDomainSeed; weight: number; baseFitness: number; index: number }[],
  vcsFallback: VcsMergeFallback,
): MergeOutput {
  // Single projection: nothing to merge. Take its genes verbatim.
  if (projections.length === 1) {
    const out: MergeOutput = { genes: {}, resolutions: {}, vcsConflictPaths: [] };
    const genes = projections[0].seed.genes ?? {};
    for (const [k, v] of Object.entries(genes)) {
      out.genes[k] = v;
      out.resolutions[k] = { strategy: 'vcs-merge', chosenIndex: projections[0].index };
    }
    return out;
  }

  const baseTree = projectionToTree(projections[0]);
  let accumulator: SeedTree = projectionToTree(projections[0]);
  const resolutions: MergeOutput['resolutions'] = {};
  const conflictPaths: string[] = [];
  // Seed resolutions for projections[0]'s starting genes — they are present
  // until/unless overwritten. Records the chosen index as the first input.
  for (const k of Object.keys(accumulator.genes)) {
    resolutions[k] = { strategy: 'vcs-merge', chosenIndex: projections[0].index };
  }

  for (let i = 1; i < projections.length; i++) {
    const theirs = projectionToTree(projections[i]);
    const result = mergeTrees(baseTree, accumulator, theirs);

    if (result.clean && result.tree) {
      // Clean merge: the merged tree is the new accumulator. We update
      // resolutions for genes that the right-hand side actually changed.
      const before = accumulator.genes;
      const after = result.tree.genes;
      for (const k of Object.keys(after)) {
        const changed = !genesEqualByJson(before[k], after[k]);
        if (changed) {
          resolutions[k] = { strategy: 'vcs-merge', mergedFrom: [projections[0].index, projections[i].index] };
        } else if (!resolutions[k]) {
          resolutions[k] = { strategy: 'vcs-merge', chosenIndex: projections[0].index };
        }
      }
      accumulator = result.tree;
      continue;
    }

    // Conflicts: resolve each conflicting gene via the configured fallback,
    // running it across ALL original projections that still have that gene.
    // Non-conflicting genes that the merger would have applied are still
    // applied here (we walk the conflict list as a delta over a synthetic
    // clean merge built by re-running with conflicts treated as "drop").
    const conflictByPath = new Map<string, MergeConflict>();
    for (const c of result.conflicts) conflictByPath.set(c.path, c);

    // First, apply all clean per-gene decisions exactly as mergeTrees
    // would have. We do this by simulating the per-gene rules on every key
    // that's NOT in conflict.
    const nextGenes: Record<string, Gene> = {};
    const allKeys = new Set([
      ...Object.keys(baseTree.genes),
      ...Object.keys(accumulator.genes),
      ...Object.keys(theirs.genes),
    ]);
    for (const k of allKeys) {
      if (conflictByPath.has(k)) continue; // handled in the fallback pass
      const b = baseTree.genes[k];
      const o = accumulator.genes[k];
      const t = theirs.genes[k];
      const oursChanged = !geneSameJson(b, o);
      const theirsChanged = !geneSameJson(b, t);
      if (!oursChanged && !theirsChanged) {
        if (o) nextGenes[k] = o;
      } else if (oursChanged && !theirsChanged) {
        if (o) nextGenes[k] = o;
      } else if (!oursChanged && theirsChanged) {
        if (t) {
          nextGenes[k] = t;
          resolutions[k] = { strategy: 'vcs-merge', mergedFrom: [projections[0].index, projections[i].index] };
        }
      } else if (o && t && genesEqualByJson(o, t)) {
        nextGenes[k] = o;
      }
    }

    // Now resolve every conflict via the fallback strategy applied to the
    // original projections — NOT the synthetic accumulator. Using real
    // input data keeps fallbacks like 'mean' meaningful (averaging over
    // the genuine inputs, not over already-merged intermediate values).
    for (const conflictPath of conflictByPath.keys()) {
      conflictPaths.push(conflictPath);
      const sub = projections.filter((p) => p.seed.genes?.[conflictPath] !== undefined);
      if (sub.length === 0) continue;
      const fallbackResolution = resolveOneGeneByStrategy(sub, conflictPath, vcsFallback);
      nextGenes[conflictPath] = fallbackResolution.gene;
      resolutions[conflictPath] = {
        strategy: 'vcs-merge',
        mergedFrom: sub.map((s) => s.index),
        conflictResolvedBy: vcsFallback,
        ...(fallbackResolution.chosenIndex != null ? { chosenIndex: fallbackResolution.chosenIndex } : {}),
      };
    }

    accumulator = {
      kind: 'tree',
      version: 1,
      domain: accumulator.domain,
      name: accumulator.name,
      genes: nextGenes,
    };
  }

  return { genes: accumulator.genes, resolutions, vcsConflictPaths: conflictPaths };
}

/** Convert a projected CrossDomainSeed into the SeedTree shape the VCS expects. */
function projectionToTree(p: { seed: CrossDomainSeed }): SeedTree {
  return {
    kind: 'tree',
    version: 1,
    domain: p.seed.$domain ?? '',
    name: p.seed.$name ?? '',
    genes: (p.seed.genes ?? {}) as Record<string, Gene>,
  };
}

/** Order-insensitive gene equality (matches geneEquals in vcs/operations). */
function genesEqualByJson(a: Gene | undefined, b: Gene | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return stableJson(a) === stableJson(b);
}

function geneSameJson(a: Gene | undefined, b: Gene | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return genesEqualByJson(a, b);
}

/** Lightweight key-sorted JSON used only for equality checks above. */
function stableJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(stableJson).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableJson((v as any)[k])).join(',') + '}';
}

/**
 * Resolve a single gene path via the chosen non-vcs strategy. We re-use the
 * existing `mergeGeneNumeric` / `mergeGeneCategorical` primitives so the
 * fallback semantics are byte-identical to running `composeMultiDomain` with
 * `strategy = vcsFallback` on just that gene.
 */
function resolveOneGeneByStrategy(
  sub: { seed: CrossDomainSeed; weight: number; baseFitness: number; index: number }[],
  geneName: string,
  fallback: VcsMergeFallback,
): { gene: Gene; chosenIndex?: number } {
  const present = sub.map((p, idx) => ({ p, idx, gene: p.seed.genes![geneName]! }));

  if (fallback === 'first-wins') {
    return { gene: present[0].gene, chosenIndex: present[0].p.index };
  }

  if (fallback === 'dominant') {
    let best = present[0];
    for (const e of present) {
      if (
        e.p.baseFitness > best.p.baseFitness ||
        (e.p.baseFitness === best.p.baseFitness && e.p.index < best.p.index)
      ) {
        best = e;
      }
    }
    return { gene: best.gene, chosenIndex: best.p.index };
  }

  // mean / weighted
  const weights = present.map((e) => (fallback === 'weighted' ? e.p.weight : 1));
  const numeric = mergeGeneNumeric(present, weights);
  if (numeric !== null) {
    return { gene: numeric };
  }
  const categorical = mergeGeneCategorical(present, weights);
  return { gene: categorical.gene, chosenIndex: present[categorical.chosenLocalIdx].p.index };
}

function mergeGeneNumeric(
  present: { p: { index: number }; idx: number; gene: { type: string; value: any } | undefined }[],
  weights: number[],
): { type: string; value: any } | null {
  const type = present[0].gene!.type;
  const allSameType = present.every((e) => e.gene!.type === type);
  if (!allSameType) return null;

  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight === 0) return null;

  if (type === 'scalar') {
    let acc = 0;
    for (let i = 0; i < present.length; i++) {
      const v = Number(present[i].gene!.value);
      if (!Number.isFinite(v)) return null;
      acc += v * weights[i];
    }
    return { type: 'scalar', value: acc / totalWeight };
  }

  if (type === 'vector') {
    const arrs: number[][] = present.map((e) => (Array.isArray(e.gene!.value) ? e.gene!.value : []));
    const len = arrs[0].length;
    if (!arrs.every((a) => a.length === len) || len === 0) return null;
    const out = new Array(len).fill(0);
    for (let i = 0; i < arrs.length; i++) {
      for (let j = 0; j < len; j++) {
        const v = Number(arrs[i][j]);
        if (!Number.isFinite(v)) return null;
        out[j] += v * weights[i];
      }
    }
    return { type: 'vector', value: out.map((v) => v / totalWeight) };
  }

  if (type === 'array') {
    // Numeric arrays of equal length are averaged. Otherwise non-numeric.
    const arrs: any[][] = present.map((e) => (Array.isArray(e.gene!.value) ? e.gene!.value : []));
    const len = arrs[0].length;
    if (
      arrs.every((a) => a.length === len) &&
      arrs.every((a) => a.every((v) => typeof v === 'number' && Number.isFinite(v)))
    ) {
      const out = new Array(len).fill(0);
      for (let i = 0; i < arrs.length; i++) {
        for (let j = 0; j < len; j++) out[j] += (arrs[i][j] as number) * weights[i];
      }
      return { type: 'array', value: out.map((v) => v / totalWeight) };
    }
    return null;
  }

  return null;
}

function mergeGeneCategorical(
  present: { p: { index: number }; idx: number; gene: { type: string; value: any } | undefined }[],
  weights: number[],
): { gene: { type: string; value: any }; chosenLocalIdx: number } {
  const tally = new Map<string, { weight: number; localIdx: number; gene: { type: string; value: any } }>();
  for (let i = 0; i < present.length; i++) {
    const gene = present[i].gene!;
    const key = JSON.stringify(gene.value);
    const existing = tally.get(key);
    if (existing) {
      existing.weight += weights[i];
    } else {
      tally.set(key, { weight: weights[i], localIdx: i, gene });
    }
  }
  // Pick highest weight; tiebreak by earliest local index (= earliest input).
  let best: { weight: number; localIdx: number; gene: { type: string; value: any } } | null = null;
  for (const v of tally.values()) {
    if (!best || v.weight > best.weight || (v.weight === best.weight && v.localIdx < best.localIdx)) {
      best = v;
    }
  }
  return { gene: best!.gene, chosenLocalIdx: best!.localIdx };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildName(seeds: CrossDomainSeed[], targetDomain: string): string {
  const names = seeds
    .map((s) => s.$name)
    .filter((n): n is string => typeof n === 'string' && n.length > 0);
  if (names.length === 0) return `MultiCompose:${targetDomain}`;
  if (names.length === 1) return `${names[0]} → ${targetDomain}`;
  return `${names.join(' × ')} → ${targetDomain}`;
}

function hashSeedShape(seed: CrossDomainSeed): string {
  return crypto.createHash('sha256').update(JSON.stringify(seed.genes ?? {})).digest('hex');
}

function finalizeMergedSeed(seed: CrossDomainSeed): CrossDomainSeed {
  seed.$hash = crypto.createHash('sha256').update(JSON.stringify(seed.genes ?? {})).digest('hex');
  // Fitness derived deterministically from the merged content. We use a
  // simple sum-of-scalar-magnitudes / cardinality bound to [0.5, 0.8] so it
  // matches the kernel's existing fitness shape without re-running the full
  // QFT pipeline (caller can re-fitness if needed).
  let mass = 0;
  let count = 0;
  for (const g of Object.values(seed.genes ?? {})) {
    if (g.type === 'scalar' && typeof g.value === 'number' && Number.isFinite(g.value)) {
      mass += Math.abs(g.value);
      count++;
    }
  }
  const norm = count > 0 ? Math.min(1, mass / count) : 0.5;
  seed.$fitness = { overall: 0.5 + norm * 0.3 };
  return seed;
}

// ─── Diagnostics ────────────────────────────────────────────────────────────

/**
 * Pre-flight check: which inputs can reach the target, what paths they'd use.
 * Lets the UI / API show the user a dry-run preview before they commit.
 */
export function planMultiDomainComposition(
  seeds: CrossDomainSeed[],
  targetDomain: string,
): {
  reachable: number;
  unreachable: number;
  perInput: {
    sourceDomain: string;
    reachable: boolean;
    direct: boolean;
    path: { src: string; tgt: string; functor: string }[];
  }[];
} {
  let reachable = 0;
  let unreachable = 0;
  const perInput = seeds.map((seed) => {
    const sourceDomain = seed.$domain ?? '';
    if (sourceDomain === targetDomain) {
      reachable++;
      return { sourceDomain, reachable: true, direct: true, path: [] };
    }
    const direct = Boolean(getFunctor(sourceDomain, targetDomain));
    const path = direct
      ? [{ src: sourceDomain, tgt: targetDomain, functor: getFunctor(sourceDomain, targetDomain)!.name }]
      : findCompositionPath(sourceDomain, targetDomain) ?? [];
    const ok = path.length > 0;
    if (ok) reachable++;
    else unreachable++;
    return { sourceDomain, reachable: ok, direct, path };
  });
  return { reachable, unreachable, perInput };
}
