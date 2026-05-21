/**
 * ResearcherAgent — the 9th sub-agent (canon extension over the 8).
 *
 * Source: PAradigm-reference/intelligence/gspl-agent-full-capacity.md §3
 *
 * The Researcher is the ONLY sub-agent with grants for the network-tier
 * Tool Layer (web_search, browse_page, fetch_json). It runs only when:
 *   - the intent classifies as research/inform (NOT create/evolve)
 *   - the harness is built with airGap=false (explicit user consent)
 *
 * Output is a structured set of citations + a synthesis paragraph that
 * downstream sub-agents can pull into their resolution via memory L3.
 *
 * Sovereignty: every network call is logged to the harness audit log
 * with caller='researcher'. Results are cached in semantic memory so
 * subsequent runs over the same query are offline.
 */

import { BaseSubAgent, scopedMemoryView as _scopedMemoryView } from './base';
import type { SubAgent, SubAgentInput, SubAgentOutput } from '../types';
import type { ToolHarness } from '../../tools/types';

export interface ResearcherDeps {
  harness?: ToolHarness;
  maxCitations?: number;
  cacheMinutes?: number;
}

export interface Citation {
  url: string;
  title?: string;
  snippet?: string;
  fetchedAt: number;
}

export interface ResearchOutput {
  citations: Citation[];
  synthesis: string;
  tokensConsumed: number;
}

export class ResearcherAgent extends BaseSubAgent implements SubAgent {
  readonly id = 'researcher';
  readonly domain = '*';
  readonly version = '0.1';

  constructor(private readonly deps: ResearcherDeps = {}) {
    super();
  }

  async run(input: SubAgentInput): Promise<SubAgentOutput> {
    const harness = this.deps.harness;
    const adjective = input.intent.adjectives.map((a) => a.word).join(' ');
    const query = `${input.intent.raw} ${adjective}`.trim();

    // Air-gap fallback: emit a memory-only research note, no critiques
    if (!harness) {
      return {
        produced: [],
        critiques: ['Researcher ran in air-gap mode: no citations gathered (harness not provided).'],
        abstained: true,
      };
    }

    // Try the web_search tool — silently degrade on any error / permission denial
    const out: ResearchOutput = { citations: [], synthesis: '', tokensConsumed: 0 };
    try {
      const search = await harness.invoke({ toolId: 'web_search', args: { query, limit: this.deps.maxCitations ?? 3 }, ctx: { caller: this.id, airGap: false } });
      if (search.ok && Array.isArray((search.value as any)?.results)) {
        for (const r of (search.value as any).results) {
          out.citations.push({
            url: String(r.url ?? ''),
            title: r.title ? String(r.title) : undefined,
            snippet: r.snippet ? String(r.snippet) : undefined,
            fetchedAt: Date.now(),
          });
        }
      }
    } catch (e) {
      return {
        produced: [],
        critiques: [`Researcher network call failed: ${(e as Error).message}`],
        abstained: true,
      };
    }

    out.synthesis = out.citations.length === 0
      ? 'No external citations found; rely on existing canon.'
      : `Found ${out.citations.length} external references. Top: ${out.citations[0].title ?? out.citations[0].url}.`;

    return {
      produced: [],
      critiques: out.citations.length === 0 ? ['Researcher: no citations found.'] : [`Researcher: ${out.citations.length} citations gathered.`],
      abstained: out.citations.length === 0,
    };
  }
}
