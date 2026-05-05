/**
 * Climate Generator — produces climate models and scenarios
 * Temperature projections, sea level rise, carbon tracking
 * $1.5T market: Climate Tech
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface ClimateParams {
  scenario: 'RCP2.6' | 'RCP4.5' | 'RCP6.0' | 'RCP8.5';
  timeHorizon: number; // years
  region: string;
  resolution: number; // km
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateClimate(seed: Seed, outputPath: string): Promise<{ filePath: string; dataPath: string; scenario: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate climate projections
  const projections = generateProjections(params, rng);

  // Generate carbon budget
  const carbon = generateCarbonBudget(params, rng);

  // Generate extreme weather events
  const extremes = generateExtremes(params, rng);

  const config = {
    climate: {
      scenario: params.scenario,
      timeHorizon: params.timeHorizon,
      region: params.region,
      resolution: params.resolution,
      quality: params.quality
    },
    projections,
    carbon,
    extremes,
    policy: {
      parisAlignment: params.scenario === 'RCP2.6',
      netZeroYear: params.scenario === 'RCP2.6' ? 2050 : (params.scenario === 'RCP4.5' ? 2070 : 2100)
    }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_climate.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write CSV data
  const dataPath = outputPath.replace(/\.json$/, '_climate.csv');
  fs.writeFileSync(dataPath, generateCSV(params, rng));

  return {
    filePath: jsonPath,
    dataPath,
    scenario: params.scenario
  };
}

function generateProjections(params: ClimateParams, rng: Xoshiro256StarStar): any {
  const years: any[] = [];
  const baseTemp = 14.0; // °C global average

  for (let y = 2026; y <= 2026 + params.timeHorizon; y += 5) {
    const yearsSince2026 = y - 2026;
    const warmingFactor = params.scenario === 'RCP8.5' ? 0.04 : (params.scenario === 'RCP6.0' ? 0.03 : (params.scenario === 'RCP4.5' ? 0.02 : 0.01));
    const tempIncrease = yearsSince2026 * warmingFactor * rng.nextF64();

    years.push({
      year: y,
      temperature: baseTemp + tempIncrease,
      seaLevelRise: yearsSince2026 * 3.3 * rng.nextF64(), // mm per year
      co2ppm: 420 + yearsSince2026 * (params.scenario === 'RCP8.5' ? 3 : 1.5)
    });
  }

  return {
    globalAverageTemp: baseTemp,
    projections: years,
    uncertainty: rng.nextF64() * 0.5 + 0.1
  };
}

function generateCarbonBudget(params: ClimateParams, rng: Xoshiro256StarStar): any {
  return {
    remainingBudget: (params.scenario === 'RCP2.6' ? 500 : (params.scenario === 'RCP4.5' ? 1000 : 2000)) * 1e9, // tons CO2
    annualEmissions: rng.nextF64() * 50e9, // tons per year
    pathways: ['linear_reduction', 'exponential_reduction', 'net_negative'].slice(0, Math.floor(rng.nextF64() * 3) + 1)
  };
}

function generateExtremes(params: ClimateParams, rng: Xoshiro256StarStar): any {
  return {
    heatwaves: {
      frequency: rng.nextF64() * 5 + 1, // per decade
      intensity: rng.nextF64() * 10 + 35 // °C
    },
    hurricanes: {
      category4Plus: rng.nextF64() * 3, // per decade
      economicLoss: rng.nextF64() * 500e9 // USD
    },
    droughts: {
      affectedArea: rng.nextF64() * 40 + 10, // % of region
      duration: rng.nextF64() * 12 + 1 // months
    }
  };
}

function generateCSV(params: ClimateParams, rng: Xoshiro256StarStar): string {
  const lines = ['Year,Temperature_C,Sea_Level_mm,CO2_ppm,Precipitation_mm'];
  for (let y = 2026; y <= 2026 + params.timeHorizon; y += 5) {
    lines.push(`${y},${14 + rng.nextF64() * 5},${rng.nextF64() * 500},${420 + rng.nextF64() * 200},${800 + rng.nextF64() * 400}`);
  }
  return lines.join('\n');
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): ClimateParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    scenario: seed.genes?.scenario?.value || ['RCP2.6', 'RCP4.5', 'RCP6.0', 'RCP8.5'][rng.nextInt(0, 3)],
    timeHorizon: Math.floor(((seed.genes?.timeHorizon?.value as number || rng.nextF64()) * 74) + 26), // 2026-2100
    region: seed.genes?.region?.value || ['Global', 'Arctic', 'Europe', 'Asia', 'North America'][rng.nextInt(0, 4)],
    resolution: Math.floor(((seed.genes?.resolution?.value as number || rng.nextF64()) * 99) + 1), // 1-100 km
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}

