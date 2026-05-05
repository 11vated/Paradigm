/**
 * Universe Generator — produces universe simulation config
 * 100+ domains: universe, galaxy, star, planet, civilization
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface UniverseParams {
  size: 'small' | 'medium' | 'large' | 'observable';
  age: number; // billion years
  curvature: number; // -1 to 1
  darkMatter: number; // 0 to 1
  expansionRate: number; // Hubble constant
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateUniverse(seed: Seed, outputPath: string): Promise<{ filePath: string; galaxyCount: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    universe: {
      size: params.size,
      age: params.age,
      curvature: params.curvature,
      darkMatter: params.darkMatter,
      expansionRate: params.expansionRate,
      quality: params.quality
    },
    galaxies: generateGalaxies(params, rng),
    physics: {
      constants: {
        G: 6.67430e-11,
        c: 299792458,
        h: params.expansionRate,
        omega_m: 0.315,
        omega_lambda: 0.685
      }
    },
    initialConditions: generateInitialConditions(params, rng)
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.json$/, '_universe.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  return {
    filePath: jsonPath,
    galaxyCount: config.galaxies.length
  };
}

function generateGalaxies(params: UniverseParams, rng: Xoshiro256StarStar): any[] {
  const sizes: Record<string, number> = {
    small: 100,
    medium: 1000,
    large: 10000,
    observable: 2000000000 // 2 trillion
  };
  const count = sizes[params.size] || 1000;
  const galaxies = [];

  for (let i = 0; i < Math.min(count, 10000); i++) {
    galaxies.push({
      id: `galaxy_${i}`,
      type: ['spiral', 'elliptical', 'irregular'][rng.nextInt(0, 2)],
      mass: rng.nextF64() * 1e12 + 1e9, // solar masses
      position: [
        (rng.nextF64() - 0.5) * 1000,
        (rng.nextF64() - 0.5) * 1000,
        (rng.nextF64() - 0.5) * 1000
      ],
      velocity: [
        (rng.nextF64() - 0.5) * 500,
        (rng.nextF64() - 0.5) * 500,
        (rng.nextF64() - 0.5) * 500
      ],
      stars: Math.floor(rng.nextF64() * 1e11),
      planets: Math.floor(rng.nextF64() * 1000)
    });
  }

  return galaxies;
}

function generateInitialConditions(params: UniverseParams, rng: Xoshiro256StarStar): any {
  return {
    temperature: 2.725, // CMB temperature (K)
    density: 9.9e-27, // kg/m^3
    fluctuations: Array.from({ length: 100 }, () => rng.nextF64() * 1e-5)
  };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): UniverseParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    size: seed.genes?.size?.value || 'observable',
    age: typeof seed.genes?.age?.value === 'number' ? seed.genes.age.value * 13.8 : 13.8,
    curvature: typeof seed.genes?.curvature?.value === 'number' ? (seed.genes.curvature.value * 2) - 1 : 0,
    darkMatter: seed.genes?.darkMatter?.value || 0.265,
    expansionRate: seed.genes?.expansionRate?.value || 67.4,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
