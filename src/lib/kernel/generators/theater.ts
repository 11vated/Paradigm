/**
 * Theater Generator — produces theater productions
 * Plays, musicals, operas, experimental theater
 * $0.1T market: Theater
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface TheaterParams {
  productionType: 'play' | 'musical' | 'opera' | 'experimental';
  acts: number;
  cast: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateTheater(seed: Seed, outputPath: string): Promise<{ filePath: string; scriptPath: string; productionType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    theater: { productionType: params.productionType, acts: params.acts, cast: params.cast, quality: params.quality },
    setDesign: { scenery: ['realistic', 'minimalist', 'abstract'][rng.nextInt(0, 2)], lighting: rng.nextF64() > 0.3, sound: rng.nextF64() > 0.5 },
    performance: { rehearsals: Math.floor(rng.nextF64() * 40) + 10, previews: Math.floor(rng.nextF64() * 10) + 2, run: Math.floor(rng.nextF64() * 100) + 10 },
    venue: { capacity: Math.floor(rng.nextF64() * 2000) + 200, type: ['proscenium', 'thrust', 'arena'][rng.nextInt(0, 2)] }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_theater.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const scriptPath = outputPath.replace(/\.json$/, '_script.txt');
  fs.writeFileSync(scriptPath, `TITLE: ${params.productionType.toUpperCase()}\n\nACT 1\n\nSCENE 1...\n\nParadigm GSPL — Theater`);

  return { filePath: jsonPath, scriptPath, productionType: params.productionType };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): TheaterParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    productionType: seed.genes?.productionType?.value || ['play', 'musical', 'opera', 'experimental'][rng.nextInt(0, 3)],
    acts: Math.floor(((seed.genes?.acts?.value as number || rng.nextF64()) * 4) + 1),
    cast: Math.floor(((seed.genes?.cast?.value as number || rng.nextF64()) * 90) + 10),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
