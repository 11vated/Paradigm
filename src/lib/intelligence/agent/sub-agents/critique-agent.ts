/**
 * CritiqueAgent
 *
 * The CritiqueAgent ALWAYS runs (canonical 8-of-8). It does not produce
 * gene specs — instead it inspects what the other sub-agents resolved
 * and emits critique notes when it detects:
 *   - inconsistencies (contradictory specs from different sub-agents)
 *   - bland output (low novelty, mid-of-range values everywhere)
 *   - missing critical specs for the intent's domain
 *   - low aggregate confidence
 *
 * Output drives the orchestrator's "did this resolve well enough"
 * threshold check, and informs the LLM Stage 3 prompt with concrete
 * issues to address.
 */

import type { ResolvedGeneSpec, SubAgentInput, SubAgentOutput } from '../types';
import { BaseSubAgent } from './base';

interface SpecGroup {
  path: string;
  specs: ResolvedGeneSpec[];
}

export class CritiqueAgent extends BaseSubAgent {
  readonly id = 'critique';
  readonly domain = 'all';

  shouldRun(): boolean { return true; }

  async run(input: SubAgentInput): Promise<SubAgentOutput> {
    const partial = input.partial;
    const critiques: string[] = [];

    // ── 1. Contradictions: same path, very different values ──
    const groups = groupByPath(partial);
    for (const g of groups) {
      if (g.specs.length < 2) continue;
      const issue = detectContradiction(g);
      if (issue) critiques.push(issue);
    }

    // ── 2. Confidence floor ──
    const lowConf = partial.filter((s) => s.confidence < 0.4);
    if (lowConf.length > partial.length / 3) {
      critiques.push(
        `low aggregate confidence — ${lowConf.length}/${partial.length} specs below 0.4. Consider asking for clarification.`,
      );
    }

    // ── 3. Blandness: all numeric specs sitting near 0.5 ──
    const numeric = partial.filter((s) => typeof s.value === 'number') as Array<
      ResolvedGeneSpec & { value: number }
    >;
    if (numeric.length >= 5) {
      const bland = numeric.filter((s) => Math.abs(s.value - 0.5) < 0.08).length;
      if (bland / numeric.length > 0.6) {
        critiques.push(
          'blandness risk — most numeric specs cluster around 0.5. Push at least one axis to an extreme to give the output character.',
        );
      }
    }

    // ── 4. Domain coverage ──
    const expected = expectedSpecsFor(input.intent.domains);
    const have = new Set(partial.map((s) => s.path.split('.')[0]));
    const missing = expected.filter((e) => !have.has(e));
    if (missing.length > 0) {
      critiques.push(
        `incomplete coverage — missing spec groups for: ${missing.join(', ')}.`,
      );
    }

    return { produced: [], critiques, abstained: false };
  }
}

function groupByPath(specs: ResolvedGeneSpec[]): SpecGroup[] {
  const map = new Map<string, ResolvedGeneSpec[]>();
  for (const s of specs) {
    const arr = map.get(s.path) ?? [];
    arr.push(s);
    map.set(s.path, arr);
  }
  return [...map.entries()].map(([path, list]) => ({ path, specs: list }));
}

function detectContradiction(g: SpecGroup): string | null {
  const numericValues = g.specs
    .filter((s) => typeof s.value === 'number')
    .map((s) => s.value as number);
  if (numericValues.length < 2) {
    // For string values, contradiction = different categorical values
    const strs = new Set(g.specs.filter((s) => typeof s.value === 'string').map((s) => s.value as string));
    if (strs.size > 1) {
      return `contradiction at ${g.path}: ${[...strs].join(' vs ')} (sources: ${g.specs.map((s) => s.source).join(', ')})`;
    }
    return null;
  }
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  if (max - min > 0.5) {
    return `wide disagreement at ${g.path}: range ${min.toFixed(2)}–${max.toFixed(2)} from ${g.specs.map((s) => s.source).join(', ')}`;
  }
  return null;
}

function expectedSpecsFor(domains: string[]): string[] {
  const out = new Set<string>();
  for (const d of domains) {
    switch (d) {
      case 'character': case 'friend':
        out.add('body'); out.add('persona'); out.add('voice'); break;
      case 'music': case 'audio':
        out.add('music'); break;
      case 'visual': case 'sprite':
        out.add('visual'); break;
      case 'world':
        out.add('physics'); out.add('visual'); break;
      case 'game':
        out.add('mechanics'); out.add('narrative'); break;
      case 'narrative': case 'story':
        out.add('narrative'); break;
    }
  }
  return [...out];
}
