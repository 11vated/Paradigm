/**
 * Marketing Generator — produces marketing strategies
 * Digital marketing, branding, market research
 * $0.5T market: Marketing
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface MarketingParams {
  strategy: 'digital' | 'brand' | 'content' | 'influencer';
  channels: string[];
  budget: number; // USD
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateMarketing(seed: Seed, outputPath: string): Promise<{ filePath: string; planPath: string; strategy: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    marketing: { strategy: params.strategy, channels: params.channels, budget: params.budget, quality: params.quality },
    tactics: { seo: rng.nextF64() > 0.5, sem: rng.nextF64() > 0.5, social: true, email: rng.nextF64() > 0.3, events: rng.nextF64() > 0.6 },
    funnel: { awareness: rng.nextF64() * 100000, consideration: rng.nextF64() * 50000, conversion: rng.nextF64() * 10000, retention: rng.nextF64() * 5000 },
    kpis: { cac: rng.nextF64() * 100 + 10, ltv: rng.nextF64() * 1000 + 100, churn: rng.nextF64() * 0.1, nps: rng.nextF64() * 50 + 50 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_marketing.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const planPath = outputPath.replace(/\.json$/, '_plan.md');
  fs.writeFileSync(planPath, `# Marketing Plan: ${params.strategy.toUpperCase()}\n\nBudget: $${params.budget.toLocaleString()}\nChannels: ${params.channels.join(', ')}\n\nParadigm GSPL — Marketing`);

  return { filePath: jsonPath, planPath, strategy: params.strategy };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): MarketingParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const allChannels = ['Google', 'Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Email', 'TV', 'Radio'];
  return {
    strategy: seed.genes?.strategy?.value || ['digital', 'brand', 'content', 'influencer'][rng.nextInt(0, 3)],
    channels: (seed.genes?.channels?.value as string[]) || allChannels.slice(0, Math.floor(rng.nextF64() * 5) + 2),
    budget: Math.floor(((seed.genes?.budget?.value as number || rng.nextF64()) * 9900000) + 100000),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
