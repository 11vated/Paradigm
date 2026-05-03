/**
 * Drone Delivery Generator — produces drone delivery systems
 * Last-mile delivery, medical delivery, autonomous drones
 * $0.2T market: Drone Delivery
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface DroneDeliveryParams {
  serviceType: 'last_mile' | 'medical' | 'food' | 'ecommerce';
  range: number; // km
  payload: number; // kg
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateDroneDelivery(seed: Seed, outputPath: string): Promise<{ filePath: string; networkPath: string; serviceType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    droneDelivery: { serviceType: params.serviceType, range: params.range, payload: params.payload, quality: params.quality },
    fleet: { drones: Math.floor(rng.nextF64() * 500) + 50, chargingStations: Math.floor(rng.nextF64() * 20) + 5, avgDeliveries: Math.floor(rng.nextF64() * 50) + 10 },
    autonomy: { level: ['waypoints', 'beyond_visual', 'fully_autonomous'][rng.nextInt(0, 2)], obstacleAvoidance: true, returnToHome: true },
    economics: { costPerDelivery: rng.nextF64() * 10 + 2, batterySwap: rng.nextF64() > 0.5, insurance: rng.nextF64() * 10000 + 1000 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_drone_delivery.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const networkPath = outputPath.replace(/\.json$/, '_network.svg');
  fs.writeFileSync(networkPath, generateSVG(params, rng));

  return { filePath: jsonPath, networkPath, serviceType: params.serviceType };
}

function generateSVG(params: DroneDeliveryParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0a1a2a"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="white">${params.serviceType} — ${params.payload}kg payload</text>
  ${Array.from({ length: 12 }, (_, i) => `<polygon points="${rng.nextF64()*700+50},${rng.nextF64()*400+80} ${rng.nextF64()*700+70},${rng.nextF64()*400+100} ${rng.nextF64()*700+30},${rng.nextF64()*400+100}" fill="#4a4" opacity="0.7"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Drone Delivery</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): DroneDeliveryParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    serviceType: seed.genes?.serviceType?.value || ['last_mile', 'medical', 'food', 'ecommerce'][rng.nextInt(0, 3)],
    range: Math.floor(((seed.genes?.range?.value as number || rng.nextF64()) * 990) + 10),
    payload: (seed.genes?.payload?.value as number || rng.nextF64()) * 25 + 0.1,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
