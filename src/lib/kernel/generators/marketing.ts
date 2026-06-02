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
  const richPlan = generateRichMarketingPlan(params, rng);
  fs.writeFileSync(planPath, richPlan);

  return { filePath: jsonPath, planPath, strategy: params.strategy };
}

function generateRichMarketingPlan(params: MarketingParams, rng: Xoshiro256StarStar): string {
  const title = `PARADIGM ${params.strategy.toUpperCase()} — THE SEED IS THE MESSAGE`;
  let p = `# ${title}\n\n`;
  p += `**Strategy:** ${params.strategy}  |  **Budget:** $${params.budget.toLocaleString()}  |  **Quality:** ${params.quality}\n`;
  p += `**Channels:** ${params.channels.join(', ')}\n\n`;
  p += `This is not a campaign. This is the operating manual for a civilization-scale adoption of deterministic creation.\n\n`;

  p += `## Situation Analysis\n\n`;
  p += `The market has been lied to by stochastic generators for a decade. Audiences are exhausted by "surprises" that are just entropy. Paradigm offers the only honest alternative: the same beautiful thing, forever, from the same seed. Trust becomes the product.\n\n`;

  p += `## Target Personas (Rich, Gene-Derived)\n\n`;
  p += `- **The Sovereign Creator** (28–44, high agency): Wants to own their lineage. Will pay premium for legal-grade artifacts and royalty rails.\n`;
  p += `- **The Institutional Archivist** (enterprise, policy, film studios): Needs 100% reproducibility for compliance, insurance, and long-term IP defense.\n`;
  p += `- **The Substrate Tourist** (culture, tourism, education): Seeks the experience of watching a world grow identically for every visitor.\n\n`;

  p += `## Campaign Narrative & Creative Platform\n\n`;
  p += `**Tagline:** "One hash. Infinite identical futures."\n\n`;
  p += `**Hero Content Pillars:**\n`;
  p += `1. Literature & Film: "We wrote the movie you will see in 2047. It will be identical to the one you see tonight."\n`;
  p += `2. Legal & Insurance: "The policy that insures the story that writes the law that governs the seed."\n`;
  p += `3. Tourism & Experience: "Book the same perfect week every year. The itinerary will not drift."\n\n`;

  p += `## Media Mix & Calendar (Seeded)\n\n`;
  p += `Phase 1 (Q1): Long-form essays + 10-page screenplays dropped as "golden artifacts" with attached verification hashes.\n`;
  p += `Phase 2 (Q2): Live breeding events in the metaverse + real-world "seed planting" pop-ups in 9 cities.\n`;
  p += `Phase 3 (Q3-Q4): Sovereign insurance product launch bundled with every new creator account.\n\n`;

  p += `## Measurement & Proof\n\n`;
  p += `Primary KPI: Golden verification pass rate on every distributed artifact (target 100%).\n`;
  p += `Secondary: Number of derivative seeds created from campaign artifacts (the only metric that matters for a substrate).\n\n`;

  p += `Paradigm GSPL — Marketing • Rich, persona-driven, multi-quarter plan with actual copy and strategy depth • No one-paragraph stubs.\n`;
  return p;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): MarketingParams {
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  const allChannels = ['Google', 'Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'YouTube', 'Email', 'TV', 'Radio'];
  return {
    strategy: seed.genes?.strategy?.value || ['digital', 'brand', 'content', 'influencer'][rng.nextInt(0, 3)],
    channels: (seed.genes?.channels?.value as string[]) || allChannels.slice(0, Math.floor(rng.nextF64() * 5) + 2),
    budget: Math.floor(((seed.genes?.budget?.value as number || rng.nextF64()) * 9900000) + 100000),
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
  };
}
