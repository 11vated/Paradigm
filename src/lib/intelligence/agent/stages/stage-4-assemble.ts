/**
 * Stage 4 — ASSEMBLE (pure)
 *
 * Takes a deterministic ConstructionPlan and applies it to a base seed
 * (or genesis) to produce an AssembledOutput. This function is the
 * canonical determinism boundary: same plan + same base → same seed,
 * byte-for-byte, forever.
 *
 * No LLM calls. No network. No entropy. Just deterministic mutation of
 * gene values according to the plan's ordered steps.
 *
 * Source: PAradigm-reference/intelligence/gspl-agent-full-capacity.md (Stage 4)
 */

import { rngFromHash, Xoshiro256StarStar } from '../../../kernel/rng';
import type { Seed } from '../../../kernel/engines';
import { kernelNow } from '../../../kernel/clock';
import type {
  AssembledOutput,
  ConstructionPlan,
  ConstructionStep,
} from '../types';

export interface AssembleContext {
  /** Lookup function for fetching parent / source seeds by hash */
  lookupSeed: (hash: string) => Promise<Seed | undefined>;
  /** Optional override of how genesis seeds are bootstrapped */
  genesis?: (domain: string) => Seed;
}

export async function assemble(
  plan: ConstructionPlan,
  ctx: AssembleContext,
): Promise<AssembledOutput> {
  // ── Resolve base ─────────────────────────────────────────────────────
  const base: Seed =
    plan.base === 'genesis'
      ? ctx.genesis?.(plan.domain) ?? genesisSeed(plan.domain, plan.planHash)
      : (await ctx.lookupSeed(plan.base)) ?? errorMissingBase(plan.base);

  // ── Deep clone so we never mutate the parent ─────────────────────────
  const target: Seed = structuredClone(base);

  // Ensure $hash / $lineage are set fresh
  target.$hash = plan.planHash;
  target.$lineage = {
    parents: plan.base === 'genesis' ? [] : [plan.base],
    operation: stepsOperationLabel(plan.steps),
    generation: (base.$lineage?.generation ?? 0) + 1,
    timestamp: kernelNow(),
    ...(plan.meta.subAgents.length > 0 ? { subAgents: plan.meta.subAgents } : {}),
  } as unknown as Seed['$lineage'];
  target.$domain = plan.domain;

  // Seeded RNG, deterministic from the plan hash
  const rng = rngFromHash(plan.planHash);

  // ── Apply each step in order ─────────────────────────────────────────
  for (const step of plan.steps) {
    await applyStep(step, target, ctx, rng);
  }

  return {
    seed: target,
    lineageEdge: {
      from: target.$lineage?.parents ?? [],
      to: plan.planHash,
      operation: stepsOperationLabel(plan.steps),
      planHash: plan.planHash,
    },
  };
}

async function applyStep(
  step: ConstructionStep,
  target: Seed,
  ctx: AssembleContext,
  rng: Xoshiro256StarStar,
): Promise<void> {
  switch (step.op) {
    case 'set': {
      setPath(target, step.path, step.value);
      return;
    }
    case 'mutate': {
      const cur = getPath(target, step.path);
      if (typeof cur !== 'number') return;
      let next: number;
      switch (step.mode) {
        case 'add': next = cur + step.delta * (rng.nextF64() * 2 - 1); break;
        case 'mul': next = cur * (1 + step.delta * (rng.nextF64() * 2 - 1)); break;
        case 'set': next = step.delta; break;
      }
      setPath(target, step.path, next);
      return;
    }
    case 'inherit': {
      const src = await ctx.lookupSeed(step.from);
      if (!src) return;
      for (const path of step.paths) {
        const v = getPath(src, path);
        if (v !== undefined) setPath(target, path, v as never);
      }
      return;
    }
    case 'crossover': {
      const [aH, bH] = step.parents;
      const [a, b] = await Promise.all([ctx.lookupSeed(aH), ctx.lookupSeed(bH)]);
      if (!a || !b) return;
      for (const path of step.mask) {
        // Deterministic mask: hash(path) parity selects parent
        const pick = pathParity(path, target.$hash ?? '') === 0 ? a : b;
        const v = getPath(pick, path);
        if (v !== undefined) setPath(target, path, v as never);
      }
      return;
    }
    case 'compose': {
      // Weighted blend of numeric gene values from N source seeds
      const sources = await Promise.all(step.sources.map(ctx.lookupSeed));
      const present = sources.filter((s): s is Seed => !!s);
      if (present.length === 0) return;
      // Identify all numeric leaf paths shared by every source
      const sharedPaths = sharedNumericPaths(present);
      for (const path of sharedPaths) {
        let sum = 0;
        for (const s of present) {
          const v = getPath(s, path);
          if (typeof v === 'number') sum += v;
        }
        const avg = sum / present.length;
        setPath(target, path, avg);
      }
      return;
    }
    case 'resonate': {
      // Marker — actual resonance logic lives in the resonance engine.
      // For now we record the resonance hint in metadata so downstream
      // generators can pick it up.
      const meta = (target.$metadata ??= {} as Record<string, unknown>);
      const resList = ((meta.resonance ??= []) as Array<{ with: string; channel: string }>);
      resList.push({ with: step.with, channel: step.channel });
      return;
    }
  }
}

// ─── Pure path helpers ─────────────────────────────────────────────────

function getPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function setPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]];
    if (next === null || typeof next !== 'object') cur[parts[i]] = {};
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

function sharedNumericPaths(seeds: Seed[]): string[] {
  if (seeds.length === 0) return [];
  const first = collectNumericPaths(seeds[0]);
  return first.filter((p) =>
    seeds.every((s) => typeof getPath(s, p) === 'number'),
  );
}

function collectNumericPaths(obj: unknown, prefix = ''): string[] {
  const out: string[] = [];
  if (obj === null || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$')) continue;
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number') out.push(full);
    else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      out.push(...collectNumericPaths(v, full));
    }
  }
  return out;
}

function pathParity(path: string, salt: string): number {
  // FNV-1a, deterministic
  let h = 0x811c9dc5;
  for (const c of salt + ':' + path) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h & 1;
}

function stepsOperationLabel(steps: ConstructionStep[]): string {
  if (steps.length === 0) return 'noop';
  const ops = new Set(steps.map((s) => s.op));
  if (ops.size === 1) return [...ops][0];
  return [...ops].join('+');
}

function genesisSeed(domain: string, hash: string): Seed {
  return {
    $hash: hash,
    $domain: domain,
    $gst: '1.0',
    $name: `genesis-${domain}`,
    $lineage: { parents: [], operation: 'genesis', generation: 0, timestamp: kernelNow() },
    genes: {},
  } as unknown as Seed;
}

function errorMissingBase(hash: string): never {
  throw new Error(`assemble: base seed not found in lookup: ${hash}`);
}
