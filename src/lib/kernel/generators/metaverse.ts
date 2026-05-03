/**
 * Metaverse Generator — produces metaverse designs
 * Virtual worlds, digital assets, avatars
 * $0.8T market: Metaverse
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface MetaverseParams {
  worldType: 'social' | 'gaming' | 'commerce' | 'education';
  userCount: number;
  concurrency: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateMetaverse(seed: Seed, outputPath: string): Promise<{ filePath: string; worldPath: string; worldType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    metaverse: { worldType: params.worldType, userCount: params.userCount, concurrency: params.concurrency, quality: params.quality },
    assets: { nfts: rng.nextF64() > 0.5, wearables: Math.floor(rng.nextF64() * 1000) + 100, realEstate: Math.floor(rng.nextF64() * 100) + 10 },
    economy: { currency: 'token', exchangeRate: rng.nextF64() * 100, transactions: rng.nextF64() * 1e6 },
    tech: { engine: ['Unity', 'Unreal', 'Decentraland', 'Roblox'][rng.nextInt(0, 3)], blockchain: rng.nextF64() > 0.5, vrSupport: rng.nextF64() > 0.3 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_metaverse.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const worldPath = outputPath.replace(/\.json$/, '_world.svg');
  fs.writeFileSync(worldPath, generateSVG(params, rng));

  return { filePath: jsonPath, worldPath, worldType: params.worldType };
}

function generateSVG(params: MetaverseParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a0a2a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">Metaverse: ${params.worldType}</text>
  ${Array.from({ length: 20 }, (_, i) => `<circle cx="${rng.nextF64()*700+50}" cy="${rng.nextF64()*400+80}" r="15" fill="rgb(${rng.nextInt(100,255)},${rng.nextInt(100,255)},${rng.nextInt(100,255)})"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Metaverse</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): MetaverseParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    worldType: seed.genes?.worldType?.value || ['social', 'gaming', 'commerce', 'education'][rng.nextInt(0, 3)],
    userCount: Math.floor(((seed.genes?.userCount?.value as number || rng.nextF64()) * 9900000) + 100000),
    concurrency: Math.floor(((seed.genes?.concurrency?.value as number || rng.nextF64()) * 99000) + 1000),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
