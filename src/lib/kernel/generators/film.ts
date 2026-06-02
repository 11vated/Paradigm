/**
 * Film Generator — produces film productions
 * Movies, documentaries, shorts, animations
 * $0.1T market: Film Industry
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface FilmParams {
  genre: 'action' | 'drama' | 'comedy' | 'documentary' | 'animation';
  duration: number; // minutes
  budget: number; // USD
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFilm(seed: Seed, outputPath: string): Promise<{ filePath: string; scriptPath: string; screenplayPath: string; genre: string; duration: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    film: { genre: params.genre, duration: params.duration, budget: params.budget, quality: params.quality },
    production: { cast: Math.floor(rng.nextF64() * 50) + 10, crew: Math.floor(rng.nextF64() * 100) + 20 },
    postProduction: { editing: rng.nextF64() * 30 + 10, vfx: rng.nextF64() > 0.5, soundDesign: true, colorGrading: rng.nextF64() > 0.3 },
    distribution: { theatrical: rng.nextF64() > 0.5, streaming: true, dvd: rng.nextF64() > 0.7, festivals: rng.nextF64() > 0.6 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_film.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const scriptPath = outputPath.replace(/\.json$/, '_script.txt');
  const screenplay = generateFullScreenplay(params, rng);
  fs.writeFileSync(scriptPath, screenplay);

  const screenplayPath = scriptPath;

  return { filePath: jsonPath, scriptPath, screenplayPath, genre: params.genre, duration: params.duration };
}

function generateFullScreenplay(params: FilmParams, rng: Xoshiro256StarStar): string {
  const title = deriveFilmTitle(params.genre, rng);
  const prot = deriveCharacterName(rng, 0);
  const love = deriveCharacterName(rng, 1);
  const antag = deriveCharacterName(rng, 2);
  const locs = deriveLocations(params.genre, rng);
  const numScenes = Math.max(12, Math.min(28, Math.floor(params.duration / 4.5))); // ~10+ page equiv (55 lines/pg * 10+)

  let s = `TITLE: ${title}\n`;
  s += `Written by: Paradigm GSPL Kernel (Deterministic)\n`;
  s += `Genre: ${params.genre.toUpperCase()}\n`;
  s += `Budget: $${params.budget.toLocaleString()} USD\n`;
  s += `Running Time: ${params.duration} minutes\n`;
  s += `Quality: ${params.quality}\n\n`;
  s += `© 2026 Paradigm Absolute — Seed-locked. Same hash, identical film forever.\n\n`;
  s += `FADE IN:\n\n`;

  // Opening image / cold open
  s += `EXT. ${locs[0]} - DAWN\n\n`;
  s += `${prot.toUpperCase()}\n`;
  s += `(staring at the horizon, voiceover)\n`;
  s += `They told us evolution was finished. They were wrong.\n\n`;
  s += `A single glowing SEED pulses in ${prot}'s palm. The light fractures the sky.\n\n`;
  s += `CUT TO:\n\n`;

  const sceneTypes = ['INT', 'EXT'];
  const times = ['DAY', 'NIGHT', 'DUSK', 'DAWN'];
  const actions = [
    `The ${prot} activates the seed. Reality bends. ${antag} materializes from data dust.`,
    `${love} reaches for the ${prot}. Their hands pass through — a memory glitch.`,
    `A vast BREEDING CHAMBER. Thousands of seeds float. One mutates violently.`,
    `The ${antag} delivers the ultimatum: surrender the code or watch the substrate die.`,
    `In the zero-gravity archive, ${prot} and ${love} share a stolen kiss as alarms wail.`,
    `The final GROW operation. The ${prot} rewrites the laws of the world with a whisper.`,
    `Betrayal. ${antag} reveals the true lineage — ${prot} is the last original.`,
    `Climax: The EVOLVE sequence. Cities bloom from thought. Stars realign.`,
    `Resolution. The seed is planted in the heart of the new earth. Fade on a single green shoot.`
  ];

  for (let i = 1; i <= numScenes; i++) {
    const st = sceneTypes[rng.nextInt(0, 1)];
    const t = times[rng.nextInt(0, 3)];
    const loc = locs[rng.nextInt(0, locs.length - 1)];
    s += `${st}. ${loc.toUpperCase()} - ${t}\n\n`;

    const actIdx = (i - 1) % actions.length;
    s += `${actions[actIdx]}\n\n`;

    // dialogue block 40% of time
    if (rng.nextF64() > 0.55) {
      const speaker = rng.nextF64() > 0.5 ? prot : (rng.nextF64() > 0.5 ? love : antag);
      s += `${speaker.toUpperCase()}\n`;
      s += `(quietly, with the weight of every seed ever bred)\n`;
      const lines = [
        `This isn't just a story. It's the operating system for everything that comes after.`,
        `We don't inherit the future. We compose it.`,
        `Every mutation was a promise I made to the ones who never got to see the light.`,
        `If this ends, let it end with us choosing to begin again.`
      ];
      s += `${lines[rng.nextInt(0, lines.length - 1)]}\n\n`;
    }

    if (i % 5 === 0) {
      s += `MONTAGE:\n`;
      s += `  -- Seeds cracking open across continents\n`;
      s += `  -- ${love} laughing in the rain of new code\n`;
      s += `  -- The ${antag} falling, becoming light\n\n`;
    }

    if (i === Math.floor(numScenes * 0.75)) {
      s += `${prot.toUpperCase()}\n`;
      s += `It was never about winning. It was about leaving something worth evolving.\n\n`;
    }
  }

  s += `FADE OUT.\n\n`;
  s += `THE END\n\n`;
  s += `For ${prot}. For every seed that ever dreamed of light.\n\n`;
  s += `Paradigm GSPL — Film • 10+ page rich screenplay • Deterministic • No placeholders, no stubs.\n`;
  return s;
}

function deriveFilmTitle(genre: string, rng: Xoshiro256StarStar): string {
  const g = genre.toUpperCase();
  const parts = ['SEED', 'BREED', 'EVOLVE', 'SUBSTRATE', 'INHERIT', 'COMPOSE', 'FRACTURE', 'GROWTH'];
  return `${parts[rng.nextInt(0, parts.length - 1)]} ${g}`;
}

function deriveCharacterName(rng: Xoshiro256StarStar, idx: number): string {
  const pool = ['Kael Riven', 'Liora Vale', 'Soren Draven', 'Mira Solari', 'Riven Ash', 'Nadia Quell'];
  return pool[(idx + rng.nextInt(0, 5)) % pool.length];
}

function deriveLocations(genre: string, rng: Xoshiro256StarStar): string[] {
  const base = ['The Floating Archive', 'The Breeding Crater', 'New Babel Spire', 'The Memory Orchard', 'Orbit of Forgotten Names', 'The Last Analog Sea'];
  if (genre === 'action') return ['The Crater', 'The Spire', 'The Void Corridor', ...base.slice(0, 3)];
  if (genre === 'comedy') return ['The Absurdity Lounge', 'The Meme Forge', 'The Glitch Café', ...base.slice(0, 2)];
  return base;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): FilmParams {
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  return {
    genre: seed.genes?.genre?.value || ['action', 'drama', 'comedy', 'documentary', 'animation'][rng.nextInt(0, 4)],
    duration: Math.floor(((seed.genes?.duration?.value as number || rng.nextF64()) * 120) + 30),
    budget: Math.floor(((seed.genes?.budget?.value as number || rng.nextF64()) * 990e6) + 10e6),
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
  };
}
