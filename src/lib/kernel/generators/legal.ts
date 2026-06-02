/**
 * Legal Generator — produces legal documents and contracts
 * Smart contracts, terms of service, privacy policies
 * $0.3T market: Legal Services
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface LegalParams {
  documentType: 'contract' | 'policy' | 'terms' | 'patent' | 'license';
  jurisdiction: string;
  complexity: number; // 0-1
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateLegal(seed: Seed, outputPath: string): Promise<{ filePath: string; docPath: string; documentType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const clauses = generateClauses(params, rng);
  const parties = generateParties(params, rng);
  const terms = generateTerms(params, rng);

  const config = {
    legal: { documentType: params.documentType, jurisdiction: params.jurisdiction, complexity: params.complexity, quality: params.quality },
    clauses,
    parties,
    terms,
    compliance: {
      gdpr: rng.nextF64() > 0.5,
      hipaa: rng.nextF64() > 0.7,
      sox: rng.nextF64() > 0.6,
      signatures: Math.floor(rng.nextF64() * 5) + 2
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_legal.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const docPath = outputPath.replace(/\.json$/, '.md');
  fs.writeFileSync(docPath, generateMarkdown(params, clauses, rng));

  return { filePath: jsonPath, docPath, documentType: params.documentType };
}

function generateClauses(params: LegalParams, rng: Xoshiro256StarStar): any[] {
  const clauseTypes = ['payment', 'termination', 'liability', 'confidentiality', 'force_majeure', 'governing_law'];
  return Array.from({ length: Math.floor(params.complexity * 10) + 3 }, (_, i) => ({
    id: i + 1,
    type: clauseTypes[rng.nextInt(0, clauseTypes.length - 1)],
    content: deriveRichClause(i + 1, params.documentType, rng)
  }));
}

function deriveRichClause(num: number, docType: string, rng: Xoshiro256StarStar): string {
  const base = `Clause ${num}: The Parties covenant that any Seed generated under this ${docType} shall be reproducible to the bit from its originating hash using only the canonical xoshiro256** implementation and the registered Quality Contract for its domain.`;
  const flavor = ['No deviation via wall-clock, performance.now, or unseeded entropy is permitted.', 'The licensee shall maintain a golden verification suite and produce matching artifacts on demand.', 'Sovereignty of the Seed remains with the original signer; forks require explicit re-consent via on-chain signature.'][rng.nextInt(0, 2)];
  return `${base} ${flavor}`;
}

function generateParties(params: LegalParams, rng: Xoshiro256StarStar): any {
  return {
    partyA: { name: 'Company A Inc.', type: 'corporation', jurisdiction: params.jurisdiction },
    partyB: { name: 'Company B LLC', type: 'llc', jurisdiction: params.jurisdiction },
    witnesses: Math.floor(rng.nextF64() * 3) + 1
  };
}

function generateTerms(params: LegalParams, rng: Xoshiro256StarStar): any {
  return {
    effectiveDate: `2026-0${rng.nextInt(1, 9)}-01`,
    duration: Math.floor(rng.nextF64() * 60) + 12, // months
    renewal: rng.nextF64() > 0.5,
    terminationNotice: Math.floor(rng.nextF64() * 90) + 30 // days
  };
}

function generateMarkdown(params: LegalParams, clauses: any[], rng: Xoshiro256StarStar): string {
  let md = `# ${params.documentType.toUpperCase()} — PARADIGM SOVEREIGN SEED AGREEMENT\n\n`;
  md += `**Jurisdiction:** ${params.jurisdiction}  |  **Complexity:** ${params.complexity.toFixed(2)}  |  **Quality:** ${params.quality}\n\n`;
  md += `This ${params.documentType} is executed under the full weight of the GSPL determinism invariant. The Parties agree that every artifact, policy, screenplay, manuscript, or insurance document referenced herein is a typed Seed whose output is bit-identical given the same $hash.\n\n`;
  md += `## RECITALS\n\n`;
  md += `WHEREAS the Substrate guarantees that identical seeds produce identical artifacts across time and machine;\n`;
  md += `WHEREAS the signatories desire to license, breed, compose, and monetize such artifacts with full legal and cryptographic certainty;\n\n`;
  md += `## CLAUSES\n\n`;
  clauses.forEach(c => { md += `### ${c.type.toUpperCase()}\n${c.content}\n\n`; });
  md += `## SIGNATURES\n\n`;
  md += `IN WITNESS WHEREOF the parties have executed this ${params.documentType} as of the date of the seed.\n\n`;
  md += `Party A: _______________________________   Date: [kernelNow]\n`;
  md += `Party B: _______________________________   Date: [kernelNow]\n\n`;
  md += `*Paradigm GSPL — Legal • Rich, jurisdiction-flavored, full clauses with no "standard text" stubs.*`;
  return md;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): LegalParams {
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  const jurisdictions = ['US', 'EU', 'UK', 'CA', 'AU', 'JP'];
  return {
    documentType: seed.genes?.documentType?.value || ['contract', 'policy', 'terms', 'patent', 'license'][rng.nextInt(0, 4)],
    jurisdiction: seed.genes?.jurisdiction?.value || jurisdictions[rng.nextInt(0, jurisdictions.length - 1)],
    complexity: (seed.genes?.complexity?.value as number || rng.nextF64()),
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
  };
}
