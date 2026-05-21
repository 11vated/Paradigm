/**
 * Sub-Agent base — shared utilities for the 8 specialist sub-agents.
 *
 * Sub-agents receive a parsed intent + a scoped memory view and produce
 * domain-specific ResolvedGeneSpec entries. They do *not* call the LLM
 * directly; that's the orchestrator's job. Sub-agents are pure
 * reasoners over the 12-D adjective space, the Reality Libraries
 * (Layer 4), and any prior workspace conventions (Layer 3).
 */

import type {
  Adjective,
  ResolvedGeneSpec,
  SubAgent,
  SubAgentInput,
  SubAgentMemoryView,
  SubAgentOutput,
} from '../types';
import type { MemoryOrchestrator } from '../../memory/types';
import type { Vec12 } from '../adjective-normalization';
import { VAD_AXES, blendVectors, cosine12 } from '../adjective-normalization';

/** Build a memory view scoped to a single sub-agent */
export function scopedMemoryView(memory: MemoryOrchestrator, subAgentId: string): SubAgentMemoryView {
  return {
    recall(key: string) {
      const layer = memory.layer('working');
      // Synchronous bridge — sub-agents are sync today; if they need async they can call .layer() directly.
      let result: unknown;
      void layer.get(key).then((e) => { result = e?.value; });
      return result;
    },
    lookup(domain: string, key: string) {
      const layer = memory.layer('semantic');
      let result: unknown;
      void layer.get(`${domain}:${key}`).then((e) => { result = e?.value; });
      return result;
    },
    worldFact(_library: string, _key: string) {
      try {
        return memory.layer('world');
      } catch {
        return undefined;
      }
    },
  };
}

/** Weighted blend of the adjective vectors in a parsed intent */
export function intentVector(adjectives: Adjective[]): Vec12 {
  if (adjectives.length === 0) {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as Vec12;
  }
  return blendVectors(adjectives.map((a) => ({ vec: a.vector as Vec12, weight: a.weight })));
}

/** Project a 12-D adjective vector onto a single named axis [-1, 1] */
export function projectAxis(vec: Vec12, axis: typeof VAD_AXES[number]): number {
  const idx = VAD_AXES.indexOf(axis);
  if (idx < 0) return 0;
  return vec[idx];
}

/**
 * Map a [-1, 1] axis value to a target range [lo, hi].
 * Used by sub-agents to translate semantic intensity into gene values.
 */
export function mapTo(axisValue: number, lo: number, hi: number): number {
  const t = (axisValue + 1) / 2; // → [0, 1]
  return lo + t * (hi - lo);
}

/** Standard helper for sub-agents to emit a gene spec */
export function emit(
  source: string,
  path: string,
  value: number | string | number[] | string[],
  confidence: number,
  rationale?: string,
): ResolvedGeneSpec {
  return { path, value, source, confidence, rationale };
}

/** Compute how similar an adjective is to a named axis (for voting / abstention) */
export function axisAffinity(vec: Vec12, axis: typeof VAD_AXES[number]): number {
  const unit: number[] = new Array(12).fill(0);
  unit[VAD_AXES.indexOf(axis)] = 1;
  return Math.abs(cosine12(vec, unit as Vec12));
}

/** Base class for sub-agents that delegates the should-run heuristic */
export abstract class BaseSubAgent implements SubAgent {
  abstract readonly id: string;
  abstract readonly domain: string;
  abstract run(input: SubAgentInput): Promise<SubAgentOutput>;

  /** Default: run when intent.domains contains this sub-agent's domain. */
  shouldRun(intent: { domains: string[] }): boolean {
    return intent.domains.includes(this.domain) || intent.domains.includes('all');
  }
}
