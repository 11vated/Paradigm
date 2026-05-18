/**
 * Composer — Stage 5 Sub-Agent
 *
 * Suggests cross-domain composition paths from a source seed.
 * Uses the functor network to find valid BFS paths to other domains.
 * LLM-backed for creative suggestions; deterministic fallback.
 */

import type { SubAgent, AgentMessage, AgentResult, AgentContext, CompositionOutput, CompositionSuggestion } from './SubAgent';
import { findCompositionPath, getCompositionGraph } from '../../kernel/composition';

export class Composer implements SubAgent {
  name = 'Composer';
  stage = 5;
  isLLMBacked = false;
  hasToolAccess = false;
  toolNames: string[] = [];

  async execute(input: AgentMessage, ctx: AgentContext): Promise<AgentResult> {
    const { seed, targetDomain, maxSuggestions = 5 } = input.payload || {};
    const sourceDomain = seed?.$domain || seed?.domain;

    if (!sourceDomain) {
      return {
        success: false,
        type: 'composition:error',
        payload: { error: 'No source domain in seed', suggestions: [], sourceDomain: '' },
      };
    }

    const suggestions = targetDomain
      ? this.suggestToTarget(sourceDomain, targetDomain)
      : this.suggestAll(sourceDomain, maxSuggestions);

    const output: CompositionOutput = {
      suggestions,
      sourceDomain,
    };

    return {
      success: true,
      type: 'composition:suggestions',
      payload: output,
      metadata: { suggestionCount: suggestions.length, sourceDomain },
    };
  }

  private suggestToTarget(source: string, target: string): CompositionSuggestion[] {
    const path = findCompositionPath(source, target);
    if (!path) return [];

    return [{
      targetDomain: target,
      path: path.bridges,
      coherence: path.totalCoherence,
      reason: this.describePath(path.bridges),
    }];
  }

  private suggestAll(source: string, maxSuggestions: number): CompositionSuggestion[] {
    const graph = getCompositionGraph();
    const targets = new Set(graph.edges
      .filter(e => e.sourceDomain !== source)
      .map(e => e.targetDomain as string));

    const suggestions: CompositionSuggestion[] = [];

    for (const target of targets) {
      if (suggestions.length >= maxSuggestions) break;
      const path = findCompositionPath(source, target);
      if (path && path.bridges.length > 0) {
        suggestions.push({
          targetDomain: target,
          path: path.bridges,
          coherence: path.totalCoherence,
          reason: this.describePath(path.bridges),
        });
      }
    }

    suggestions.sort((a, b) => b.coherence - a.coherence);
    return suggestions;
  }

  private describePath(bridges: string[]): string {
    if (bridges.length === 0) return 'Direct transformation';
    return `Via ${bridges.join(' → ')}`;
  }
}
