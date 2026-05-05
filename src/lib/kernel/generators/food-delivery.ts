/**
 * Food Delivery Generator — produces food delivery systems
 * Ghost kitchens, delivery fleets, routing optimization
 * $0.3T market: Food Delivery
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface FoodDeliveryParams {
  serviceType: 'ghost_kitchen' | 'delivery_fleet' | 'aggregator' | 'subscription';
  dailyOrders: number;
  coverage: number; // km^2
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFoodDelivery(seed: Seed, outputPath: string): Promise<{ filePath: string; networkPath: string; serviceType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    foodDelivery: { serviceType: params.serviceType, dailyOrders: params.dailyOrders, coverage: params.coverage, quality: params.quality },
    fleet: { drivers: Math.floor(rng.nextF64() * 500) + 50, vehicles: ['bike', 'scooter', 'car'][rng.nextInt(0, 2)], avgDeliveryTime: rng.nextF64() * 30 + 15 },
    kitchens: { count: Math.floor(rng.nextF64() * 20) + 5, cuisine: ['italian', 'chinese', 'indian', 'mexican'][rng.nextInt(0, 3)], capacity: Math.floor(rng.nextF64() * 500) + 100 },
    economics: { commission: rng.nextF64() * 0.3 + 0.1, driverPay: rng.nextF64() * 20 + 5, customerAcq: rng.nextF64() * 50 + 10 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_food_delivery.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const networkPath = outputPath.replace(/\.json$/, '_network.svg');
  fs.writeFileSync(networkPath, generateSVG(params, rng));

  return { filePath: jsonPath, networkPath, serviceType: params.serviceType };
}

function generateSVG(params: FoodDeliveryParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#1a2a1a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.serviceType} — ${params.dailyOrders} orders/day</text>
  ${Array.from({ length: 15 }, (_, i) => `<circle cx="${rng.nextF64()*700+50}" cy="${rng.nextF64()*400+80}" r="8" fill="#4a4"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Food Delivery</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): FoodDeliveryParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    serviceType: seed.genes?.serviceType?.value || ['ghost_kitchen', 'delivery_fleet', 'aggregator', 'subscription'][rng.nextInt(0, 3)],
    dailyOrders: Math.floor(((seed.genes?.dailyOrders?.value as number || rng.nextF64()) * 9900) + 100),
    coverage: Math.floor(((seed.genes?.coverage?.value as number || rng.nextF64()) * 990) + 10),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
