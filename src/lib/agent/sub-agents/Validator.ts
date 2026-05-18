/**
 * Validator — Stage 4 Sub-Agent (Deterministic)
 *
 * Verifies that a grown artifact matches the original description.
 * Wraps the existing VerificationGate with domain-specific checkers
 * and keyword synonym matching.
 */

import type { SubAgent, AgentMessage, AgentResult, AgentContext, ValidationOutput } from './SubAgent';
import { VerificationGate } from '../../commons/verification/verification-gate';

export class Validator implements SubAgent {
  name = 'Validator';
  stage = 4;
  isLLMBacked = false;
  hasToolAccess = false;
  toolNames: string[] = [];

  private gate: VerificationGate;

  constructor(confidenceThreshold = 0.5) {
    this.gate = new VerificationGate({ confidenceThreshold });
  }

  async execute(input: AgentMessage, ctx: AgentContext): Promise<AgentResult> {
    const { description, artifact, domain, quality } = input.payload || {};

    if (!description || !artifact) {
      return {
        success: false,
        type: 'validation:error',
        payload: { error: 'Missing description or artifact', valid: false, confidence: 0, issues: ['No data to validate'] },
      };
    }

    const issues: string[] = [];
    let confidence = quality || 0.7;

    try {
      const result = await this.gate.verify(description, artifact, domain || 'character');
      confidence = result.confidence;
      if (!result.match) {
        issues.push(...result.issues.slice(0, 5));
        issues.push(result.explanation);
      }
    } catch {
      issues.push('Verification gate threw an error');
      confidence = (confidence || 0.7) * 0.5;
    }

    const output: ValidationOutput = {
      valid: issues.length === 0,
      confidence,
      issues,
      adjustedDescription: issues.length > 0
        ? `${description} (issues: ${issues.slice(0, 2).join('; ')})`
        : undefined,
    };

    return {
      success: true,
      type: 'validation:result',
      payload: output,
      metadata: { valid: output.valid, confidence: output.confidence },
    };
  }

  setConfidenceThreshold(threshold: number): void {
    this.gate = new VerificationGate({ confidenceThreshold: threshold });
  }
}
