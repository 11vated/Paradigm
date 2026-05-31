/**
 * Code Inverter — source code → seed
 * Analyzes code structure to infer generator parameters.
 */
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

interface CodeArtifact {
  language: string;
  source: string;
  lineCount?: number;
  imports?: string[];
}

export const codeInverter: Inverter<CodeArtifact> = {
  id: 'code.structure-v1',
  domain: 'agent',
  accepts(a: CodeArtifact): boolean { return a && typeof a.source === 'string'; },
  async invert(artifact: CodeArtifact): Promise<InversionReport> {
    const start = Date.now();
    const genes: InvertedGene[] = [];
    const residuals: InversionResidual[] = [];
    const src = artifact.source;
    const lines = src.split('\n');

    genes.push({ path: 'agent.language', value: artifact.language, confidence: 0.95, level: 'high' });
    genes.push({ path: 'agent.lineCount', value: lines.length, confidence: 0.95, level: 'high' });

    // Complexity estimation
    const complexityIndicators = ['if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch'];
    const complexity = complexityIndicators.reduce((count, kw) => count + (src.match(new RegExp(`\\b${kw}\\b`, 'g')) || []).length, 0);
    const normalizedComplexity = Math.min(1, complexity / Math.max(1, lines.length) * 5);
    genes.push({ path: 'agent.complexity', value: normalizedComplexity, confidence: 0.6, level: 'medium' });

    // Function count
    const funcCount = (src.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(/g) || []).length;
    genes.push({ path: 'agent.functionCount', value: funcCount, confidence: 0.8, level: 'high' });

    // Import count
    const importCount = (src.match(/^import\s/gm) || []).length;
    genes.push({ path: 'agent.importCount', value: importCount, confidence: 0.9, level: 'high' });

    residuals.push({ feature: 'semantics', reason: 'no-gene', raw: 'Code semantics require LLM analysis' });

    return {
      domain: 'agent', inverterId: this.id,
      artifactBytes: src.length,
      genes, residuals,
      overallConfidence: genes.reduce((s, g) => s + g.confidence, 0) / genes.length,
      elapsedMs: Date.now() - start,
    };
  },
};
