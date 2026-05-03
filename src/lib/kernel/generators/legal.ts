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
    content: `Clause ${i + 1}: Standard legal text for ${params.documentType}...`
  }));
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
  let md = `# ${params.documentType.toUpperCase()}\n\n`;
  md += `Jurisdiction: ${params.jurisdiction}\n\n`;
  md += `## Clauses\n\n`;
  clauses.forEach(c => { md += `### ${c.type}\n${c.content}\n\n`; });
  md += `\n*Paradigm GSPL Beyond Omega — Legal*`;
  return md;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): LegalParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const jurisdictions = ['US', 'EU', 'UK', 'CA', 'AU', 'JP'];
  return {
    documentType: seed.genes?.documentType?.value || ['contract', 'policy', 'terms', 'patent', 'license'][rng.nextInt(0, 4)],
    jurisdiction: seed.genes?.jurisdiction?.value || jurisdictions[rng.nextInt(0, jurisdictions.length - 1)],
    complexity: (seed.genes?.complexity?.value as number || rng.nextF64()),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
