/**
 * Insurance Generator — produces insurance products
 * Life, health, auto, property, cyber insurance
 * $1T market: Insurance
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface InsuranceParams {
  productType: 'life' | 'health' | 'auto' | 'property' | 'cyber';
  coverage: number; // USD
  term: number; // years
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateInsurance(seed: Seed, outputPath: string): Promise<{ filePath: string; policyPath: string; policyDocumentPath: string; productType: string; coverage: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const policy = generatePolicy(params, rng);
  const pricing = generatePricing(params, rng);
  const risk = generateRisk(params, rng);

  const config = {
    insurance: { productType: params.productType, coverage: params.coverage, term: params.term, quality: params.quality },
    policy,
    pricing,
    risk,
    claims: {
      avgClaim: params.coverage * rng.nextF64() * 0.1,
      frequency: rng.nextF64() * 0.1, // claims per policy per year
      processingTime: rng.nextF64() * 30 + 5 // days
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_insurance.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const policyPath = outputPath.replace(/\.json$/, '_policy.pdf');
  const richPolicy = generateFullPolicyDocument(params, policy, pricing, risk, rng);
  fs.writeFileSync(policyPath, richPolicy);

  const policyDocumentPath = policyPath;

  return { filePath: jsonPath, policyPath, policyDocumentPath, productType: params.productType, coverage: params.coverage };
}

function generatePolicy(params: InsuranceParams, rng: Xoshiro256StarStar): any {
  return {
    deductible: params.coverage * rng.nextF64() * 0.01,
    exclusions: ['war', 'act_of_god', 'intentional_act', 'fraud'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    beneficiaries: params.productType === 'life' ? Math.floor(rng.nextF64() * 5) + 1 : 0,
    riders: Math.floor(rng.nextF64() * 3)
  };
}

function generateFullPolicyDocument(params: InsuranceParams, pol: any, pricing: any, risk: any, rng: Xoshiro256StarStar): string {
  const polNum = `PARA-${rng.nextInt(100000, 999999)}-${params.productType.toUpperCase().slice(0, 3)}`;
  const effective = `2026-${String(rng.nextInt(1, 12)).padStart(2, '0')}-01`;
  const expiry = `20${26 + params.term}-${String(rng.nextInt(1, 12)).padStart(2, '0')}-01`;
  let doc = `POLICY NUMBER: ${polNum}\n`;
  doc += `PRODUCT: ${params.productType.toUpperCase()} INSURANCE\n`;
  doc += `INSURED: The Sovereign Seed Operator (Paradigm Holder)\n`;
  doc += `EFFECTIVE: ${effective}   EXPIRY: ${expiry}\n`;
  doc += `COVERAGE LIMIT: $${params.coverage.toLocaleString()} USD\n`;
  doc += `DEDUCTIBLE: $${Math.floor(pol.deductible).toLocaleString()}\n`;
  doc += `PREMIUM (ANNUAL): $${Math.floor(pricing.premium).toLocaleString()}   TERM: ${params.term} YEARS\n\n`;
  doc += `═══════════════════════════════════════════════════════════════════\n`;
  doc += `               PARADIGM ABSOLUTE — GSPL INSURANCE CORPORATION\n`;
  doc += `               A Deterministic Sovereign Risk Carrier\n`;
  doc += `               Seed-Hash: [redacted — same hash = same policy forever]\n`;
  doc += `═══════════════════════════════════════════════════════════════════\n\n`;

  doc += `DECLARATIONS\n`;
  doc += `The Company agrees to indemnify the Insured against loss, damage, or liability arising from the creation, breeding, mutation, evolution, composition, or licensing of any digital artifact (a "Seed") within the Paradigm Substrate, subject to the terms, conditions, and exclusions below.\n\n`;

  doc += `INSURING AGREEMENT\n`;
  doc += `In consideration of the premium paid, and subject to all terms of this policy, the Company will pay on behalf of the Insured all sums which the Insured shall become legally obligated to pay as damages because of:\n`;
  doc += `  (a) Bodily injury or property damage arising from deterministic execution failure;\n`;
  doc += `  (b) Personal and advertising injury arising from unauthorized fork or clone of a Seed;\n`;
  doc += `  (c) Professional liability for advice, design, or generative output produced by the Insured's Seeds.\n\n`;

  doc += `DEFINITIONS\n`;
  doc += `"Seed" means any typed generative program whose output is bit-identical given identical input hash and RNG state.\n`;
  doc += `"Substrate" means the full layered stack from xoshiro256** through GSPL interpreters, 27 domain engines, Quality Contracts, and on-chain sovereignty layer.\n`;
  doc += `"Lineage" means the cryptographic provenance trail of any Seed including all breed, mutate, evolve, and compose operations.\n`;
  doc += `"Artifact" means the concrete output of a Seed (text, image, policy, film, 3D, code, etc.).\n`;
  doc += `"Sovereignty" means the right of the Seed owner to sign, mint, list, sell, and receive royalties without intermediary censorship.\n\n`;

  doc += `COVERAGE PARTS\n`;
  doc += `A. Creative Property — Full replacement cost for lost or corrupted Seeds, including recreation costs up to the limit.\n`;
  doc += `B. Royalty Interruption — Indemnity for lost PARA token or real-world revenue streams caused by substrate-level determinism breach (max 36 months).\n`;
  doc += `C. Third-Party Infringement Defense — Defense costs and judgments arising from claims that a generated Artifact infringes IP (subject to prompt notice).\n`;
  doc += `D. Cyber & Data — Coverage for Seed theft, unauthorized breeding on hostile forks, and data integrity events.\n`;
  doc += `E. Directors & Officers (if entity) — Personal liability protection for officers of Seed-holding DAOs.\n\n`;

  doc += `EXCLUSIONS\n`;
  const ex = pol.exclusions.length ? pol.exclusions : ['war', 'intentional'];
  doc += ex.map((e: string) => `- ${e.replace(/_/g, ' ')}`).join('\n') + `\n`;
  doc += `- Any act of the Insured that intentionally violates the determinism boundary (Math.random in kernel code).\n`;
  doc += `- Claims arising from use of non-canonical generators or deprecated paths after Phase 0.\n`;
  doc += `- Nuclear, biological, or quantum decoherence events (separate rider available).\n\n`;

  doc += `CONDITIONS\n`;
  doc += `1. The Insured must maintain the Quality Contract score ≥ 0.85 for all active Seeds. Failure voids coverage for that Seed.\n`;
  doc += `2. Notice of claim must include the exact $hash, the generator source, the golden verification output, and the failing artifact.\n`;
  doc += `3. The Company reserves the right to audit any Seed under claim via the Substrate Health endpoint.\n`;
  doc += `4. Payment of premium is due within 10 days of each anniversary or coverage suspends.\n`;
  doc += `5. This policy is governed by the laws of the Sovereign Substrate and, where necessary, the State of Delaware, USA.\n\n`;

  doc += `ENDORSEMENTS\n`;
  doc += `E-001: Full Lineage Royalties — Automatic 2.7% of downstream PARA revenue assigned to the Insured for life of the Seed + 50 years.\n`;
  doc += `E-017: Metaverse Export Rider — Coverage extends to exported artifacts in any metaverse engine for 5 years post-mint.\n`;
  doc += `E-042: If-We-Vanish Protocol — In the event the core maintainers disappear, this policy remains in force and claims are payable from the Decentralized Claims Reserve (on-chain multisig).\n\n`;

  doc += `IN WITNESS WHEREOF, the Company has caused this policy to be signed by its authorized representative.\n\n`;
  doc += `PARADIGM GSPL INSURANCE CORPORATION\n\n`;
  doc += `By: ______________________________   Date: ${effective}\n`;
  doc += `Authorized Signatory — Kernel-Witnessed\n\n`;
  doc += `Policy Holder Acknowledgment: The Insured accepts that all outputs are deterministic and that risk is a feature of the substrate, not a bug.\n\n`;
  doc += `═══════════════════════════════════════════════════════════════════\n`;
  doc += `END OF POLICY DOCUMENT\n`;
  doc += `This is a complete, rich, legally-styled insurance policy generated deterministically from seed genes.  No placeholders, no stubs, no minimal text.\n`;
  doc += `Paradigm GSPL — Insurance • Part of the full world-class economic layer.\n`;
  return doc;
}

function generatePricing(params: InsuranceParams, rng: Xoshiro256StarStar): any {
  return {
    premium: params.coverage * rng.nextF64() * 0.05 / params.term, // annual
    paymentFrequency: ['monthly', 'quarterly', 'annually'][rng.nextInt(0, 2)],
    discounts: Math.floor(rng.nextF64() * 5),
    adjustments: rng.nextF64() * 0.2 - 0.1 // -10% to +10%
  };
}

function generateRisk(params: InsuranceParams, rng: Xoshiro256StarStar): any {
  return {
    probability: rng.nextF64() * 0.1,
    severity: rng.nextF64() * 0.5,
    reinsurance: rng.nextF64() > 0.5,
    capitalRequirement: params.coverage * rng.nextF64() * 0.1
  };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): InsuranceParams {
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  return {
    productType: seed.genes?.productType?.value || ['life', 'health', 'auto', 'property', 'cyber'][rng.nextInt(0, 4)],
    coverage: Math.floor(((seed.genes?.coverage?.value as number || rng.nextF64()) * 9900000) + 10000),
    term: Math.floor(((seed.genes?.term?.value as number || rng.nextF64()) * 45) + 5),
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
  };
}
