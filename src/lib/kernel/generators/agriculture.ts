/**
 * Agriculture Generator — produces smart agriculture designs
 * Precision farming, vertical farms, crop optimization
 * $0.5T market: AgTech
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface AgricultureParams {
  farmType: 'vertical' | 'precision' | 'hydroponic' | 'aeroponic' | 'traditional';
  area: number; // hectares
  cropType: string;
  automation: number; // 0-1
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateAgriculture(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; cropType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate farm layout
  const layout = generateLayout(params, rng);

  // Generate crop plan
  const cropPlan = generateCropPlan(params, rng);

  // Generate automation system
  const automation = generateAutomation(params, rng);

  const config = {
    agriculture: {
      farmType: params.farmType,
      area: params.area,
      cropType: params.cropType,
      automation: params.automation,
      quality: params.quality
    },
    layout,
    cropPlan,
    automation,
    sustainability: {
      waterSaving: rng.nextF64() * 50 + 30, // 30-80%
      pesticideReduction: rng.nextF64() * 90 + 10, // 10-100%
      carbonFootprint: rng.nextF64() * 0.5 // kg CO2 per kg crop
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_agriculture.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write layout SVG
  const layoutPath = outputPath.replace(/\.json$/, '_farm.svg');
  fs.writeFileSync(layoutPath, generateLayoutSVG(params, rng));

  return {
    filePath: jsonPath,
    layoutPath,
    cropType: params.cropType
  };
}

function generateLayout(params: AgricultureParams, rng: Xoshiro256StarStar): any {
  const zones: any[] = [];
  const zoneCount = params.farmType === 'vertical' ? 10 : 5;

  for (let i = 0; i < zoneCount; i++) {
    zones.push({
      id: `zone_${i}`,
      type: i === 0 ? 'planting' : (i === zoneCount - 1 ? 'harvest' : 'growing'),
      area: params.area / zoneCount,
      irrigation: params.farmType !== 'traditional' ? 'drip' : 'sprinkler'
    });
  }

  return {
    zones,
    infrastructure: {
      greenhouses: params.farmType === 'vertical' ? 0 : Math.floor(rng.nextF64() * 20),
      silos: Math.floor(rng.nextF64() * 5),
      processing: rng.nextF64() > 0.5
    }
  };
}

function generateCropPlan(params: AgricultureParams, rng: Xoshiro256StarStar): any {
  return {
    primaryCrop: params.cropType,
    rotation: ['legumes', 'cereals', 'root_crops'].slice(0, Math.floor(rng.nextF64() * 3) + 1),
    yield: rng.nextF64() * 20 + 5, // tons per hectare
    growingSeason: Math.floor(rng.nextF64() * 6) + 3, // months
    fertilizer: {
      type: 'organic',
      amount: rng.nextF64() * 200 // kg/hectare
    }
  };
}

function generateAutomation(params: AgricultureParams, rng: Xoshiro256StarStar): any {
  return {
    level: params.automation,
    robots: params.automation > 0.5 ? Math.floor(rng.nextF64() * 50) + 10 : 0,
    drones: params.farmType !== 'vertical' ? Math.floor(rng.nextF64() * 10) : 0,
    sensors: Math.floor(params.area * 10), // 10 per hectare
    ai: {
      cropMonitoring: true,
      yieldPrediction: true,
      diseaseDetection: rng.nextF64() > 0.3
    }
  };
}

function generateLayoutSVG(params: AgricultureParams, rng: Xoshiro256StarStar): string {
  const width = 800;
  const height = 600;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#2a3a2a"/>
  <text x="50%" y="30" text-anchor="middle" font-size="20" fill="white">${params.farmType} Farm — ${params.cropType}</text>
  
  ${Array.from({ length: 6 }, (_, i) => {
    const x = (i % 3) * 250 + 50;
    const y = Math.floor(i / 3) * 250 + 80;
    return `<rect x="${x}" y="${y}" width="200" height="200" fill="#4a4" opacity="0.5" stroke="#fff" stroke-width="1"/>
    <text x="${x + 100}" y="${y + 100}" text-anchor="middle" fill="white" font-size="12">Zone ${i + 1}</text>`;
  }).join('\n  ')}
  
  <text x="50%" y="${height - 30}" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Smart Agriculture ${params.area}ha</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): AgricultureParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const crops = ['wheat', 'rice', 'corn', 'soybean', 'tomato', 'lettuce', 'strawberry'];

  return {
    farmType: seed.genes?.farmType?.value || ['vertical', 'precision', 'hydroponic', 'aeroponic', 'traditional'][rng.nextInt(0, 4)],
    area: ((seed.genes?.area?.value as number || rng.nextF64()) * 9900) + 100, // 100-10000 hectares
    cropType: seed.genes?.cropType?.value || crops[rng.nextInt(0, crops.length - 1)],
    automation: (seed.genes?.automation?.value as number || rng.nextF64()),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
