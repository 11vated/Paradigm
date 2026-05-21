/**
 * Stage 2 — RESOLVE
 *
 * Convert the ParsedIntent into a fully populated ResolvedIntent by:
 *   1) Selecting a template from the Template Bridge (text → gene path map)
 *   2) Running every applicable sub-agent in parallel
 *   3) Merging their outputs (with confidence-weighted voting for conflicts)
 *   4) Running the CritiqueAgent over the merged result
 *
 * Output: ResolvedIntent containing geneSpecs for every gene path the
 * downstream Plan stage needs, plus a per-sub-agent vote tally for
 * transparency and a templateId for plan structure.
 *
 * No LLM calls. Sub-agents are pure reasoners over 12-D vectors +
 * Reality Library lookups. The LLM only gets involved at Stage 3.
 */

import type { MemoryOrchestrator } from '../../memory/types';
import type {
  ParsedIntent,
  ResolvedGeneSpec,
  ResolvedIntent,
  SubAgent,
  SubAgentInput,
  SubAgentOutput,
} from '../types';
import { scopedMemoryView } from '../sub-agents/base';
import { selectTemplate as bridgeSelect, type Template } from '../template-bridge';

export interface ResolveOptions {
  subAgents: SubAgent[];
  memory: MemoryOrchestrator;
  /** Per-sub-agent timeout in ms */
  perAgentTimeoutMs?: number;
}

export async function resolve(
  intent: ParsedIntent,
  opts: ResolveOptions,
): Promise<ResolvedIntent> {
  // ── 1. Template selection ──
  const templateId = selectTemplate(intent);

  // ── 2. Run applicable sub-agents in parallel ──
  const specialists = opts.subAgents.filter(
    (a) => a.id !== 'critique' && a.shouldRun(intent),
  );
  const critic = opts.subAgents.find((a) => a.id === 'critique');

  const initial: ResolvedGeneSpec[] = [];
  const memoryView = (id: string) => scopedMemoryView(opts.memory, id);
  const timeout = opts.perAgentTimeoutMs ?? 5_000;

  const results = await Promise.all(
    specialists.map((agent) =>
      withTimeout(
        agent.run({ intent, partial: initial, memory: memoryView(agent.id) }),
        timeout,
        agent.id,
      ),
    ),
  );

  // ── 3. Merge ──
  const merged: ResolvedGeneSpec[] = [];
  const votes: Record<string, number> = {};

  for (let i = 0; i < specialists.length; i++) {
    const out = results[i];
    if (!out || out.abstained) {
      votes[specialists[i].id] = 0;
      continue;
    }
    votes[specialists[i].id] = out.produced.length;
    merged.push(...out.produced);
  }

  // Conflict resolution: same path, multiple specs → confidence-weighted
  const consolidated = consolidateByPath(merged);

  // ── 4. Critique (always runs) ──
  if (critic) {
    const critiqueOut = await withTimeout(
      critic.run({
        intent,
        partial: consolidated,
        memory: memoryView(critic.id),
      }),
      timeout,
      critic.id,
    );
    if (critiqueOut?.critiques) {
      // Persist critiques into working memory for Stage-3 to see
      void opts.memory.writeTo('working', {
        key: `critique:${shortHash(intent.raw)}`,
        value: critiqueOut.critiques,
        topic: 'critique',
        source: critic.id,
      });
    }
    votes[critic.id] = critiqueOut?.critiques?.length ?? 0;
  }

  return {
    intent,
    templateId,
    geneSpecs: consolidated,
    subAgentVotes: votes,
  };
}

function consolidateByPath(specs: ResolvedGeneSpec[]): ResolvedGeneSpec[] {
  const groups = new Map<string, ResolvedGeneSpec[]>();
  for (const s of specs) {
    const arr = groups.get(s.path) ?? [];
    arr.push(s);
    groups.set(s.path, arr);
  }
  const out: ResolvedGeneSpec[] = [];
  for (const [path, list] of groups) {
    if (list.length === 1) {
      out.push(list[0]);
      continue;
    }
    // Confidence-weighted average for numerics; highest-confidence for strings/arrays
    const numerics = list.filter((s) => typeof s.value === 'number') as Array<
      ResolvedGeneSpec & { value: number }
    >;
    if (numerics.length === list.length) {
      const totalW = numerics.reduce((s, x) => s + x.confidence, 0) || 1;
      const value = numerics.reduce((s, x) => s + (x.value * x.confidence) / totalW, 0);
      out.push({
        path,
        value,
        source: numerics.map((n) => n.source).join('+'),
        confidence: Math.min(0.95, numerics.reduce((s, x) => s + x.confidence, 0) / numerics.length),
        rationale: `weighted-avg of ${numerics.length} specs`,
      });
    } else {
      list.sort((a, b) => b.confidence - a.confidence);
      out.push(list[0]);
    }
  }
  return out;
}

function selectTemplate(intent: ParsedIntent): string {
  // Delegate to the canonical Template Bridge.
  const template = bridgeSelect(intent.top, intent.sub, intent.domains);
  if (template) return template.id;
  const primary = intent.domains[0] ?? 'misc';
  return `${intent.top.toLowerCase()}.${primary}`;
}

async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  label: string,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[Stage-2] sub-agent ${label} timed out after ${ms}ms`);
      resolve(null);
    }, ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function shortHash(s: string): string {
  let h = 5381;
  for (const c of s) h = ((h << 5) + h) ^ c.charCodeAt(0);
  return (h >>> 0).toString(16).slice(0, 8);
}

// Make the helper available for downstream stages that want consistent IDs.
export { shortHash as _shortHash };