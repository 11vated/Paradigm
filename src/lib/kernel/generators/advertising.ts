/**
 * Advertising Generator — produces advertising campaigns
 * Digital, print, TV, social media ads
 * $0.7T market: Advertising
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface AdvertisingParams {
  medium: 'digital' | 'print' | 'tv' | 'social';
  budget: number; // USD
  reach: number; // people
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateAdvertising(seed: Seed, outputPath: string): Promise<{ filePath: string; creativePath: string; medium: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    advertising: { medium: params.medium, budget: params.budget, reach: params.reach, quality: params.quality },
    campaign: { name: `${params.medium.charAt(0).toUpperCase() + params.medium.slice(1)} Campaign ${rng.nextInt(1, 100)}`, duration: Math.floor(rng.nextF64() * 12) + 1, objective: ['awareness', 'conversion', 'retention'][rng.nextInt(0, 2)] },
    creative: { format: ['banner', 'video', 'native', 'sponsored'][rng.nextInt(0, 3)], cta: ['Buy Now', 'Learn More', 'Sign Up', 'Subscribe'][rng.nextInt(0, 3)], variants: Math.floor(rng.nextF64() * 10) + 3 },
    metrics: { cpm: rng.nextF64() * 20 + 1, ctr: rng.nextF64() * 0.05, conversionRate: rng.nextF64() * 0.1, roas: rng.nextF64() * 5 + 1 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_advertising.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const creativePath = outputPath.replace(/\.json$/, '_creative.svg');
  fs.writeFileSync(creativePath, generateSVG(params, rng));

  return { filePath: jsonPath, creativePath, medium: params.medium };
}

function generateSVG(params: AdvertisingParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#e8f0f8"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="#333">${params.medium} Ad — Budget: $${params.budget.toLocaleString()}</text>
  <rect x="200" y="100" width="400" height="300" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="400" y="270" text-anchor="middle" fill="#333" font-size="16">AD CREATIVE</text>
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Advertising</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): AdvertisingParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    medium: seed.genes?.medium?.value || ['digital', 'print', 'tv', 'social'][rng.nextInt(0, 3)],
    budget: Math.floor(((seed.genes?.budget?.value as number || rng.nextF64()) * 9900000) + 100000),
    reach: Math.floor(((seed.genes?.reach?.value as number || rng.nextF64()) * 99000000) + 1000000),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
