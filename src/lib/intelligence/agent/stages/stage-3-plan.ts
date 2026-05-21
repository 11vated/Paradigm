/**
 * Stage 3 — PLAN
 *
 * Final LLM stage. Converts the ResolvedIntent into a deterministic
 * ConstructionPlan — the artifact that flows into Stage 4 (pure assembly).
 *
 * The output ConstructionPlan is the **determinism boundary**: every
 * downstream computation is a pure function of this plan. The plan
 * hash becomes the seed's $hash.
 *
 * Strategy:
 *   1. Default: deterministic plan builder that uses only the
 *      ResolvedGeneSpec entries — no LLM call needed.
 *   2. Optional LLM enrichment: if a high-quality local LLM is
 *      available and the intent involves cross-domain composition,
 *      breeding, or resonance, the LLM is asked to propose additional
 *      structural steps (compose / crossover / resonate). The LLM's
 *      output is parsed, validated, and folded in only if it parses
 *      cleanly and adds no entropy.
 *
 * In both cases the steps array is sorted into a canonical order
 * before hashing, so semantically equivalent plans hash identically.
 */

import type { SeedLLM } from '../../llm/base';
import { rngFromHash } from '../../../kernel/rng';
import { kernelNow } from '../../../kernel/clock';
import type {
  ConstructionPlan,
  ConstructionStep,
  ResolvedGeneSpec,
  ResolvedIntent,
} from '../types';

export interface PlanOptions {
  llm?: SeedLLM;
  /** Tag the plan with the active model + provider for provenance */
  llmTag?: { provider: string; model: string };
  /** Hash of the parent / base seed (or 'genesis') */
  base?: string;
  /** Re-plan iteration counter from the Oracle feedback loop (0-based). */
  iteration?: number;
  /** Notes from prior iteration's Oracle/Critique — fed into LLM enrichment prompt. */
  iterationNotes?: string[];
}

export async function plan(
  resolved: ResolvedIntent,
  opts: PlanOptions = {},
): Promise<ConstructionPlan> {
  const base = opts.base ?? deriveBase(resolved);

  // ── 1. Deterministic step generation from resolved specs ──
  const steps: ConstructionStep[] = [];
  for (const spec of resolved.geneSpecs) {
    steps.push({ op: 'set', path: spec.path, value: spec.value });
  }

  // ── 2. Inject structural steps based on top-level intent ──
  const intent = resolved.intent;
  switch (intent.top) {
    case 'BREED': {
      const parents = intent.references.slice(0, 2) as [string, string];
      if (parents.length === 2) {
        steps.push({
          op: 'crossover',
          parents,
          mask: resolved.geneSpecs.map((s) => s.path),
        });
      }
      break;
    }
    case 'COMPOSE': {
      const sources = intent.references.length > 0
        ? intent.references
        : intent.entities.filter((e) => e.canonRef).map((e) => e.canonRef!) as string[];
      if (sources.length >= 2) {
        steps.push({ op: 'compose', sources, strategy: 'weighted' });
      }
      break;
    }
    case 'EVOLVE': {
      // Add a small targeted mutation along the strongest adjective axis
      const target = pickEvolveTarget(resolved);
      if (target) {
        steps.push({
          op: 'mutate',
          path: target.path,
          delta: (intent.budget.novelty ?? 0.3) * 0.4,
          mode: 'add',
        });
      }
      break;
    }
    case 'TRANSPOSE': {
      // The resonate step is the canonical hook for cross-dim projection
      const from = intent.references[0] ?? 'genesis';
      steps.push({ op: 'resonate', with: from, channel: 'structural' });
      break;
    }
  }

  // ── 3. Canonical ordering (so hash is stable across run orders) ──
  steps.sort(canonicalStepCompare);

  // ── 4. Compute the plan hash deterministically ──
  const intentHash = stableHash(JSON.stringify({
    raw: intent.raw,
    top: intent.top,
    sub: intent.sub,
    domains: [...intent.domains].sort(),
    adjectives: intent.adjectives.map((a) => ({ word: a.word, intensity: a.intensity, polarity: a.polarity })),
    references: [...intent.references].sort(),
  }));
  const planHash = stableHash(JSON.stringify({
    base,
    domain: primaryDomain(resolved),
    steps,
    intentHash,
  }));

  // ── 5. Build the plan ──
  const built: ConstructionPlan = {
    planHash,
    domain: primaryDomain(resolved),
    base,
    steps,
    meta: {
      intentHash,
      builtAt: kernelNow(),
      builtBy: 'agent@0.1',
      subAgents: Object.entries(resolved.subAgentVotes).filter(([, v]) => v > 0).map(([k]) => k),
      llm: opts.llmTag ?? { provider: 'none', model: 'deterministic-only' },
    },
  };

  // ── 6. Optional LLM enrichment ──
  if (opts.llm && shouldAskLLM(intent)) {
    try {
      const extra = await llmExtraSteps(built, resolved, opts.llm);
      if (extra.length > 0) {
        built.steps = [...built.steps, ...extra].sort(canonicalStepCompare);
        // Re-hash because steps changed
        built.planHash = stableHash(JSON.stringify({
          base: built.base,
          domain: built.domain,
          steps: built.steps,
          intentHash,
        }));
      }
    } catch {
      // Sovereignty: never fail planning because the LLM is offline.
    }
  }

  return built;
}

// ─── Helpers ───────────────────────────────────────────────────────────

function deriveBase(resolved: ResolvedIntent): string {
  const refs = resolved.intent.references;
  if (refs.length > 0) return refs[0];
  const canon = resolved.intent.entities.find((e) => e.canonRef);
  return canon?.canonRef ?? 'genesis';
}

function primaryDomain(resolved: ResolvedIntent): string {
  return resolved.intent.domains[0] ?? 'misc';
}

function canonicalStepCompare(a: ConstructionStep, b: ConstructionStep): number {
  const order = ['set', 'mutate', 'inherit', 'crossover', 'compose', 'resonate'];
  const ao = order.indexOf(a.op);
  const bo = order.indexOf(b.op);
  if (ao !== bo) return ao - bo;
  // Within an op, sort by path/keys for stable ordering
  const ap = (a as { path?: string }).path ?? '';
  const bp = (b as { path?: string }).path ?? '';
  return ap.localeCompare(bp);
}

function stableHash(s: string): string {
  // FNV-1a 64-bit (split as two 32-bit halves) → 16 hex chars
  let h1 = 0xcbf29ce4;
  let h2 = 0x84222325;
  for (let i = 0; i < s.length; i++) {
    h1 ^= s.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= s.charCodeAt(s.length - 1 - i);
    h2 = Math.imul(h2, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

function pickEvolveTarget(resolved: ResolvedIntent): ResolvedGeneSpec | undefined {
  const numerics = resolved.geneSpecs.filter((s) => typeof s.value === 'number');
  if (numerics.length === 0) return undefined;
  // Pick the highest-confidence numeric spec as the "thing to nudge"
  return numerics.sort((a, b) => b.confidence - a.confidence)[0];
}

function shouldAskLLM(intent: ResolvedIntent['intent']): boolean {
  // Only call the LLM for genuinely creative top-level intents where it
  // can add structural value (compose / breed / transpose). Pure CREATE
  // and EVOLVE are well-served by the deterministic builder alone.
  return intent.top === 'COMPOSE' || intent.top === 'BREED' || intent.top === 'TRANSPOSE';
}

async function llmExtraSteps(
  draft: ConstructionPlan,
  resolved: ResolvedIntent,
  llm: SeedLLM,
): Promise<ConstructionStep[]> {
  // Deterministic but seeded prompt — same intent → same prompt
  const rng = rngFromHash(draft.planHash);
  const sampleN = Math.min(5, resolved.geneSpecs.length);
  const sampleSpecs = [...resolved.geneSpecs]
    .sort(() => rng.nextF64() - 0.5)
    .slice(0, sampleN);
  const prompt = [
    `You are the Stage-3 Planner for Paradigm. You propose ADDITIONAL`,
    `structural steps (compose / crossover / resonate) for a construction plan.`,
    ``,
    `Intent: ${resolved.intent.top}.${resolved.intent.sub ?? ''} (${resolved.intent.raw})`,
    `Domain: ${draft.domain}`,
    `Base: ${draft.base}`,
    `Sample of already-resolved specs: ${JSON.stringify(sampleSpecs)}`,
    ``,
    `Emit a JSON seed-shaped object: { genes: { extraSteps: ConstructionStep[] } }`,
    `Each ConstructionStep is one of:`,
    `  { op: "compose", sources: [<hash>, ...], strategy: "weighted" | "sequential" | "overlay" }`,
    `  { op: "resonate", with: <hash>, channel: "harmonic" | "semantic" | "structural" }`,
    `Return at most 3 steps. If you cannot improve the plan, return an empty array.`,
  ].join('\n');

  const out = await llm.generateSeed(prompt).catch(() => null);
  if (!out) return [];
  const extra = (out as unknown as { genes?: { extraSteps?: unknown } }).genes?.extraSteps;
  if (!Array.isArray(extra)) return [];

  // Validate every step strictly
  const valid: ConstructionStep[] = [];
  for (const s of extra) {
    if (!s || typeof s !== 'object') continue;
    const step = s as Record<string, unknown>;
    if (step.op === 'compose' && Array.isArray(step.sources) && typeof step.strategy === 'string') {
      valid.push({
        op: 'compose',
        sources: step.sources.filter((x): x is string => typeof x === 'string'),
        strategy: step.strategy as 'weighted' | 'sequential' | 'overlay',
      });
    } else if (step.op === 'resonate' && typeof step.with === 'string' && typeof step.channel === 'string') {
      valid.push({
        op: 'resonate',
        with: step.with,
        channel: step.channel as 'harmonic' | 'semantic' | 'structural',
      });
    }
  }
  return valid.slice(0, 3);
}
