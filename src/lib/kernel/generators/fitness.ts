/**
 * Fitness Generator — produces fitness programs
 * Gym workouts, yoga, cardio, personal training
 * $0.3T market: Fitness Industry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface FitnessParams {
  programType: 'gym' | 'yoga' | 'cardio' | 'hiit' | 'pilates';
  duration: number; // weeks
  sessions: number; // per week
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFitness(seed: Seed, outputPath: string): Promise<{ filePath: string; planPath: string; programType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    fitness: { programType: params.programType, duration: params.duration, sessions: params.sessions, quality: params.quality },
    workouts: Array.from({ length: params.sessions * params.duration }, (_, i) => ({ week: Math.floor(i / params.sessions) + 1, type: ['strength', 'cardio', 'flexibility'][rng.nextInt(0, 2)], duration: rng.nextF64() * 60 + 30 })),
    equipment: ['dumbbells', 'barbell', 'mat', 'resistance_bands'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    economics: { membership: rng.nextF64() * 200 + 30, personalTraining: rng.nextF64() * 100 + 50, retention: rng.nextF64() * 0.3 + 0.7 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_fitness.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const planPath = outputPath.replace(/\.json$/, '_plan.md');
  fs.writeFileSync(planPath, generateMD(params, rng));

  return { filePath: jsonPath, planPath, programType: params.programType };
}

function generateMD(params: FitnessParams, rng: Xoshiro256StarStar): string {
  return `# ${params.programType.charAt(0).toUpperCase() + params.programType.slice(1)} Program\n\n**Duration:** ${params.duration} weeks\n**Sessions/week:** ${params.sessions}\n\n## Week 1\n- Workout 1: Strength\n- Workout 2: Cardio\n\n*Paradigm GSPL — Fitness*`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): FitnessParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    programType: seed.genes?.programType?.value || ['gym', 'yoga', 'cardio', 'hiit', 'pilates'][rng.nextInt(0, 4)],
    duration: Math.floor(((seed.genes?.duration?.value as number || rng.nextF64()) * 48) + 4),
    sessions: Math.floor(((seed.genes?.sessions?.value as number || rng.nextF64()) * 6) + 1),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
