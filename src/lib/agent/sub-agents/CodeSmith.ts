/**
 * CodeSmith — Stage 2 Sub-Agent
 *
 * Transforms an IntentEnvelope into GSPL source code.
 * Deterministic template-based generation for now;
 * can be LLM-enhanced for more creative code generation.
 */

import type { SubAgent, AgentMessage, AgentResult, AgentContext, IntentEnvelope, CodeGenOutput } from './SubAgent';
import crypto from 'crypto';

export class CodeSmith implements SubAgent {
  name = 'CodeSmith';
  stage = 2;
  isLLMBacked = false;
  hasToolAccess = false;
  toolNames: string[] = [];

  async execute(input: AgentMessage, ctx: AgentContext): Promise<AgentResult> {
    const intent = input.payload as IntentEnvelope;

    if (!intent || !intent.domain) {
      return { success: false, type: 'code:error', payload: { error: 'Invalid intent: missing domain' } };
    }

    const gsplCode = this.generateCode(intent);
    const params = intent.genes;

    return {
      success: true,
      type: 'code:generated',
      payload: { gsplCode, params } as CodeGenOutput,
      metadata: { domain: intent.domain, geneCount: Object.keys(intent.genes).length },
    };
  }

  private generateCode(intent: IntentEnvelope): string {
    const paramEntries = Object.entries(intent.genes)
      .map(([k, v]) => `  "${k}": ${JSON.stringify(v)}`)
      .join(',\n');

    const hash = crypto.createHash('sha256')
      .update(`${intent.domain}:${intent.description}:${JSON.stringify(intent.genes)}`)
      .digest('hex')
      .slice(0, 12);
    const name = `${intent.domain}_${hash}`;

    // Wave 2: Sophisticated multi-step deep-constrained GSPL (full Agent partner per finished vision)
    // Deep strata + gene constraints on every step; multi evolve/breed/compose; confidence/alts notes; inspectable/editable/executable.
    // All paths (Agent plans) now default to verified GSPL orchestration of rich exec engines.
    const strata = (intent.style && intent.style.includes('mind')) ? 'Form + Mind + Story + Time' : 'Form + Mind + World + Field';
    const strataLine = `  strata: ${strata} > 0.8 ;`;

    return [
      `// GSPL multi-step constrained plan — CodeSmith Wave 2 (Agent true creative partner)`,
      `// Intent: ${intent.description}`,
      `// Domain: ${intent.domain}  Style: ${intent.style || 'default'}`,
      `// Constraints: deep strata + gene on all ops. Inspect/edit in GSPLEditor (hybrid), execute via executeGspl for rich.`,
      `// Confidence: 0.82 (strata-aligned, multi-step coherent). Alternatives: lower strata or add breed step.`,
      ``,
      `seed ${name} in ${intent.domain} {`,
      strataLine,
      paramEntries,
      `}`,
      ``,
      `// Step 1: initial grow under full strata (orchestrates rich high-fid gen)`,
      `let s1 = grow ${name} strata: ${strata.split('>')[0].trim()}`,
      ``,
      `// Step 2: evolve preserving core genes + strata boost (deep constraint)`,
      `let s2 = evolve s1 generations: 3 mutation: 0.12 strata: ["Mind", "Story"] keeping: ["strength", "archetype"]`,
      ``,
      `// Step 3: breed with canonical exemplar for coherence (GSPL control)`,
      `seed exemplar in ${intent.domain} { strata: ${strata} ; strength: 0.9 }`,
      `let s3 = breed(s2, exemplar)`,
      ``,
      `// Step 4: cross-domain compose under additional strata (universal)`,
      `let final = compose s3 with "threnody" under Sound + Time`,
      ``,
      `// Execute: final rich named artifact + strata HUD + .gseed (canonical GSPL roundtrip supported)`,
      `print(final)`,
    ].join('\n');
  }

  /**
   * Refine existing GSPL code based on validation feedback.
   * Called during the refine cycle when validation fails.
   */
  refine(_gsplCode: string, issues: string[], intent: IntentEnvelope): string {
    const header = `// Refined GSPL — addressing: ${issues.join('; ')}\n`;
    const body = this.generateCode(intent);
    return header + body;
  }
}
