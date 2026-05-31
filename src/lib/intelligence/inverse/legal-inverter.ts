/**
 * Legal Document Inverter — contracts/legal text → seed
 */
import type { Inverter, InversionReport, InvertedGene, InversionResidual } from './types';

interface LegalArtifact {
  title: string;
  type: string;
  parties: string[];
  clauses: Array<{ title: string; content: string }>;
  governingLaw?: string;
  term?: number;
}

export const legalInverter: Inverter<LegalArtifact> = {
  id: 'legal.document-v1',
  domain: 'narrative',
  accepts(a: LegalArtifact): boolean { return a && typeof a.title === 'string' && Array.isArray(a.clauses); },
  async invert(artifact: LegalArtifact): Promise<InversionReport> {
    const start = Date.now();
    const genes: InvertedGene[] = [];
    const residuals: InversionResidual[] = [];

    genes.push({ path: 'narrative.title', value: artifact.title, confidence: 0.95, level: 'high' });
    genes.push({ path: 'narrative.documentType', value: artifact.type, confidence: 0.9, level: 'high' });
    genes.push({ path: 'narrative.partyCount', value: artifact.parties.length, confidence: 0.95, level: 'high' });
    genes.push({ path: 'narrative.clauseCount', value: artifact.clauses.length, confidence: 0.95, level: 'high' });

    if (artifact.governingLaw) {
      genes.push({ path: 'narrative.governingLaw', value: artifact.governingLaw, confidence: 0.9, level: 'high' });
    }
    if (artifact.term) {
      genes.push({ path: 'narrative.term', value: artifact.term, confidence: 0.9, level: 'high' });
    }

    // Complexity from clause count and length
    const totalLength = artifact.clauses.reduce((s, c) => s + c.content.length, 0);
    const complexity = Math.min(1, (artifact.clauses.length * totalLength) / 50000);
    genes.push({ path: 'narrative.complexity', value: complexity, confidence: 0.6, level: 'medium' });

    residuals.push({ feature: 'legal semantics', reason: 'no-gene', raw: 'Legal interpretation requires NLP' });

    return {
      domain: 'narrative', inverterId: this.id,
      artifactBytes: JSON.stringify(artifact).length,
      genes, residuals,
      overallConfidence: genes.reduce((s, g) => s + g.confidence, 0) / genes.length,
      elapsedMs: Date.now() - start,
    };
  },
};
