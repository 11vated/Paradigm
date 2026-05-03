/**
 * Cosmetics Generator — produces cosmetic products
 * Skincare, makeup, fragrance, personal care
 * $0.5T market: Cosmetics
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface CosmeticsParams {
  productType: 'skincare' | 'makeup' | 'fragrance' | 'personal_care';
  skinType: 'dry' | 'oily' | 'combination' | 'sensitive';
  organic: boolean;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateCosmetics(seed: Seed, outputPath: string): Promise<{ filePath: string; formulaPath: string; productType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    cosmetics: { productType: params.productType, skinType: params.skinType, organic: params.organic, quality: params.quality },
    ingredients: generateIngredients(params, rng),
    formulation: generateFormulation(params, rng),
    packaging: { type: ['jar', 'bottle', 'tube', 'compact'][rng.nextInt(0, 3)], recyclable: rng.nextF64() > 0.5, volume: rng.nextF64() * 200 + 30 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_cosmetics.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const formulaPath = outputPath.replace(/\.json$/, '_formula.txt');
  fs.writeFileSync(formulaPath, `Ingredients: ${config.ingredients.list.join(', ')}\nOrganic: ${params.organic}\nParadigm GSPL — Cosmetics`);

  return { filePath: jsonPath, formulaPath, productType: params.productType };
}

function generateIngredients(params: CosmeticsParams, rng: Xoshiro256StarStar): any {
  const base = params.organic ? ['aloe', 'coconut_oil', 'shea_butter', 'essential_oils'] : ['water', 'glycerin', 'dimethicone', 'paraben'];
  return {
    list: base.slice(0, Math.floor(rng.nextF64() * 4) + 1),
    natural: params.organic ? 100 : rng.nextF64() * 30,
    crueltyFree: rng.nextF64() > 0.5
  };
}

function generateFormulation(params: CosmeticsParams, rng: Xoshiro256StarStar): any {
  return {
    ph: rng.nextF64() * 3 + 4.5, // 4.5-7.5
    texture: ['cream', 'lotion', 'gel', 'liquid'][rng.nextInt(0, 3)],
    fragrance: rng.nextF64() > 0.3 ? 'light' : 'none',
    shelfLife: rng.nextF64() * 24 + 12 // months
  };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): CosmeticsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    productType: seed.genes?.productType?.value || ['skincare', 'makeup', 'fragrance', 'personal_care'][rng.nextInt(0, 3)],
    skinType: seed.genes?.skinType?.value || ['dry', 'oily', 'combination', 'sensitive'][rng.nextInt(0, 3)],
    organic: seed.genes?.organic?.value ?? (rng.nextF64() > 0.5),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
