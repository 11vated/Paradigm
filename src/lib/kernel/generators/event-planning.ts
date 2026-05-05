/**
 * Event Planning Generator — produces event designs
 * Weddings, conferences, exhibitions, parties
 * $0.3T market: Event Planning
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface EventPlanningParams {
  eventType: 'wedding' | 'conference' | 'exhibition' | 'party';
  guests: number;
  duration: number; // hours
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateEventPlanning(seed: Seed, outputPath: string): Promise<{ filePath: string; planPath: string; eventType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    eventPlanning: { eventType: params.eventType, guests: params.guests, duration: params.duration, quality: params.quality },
    venue: { type: ['hotel', 'garden', 'convention_center', 'beach'][rng.nextInt(0, 3)], capacity: params.guests * 1.2, layout: ['theater', 'banquet', 'cocktail'][rng.nextInt(0, 2)] },
    services: { catering: rng.nextF64() > 0.3, decoration: rng.nextF64() > 0.5, entertainment: rng.nextF64() > 0.5, photography: rng.nextF64() > 0.3 },
    economics: { budget: params.guests * rng.nextF64() * 200 + 5000, perHead: rng.nextF64() * 200 + 50, vendors: Math.floor(rng.nextF64() * 20) + 5 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_event.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const planPath = outputPath.replace(/\.json$/, '_plan.md');
  fs.writeFileSync(planPath, generateMD(params, rng));

  return { filePath: jsonPath, planPath, eventType: params.eventType };
}

function generateMD(params: EventPlanningParams, rng: Xoshiro256StarStar): string {
  return `# ${params.eventType.charAt(0).toUpperCase() + params.eventType.slice(1)} Plan\n\n**Guests:** ${params.guests}\n**Duration:** ${params.duration} hours\n\n## Venue\n${['Hotel', 'Garden', 'Convention Center'][rng.nextInt(0, 2)]}\n\n## Services\n- Catering\n- Decoration\n\n*Paradigm GSPL — Event Planning*`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): EventPlanningParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    eventType: seed.genes?.eventType?.value || ['wedding', 'conference', 'exhibition', 'party'][rng.nextInt(0, 3)],
    guests: Math.floor(((seed.genes?.guests?.value as number || rng.nextF64()) * 9900) + 100),
    duration: Math.floor(((seed.genes?.duration?.value as number || rng.nextF64()) * 22) + 2),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
