/**
 * Pet Care Generator — produces pet care plans
 * Veterinary, grooming, training, boarding
 * $0.3T market: Pet Care Industry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface PetCareParams {
  petType: 'dog' | 'cat' | 'bird' | 'fish' | 'reptile';
  service: 'veterinary' | 'grooming' | 'training' | 'boarding';
  duration: number; // days
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generatePetCare(seed: Seed, outputPath: string): Promise<{ filePath: string; planPath: string; service: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    petCare: { petType: params.petType, service: params.service, duration: params.duration, quality: params.quality },
    services: { examination: rng.nextF64() > 0.5, vaccination: rng.nextF64() > 0.3, surgery: rng.nextF64() > 0.7, grooming: params.service === 'grooming' },
    staff: { veterinarians: Math.floor(rng.nextF64() * 5) + 1, technicians: Math.floor(rng.nextF64() * 10) + 2, groomers: params.service === 'grooming' ? Math.floor(rng.nextF64() * 3) + 1 : 0 },
    economics: { consultation: rng.nextF64() * 200 + 50, daycare: rng.nextF64() * 50 + 15, boarding: rng.nextF64() * 100 + 30 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_petcare.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const planPath = outputPath.replace(/\.json$/, '_plan.md');
  fs.writeFileSync(planPath, generateMD(params, rng));

  return { filePath: jsonPath, planPath, service: params.service };
}

function generateMD(params: PetCareParams, rng: Xoshiro256StarStar): string {
  return `# ${params.service.charAt(0).toUpperCase() + params.service.slice(1)} for ${params.petType.charAt(0).toUpperCase() + params.petType.slice(1)}s\n\n**Duration:** ${params.duration} days\n\n## Services\n- Examination\n- Vaccination\n\n*Paradigm GSPL — Pet Care*`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): PetCareParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    petType: seed.genes?.petType?.value || ['dog', 'cat', 'bird', 'fish', 'reptile'][rng.nextInt(0, 4)],
    service: seed.genes?.service?.value || ['veterinary', 'grooming', 'training', 'boarding'][rng.nextInt(0, 3)],
    duration: Math.floor(((seed.genes?.duration?.value as number || rng.nextF64()) * 27) + 1),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
