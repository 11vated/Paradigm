/**
 * Food Service Generator — produces food service designs
 * Restaurants, cloud kitchens, delivery, meal prep
 * $1T market: Food Service
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface FoodServiceParams {
  serviceType: 'restaurant' | 'cloud_kitchen' | 'catering' | 'food_truck';
  seating: number;
  cuisine: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFoodService(seed: Seed, outputPath: string): Promise<{ filePath: string; menuPath: string; serviceType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    foodService: { serviceType: params.serviceType, seating: params.seating, cuisine: params.cuisine, quality: params.quality },
    kitchen: generateKitchen(params, rng),
    menu: generateMenu(params, rng),
    economics: { avgCheck: rng.nextF64() * 100 + 15, covers: params.seating * 3, margin: rng.nextF64() * 0.15 + 0.05 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_foodservice.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const menuPath = outputPath.replace(/\.json$/, '_menu.md');
  fs.writeFileSync(menuPath, generateMenuMD(params, rng));

  return { filePath: jsonPath, menuPath, serviceType: params.serviceType };
}

function generateKitchen(params: FoodServiceParams, rng: Xoshiro256StarStar): any {
  return {
    stations: Math.floor(rng.nextF64() * 5) + 2,
    equipment: ['oven', 'grill', 'fryer', 'refrigerator'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    sqMeters: params.seating * 1.5,
    healthRating: rng.nextF64() * 1 + 4 // 4-5 stars
  };
}

function generateMenu(params: FoodServiceParams, rng: Xoshiro256StarStar): any {
  return {
    categories: ['appetizer', 'main', 'dessert', 'beverage'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    items: Math.floor(rng.nextF64() * 50) + 10,
    priceRange: `$${rng.nextF64()*20+5} - $${rng.nextF64()*50+30}`,
    specials: Math.floor(rng.nextF64() * 5) + 1
  };
}

function generateMenuMD(params: FoodServiceParams, rng: Xoshiro256StarStar): string {
  return `# ${params.cuisine.charAt(0).toUpperCase() + params.cuisine.slice(1)} Menu\n\n## Appetizers\n- Dish 1: $${rng.nextF64()*15+5}\n- Dish 2: $${rng.nextF64()*12+8}\n\n## Mains\n- Signature: $${rng.nextF64()*40+20}\n\n*Paradigm GSPL — Food Service*`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): FoodServiceParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const cuisines = ['italian', 'chinese', 'mexican', 'indian', 'french', 'japanese'];
  return {
    serviceType: seed.genes?.serviceType?.value || ['restaurant', 'cloud_kitchen', 'catering', 'food_truck'][rng.nextInt(0, 3)],
    seating: Math.floor(((seed.genes?.seating?.value as number || rng.nextF64()) * 490) + 10),
    cuisine: seed.genes?.cuisine?.value || cuisines[rng.nextInt(0, cuisines.length - 1)],
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
