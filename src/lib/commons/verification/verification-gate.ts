import type { SeedLLM } from '../../kernel/seed-llm';
import { getDomainChecker, type CheckerResult } from './domain-checkers';

export interface VerificationGateConfig {
  enableDomainCheckers: boolean;
  enableKeywordMatching: boolean;
  enableLLM: boolean;
  confidenceThreshold: number;
}

const DEFAULT_CONFIG: VerificationGateConfig = {
  enableDomainCheckers: true,
  enableKeywordMatching: true,
  enableLLM: false,
  confidenceThreshold: 0.5,
};

export interface VerificationResult {
  match: boolean;
  confidence: number;
  explanation: string;
  issues: string[];
  details: {
    domainScore?: number;
    keywordScore?: number;
    llmScore?: number;
    styleScore?: number;
    combinedScore: number;
  };
}

function extractKeywords(desc: string): { positive: string[]; numeric: string[] } {
  const lower = desc.toLowerCase();
  const positiveWords = ['strong', 'fast', 'bright', 'large', 'tall', 'rich', 'smooth', 'detailed', 'complex', 'organic', 'dark', 'minimal', 'vibrant', 'epic', 'gentle', 'agile', 'powerful', 'graceful', 'intricate'];
  const numericPattern = /\b(\d+)\b/g;
  const numeric: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = numericPattern.exec(lower)) !== null) numeric.push(m[1]);
  return { positive: positiveWords.filter(w => lower.includes(w)), numeric };
}

/** Map keywords to attribute paths they might match */
const KEYWORD_MAP: Record<string, string[]> = {
  strong: ['strength', 'powerful', 'muscular'],
  fast: ['speed', 'agility', 'quick', 'rapid'],
  large: ['size', 'big', 'huge', 'massive', 'scale'],
  bright: ['bright', 'vibrant', 'light', 'luminous'],
  complex: ['complexity', 'intricate', 'detailed'],
  smooth: ['smooth', 'fps'],
};

function keywordMatch(artifact: Record<string, unknown>, desc: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  const { positive } = extractKeywords(desc);
  if (positive.length === 0) return { score: 0.5, issues };

  const artifactStr = JSON.stringify(artifact).toLowerCase();

  let matches = 0;
  for (const kw of positive) {
    const directHit = artifactStr.includes(kw);
    const synonyms = KEYWORD_MAP[kw] || [];
    const synonymHit = synonyms.some(s => artifactStr.includes(s));
    if (directHit || synonymHit) matches++;
  }

  const ratio = positive.length > 0 ? matches / positive.length : 0;
  const score = 0.5 + 0.5 * ratio;
  return { score, issues: [] };
}

export function defaultVerificationGate(): VerificationGate {
  return new VerificationGate();
}

export class VerificationGate {
  private config: VerificationGateConfig;
  private llm?: SeedLLM;

  constructor(config?: Partial<VerificationGateConfig>, llm?: SeedLLM) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.llm = llm;
  }

  setLLM(llm: SeedLLM): void {
    this.llm = llm;
  }

  async verify(
    description: string,
    artifact: unknown,
    domain: string,
  ): Promise<VerificationResult> {
    const art = (artifact || {}) as Record<string, unknown>;
    const domainResult = this.config.enableDomainCheckers
      ? await this.runDomainCheck(art, description, domain)
      : { score: 0.5, issues: [] as string[], details: {} as Record<string, unknown> };

    const keywordResult = this.config.enableKeywordMatching
      ? keywordMatch(art, description)
      : { score: 0.5, issues: [] as string[] };

    let llmScore: number | undefined;
    if (this.config.enableLLM && this.llm) {
      try {
        llmScore = await this.llm.evaluateOutput(
          { ...art, seed_hash: art.seed_hash as string, name: art.name as string, domain } as any,
          `Does this artifact match the description: "${description}"? Score 0-1.`,
        );
      } catch {
        llmScore = 0.5;
      }
    }

    const scores: number[] = [domainResult.score, keywordResult.score];
    if (llmScore !== undefined) scores.push(llmScore);

    const combinedScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const allIssues = [...domainResult.issues, ...keywordResult.issues];
    const match = combinedScore >= this.config.confidenceThreshold;

    let explanation: string;
    if (match) {
      explanation = `Artifact matches description (confidence: ${(combinedScore * 100).toFixed(0)}%)`;
    } else if (allIssues.length > 0) {
      explanation = `Artifact does not match description: ${allIssues.slice(0, 3).join('; ')}`;
    } else {
      explanation = `Low confidence match (${(combinedScore * 100).toFixed(0)}%) below threshold ${(this.config.confidenceThreshold * 100).toFixed(0)}%`;
    }

    return {
      match,
      confidence: combinedScore,
      explanation,
      issues: allIssues,
      details: {
        domainScore: domainResult.score,
        keywordScore: keywordResult.score,
        llmScore,
        styleScore: domainResult.details.styleScore as number | undefined,
        combinedScore,
      },
    };
  }

  private async runDomainCheck(
    artifact: Record<string, unknown>,
    description: string,
    domain: string,
  ): Promise<CheckerResult> {
    const checker = getDomainChecker(domain);
    try {
      return checker(artifact, description);
    } catch {
      return { score: 0.5, issues: ['Domain checker threw an error'], details: {} };
    }
  }
}
