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

export async function generateInsurance(seed: Seed, outputPath: string): Promise<{ filePath: string; policyPath: string; productType: string }> {
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
  fs.writeFileSync(policyPath, `Placeholder for ${params.productType} insurance policy document`);

  return { filePath: jsonPath, policyPath, productType: params.productType };
}

function generatePolicy(params: InsuranceParams, rng: Xoshiro256StarStar): any {
  return {
    deductible: params.coverage * rng.nextF64() * 0.01,
    exclusions: ['war', 'act_of_god', 'intentional_act', 'fraud'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    beneficiaries: params.productType === 'life' ? Math.floor(rng.nextF64() * 5) + 1 : 0,
    riders: Math.floor(rng.nextF64() * 3)
  };
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
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    productType: seed.genes?.productType?.value || ['life', 'health', 'auto', 'property', 'cyber'][rng.nextInt(0, 4)],
    coverage: Math.floor(((seed.genes?.coverage?.value as number || rng.nextF64()) * 9900000) + 10000),
    term: Math.floor(((seed.genes?.term?.value as number || rng.nextF64()) * 45) + 5),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
