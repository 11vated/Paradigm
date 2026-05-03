/**
 * Retail Generator — produces retail systems
 * E-commerce, physical stores, omnichannel, supply chain
 * $5T market: Retail
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface RetailParams {
  storeType: 'ecommerce' | 'physical' | 'omnichannel' | 'pop_up';
  skuCount: number;
  annualRevenue: number; // USD
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateRetail(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; storeType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    retail: { storeType: params.storeType, skuCount: params.skuCount, annualRevenue: params.annualRevenue, quality: params.quality },
    inventory: generateInventory(params, rng),
    customer: generateCustomer(params, rng),
    economics: { margin: rng.nextF64() * 0.3 + 0.2, cac: rng.nextF64() * 100 + 20, ltv: rng.nextF64() * 1000 + 100 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_retail.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_store.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, storeType: params.storeType };
}

function generateInventory(params: RetailParams, rng: Xoshiro256StarStar): any {
  return {
    categories: ['electronics', 'clothing', 'home', 'food'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    turnover: rng.nextF64() * 10 + 2, // times per year
    stockoutRate: rng.nextF64() * 0.05,
    warehouseSize: params.skuCount * 0.1 // sq m
  };
}

function generateCustomer(params: RetailParams, rng: Xoshiro256StarStar): any {
  return {
    segments: ['budget', 'premium', 'luxury'].slice(0, Math.floor(rng.nextF64() * 3) + 1),
    avgBasket: rng.nextF64() * 200 + 20,
    frequency: rng.nextF64() * 10 + 1, // visits per year
    nps: rng.nextF64() * 50 + 50 // 50-100
  };
}

function generateSVG(params: RetailParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#faf5f0"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="#333">${params.storeType} — ${params.skuCount} SKUs</text>
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${i%4*180+80}" y="${Math.floor(i/4)*220+80}" width="160" height="180" fill="#fff" stroke="#333" stroke-width="1"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Retail</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): RetailParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    storeType: seed.genes?.storeType?.value || ['ecommerce', 'physical', 'omnichannel', 'pop_up'][rng.nextInt(0, 3)],
    skuCount: Math.floor(((seed.genes?.skuCount?.value as number || rng.nextF64()) * 99000) + 1000),
    annualRevenue: Math.floor(((seed.genes?.annualRevenue?.value as number || rng.nextF64()) * 990e6) + 10e6),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
