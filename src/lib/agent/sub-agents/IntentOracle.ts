/**
 * IntentOracle — Stage 1 Sub-Agent
 *
 * Parses natural language descriptions into structured IntentEnvelopes.
 * Extracts domain, gene hints, style, and constraints from text.
 * Deterministic (keyword/regex-based); can be LLM-enhanced when available.
 */

import type { SubAgent, AgentMessage, AgentResult, AgentContext, IntentEnvelope } from './SubAgent';
import { detectDomain, detectStyle, DOMAIN_GENE_TEMPLATES } from './SubAgent';

export class IntentOracle implements SubAgent {
  name = 'IntentOracle';
  stage = 1;
  isLLMBacked = false;
  hasToolAccess = false;
  toolNames: string[] = [];

  async execute(input: AgentMessage, ctx: AgentContext): Promise<AgentResult> {
    const description = input.payload?.description || '';
    const hintDomain = input.payload?.domain;

    if (!description) {
      return { success: false, type: 'intent:error', payload: { error: 'No description provided' } };
    }

    const domain = hintDomain || detectDomain(description, ctx.config?.defaultDomain || 'character');
    const style = detectStyle(description);
    const template = DOMAIN_GENE_TEMPLATES[domain] || {};
    const inferredGenes = this.inferGenes(description, template);

    const intent: IntentEnvelope = {
      description,
      domain,
      genes: inferredGenes,
      constraints: this.extractConstraints(description),
      style,
      referenceSeeds: input.payload?.referenceSeeds,
    };

    return {
      success: true,
      type: 'intent:resolved',
      payload: intent,
      metadata: { domain, style },
    };
  }

  private inferGenes(description: string, template: Record<string, unknown>): Record<string, unknown> {
    const genes = { ...template };
    const lower = description.toLowerCase();

    const numericMatches = lower.match(/\b(\d+)\b/g);
    const numbers = numericMatches ? numericMatches.map(Number) : [];

    if (lower.includes('strong') || lower.includes('powerful')) genes.strength = 0.8;
    if (lower.includes('fast') || lower.includes('quick') || lower.includes('agile')) genes.agility = 0.8;
    if (lower.includes('large') || lower.includes('huge') || lower.includes('massive')) genes.size = 0.8;
    if (lower.includes('small') || lower.includes('tiny') || lower.includes('cute')) genes.size = 0.2;
    if (numbers.length > 0 && genes.tempo) genes.tempo = numbers[0];
    if (lower.includes('complex') || lower.includes('intricate') || lower.includes('detailed')) {
      if (genes.complexity !== undefined) genes.complexity = 0.8;
    }
    if (lower.includes('simple') || lower.includes('minimal')) {
      if (genes.complexity !== undefined) genes.complexity = 0.2;
    }

    if (lower.includes('sad') || lower.includes('melancholy') || lower.includes('dark')) {
      genes.tone = 'melancholy';
      if (genes.theme) genes.theme = 'dark';
    }
    if (lower.includes('happy') || lower.includes('joyful') || lower.includes('bright')) {
      genes.tone = 'bright';
      if (genes.theme) genes.theme = 'light';
    }

    return genes;
  }

  private extractConstraints(description: string): Record<string, unknown> {
    const constraints: Record<string, unknown> = {};
    const lower = description.toLowerCase();

    if (lower.includes('no ') || lower.includes("don't") || lower.includes('without')) {
      constraints.exclude = lower.match(/(?:no |without |don't include )([a-z]+)/)?.[1] || '';
    }
    if (lower.includes('urgent') || lower.includes('asap') || lower.includes('quick')) {
      constraints.priority = 'high';
    }

    return constraints;
  }
}
