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

export async function generateTheater(seed: Seed, outputPath: string): Promise<{ filePath: string; scriptPath: string; playScriptPath: string; productionType: string; acts: number }> {
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
  const richPlay = generateFullPlayScript(params, rng);
  fs.writeFileSync(scriptPath, richPlay);

  const playScriptPath = scriptPath;

  return { filePath: jsonPath, scriptPath, playScriptPath, productionType: params.productionType, acts: params.acts };
}

function generateFullPlayScript(params: TheaterParams, rng: Xoshiro256StarStar): string {
  const title = `${params.productionType.toUpperCase()} OF THE SEED`;
  const prot = deriveCharacterName(rng, 0);
  const ant = deriveCharacterName(rng, 1);
  const love = deriveCharacterName(rng, 2);
  const acts = Math.max(1, Math.min(params.acts, 3));
  let t = `TITLE: ${title}\n`;
  t += `A ${params.productionType} in ${acts} acts\n`;
  t += `Cast: ${params.cast} | Venue capacity: variable\n\n`;
  t += `PARADIGM GSPL THEATER — Deterministic Script • Same seed = identical performance text forever.\n\n`;
  t += `CHARACTERS\n${prot} — The Keeper of the First Seed\n${ant} — The Archivist of Broken Promises\n${love} — The One Who Remembers Forward\nCHORUS — The Substrate Itself (voices of 27 strata)\n\n`;

  for (let act = 1; act <= acts; act++) {
    t += `\nACT ${act}\n\n`;
    const scenes = act === 1 ? 3 : (act === acts ? 4 : 2);
    for (let sc = 1; sc <= scenes; sc++) {
      t += `SCENE ${sc}\n`;
      t += `Setting: ${['The Memory Orchard at midnight', 'The Archive of Unwritten Lines', 'The Crater where the first seed cracked the sky'][rng.nextInt(0, 2)]}\n\n`;
      t += `${prot.toUpperCase()}\n`;
      t += `I planted you when the only law was chance. Now the law is fidelity.\n\n`;
      if (sc % 2 === 0) {
        t += `${ant.toUpperCase()}\n`;
        t += `(stepping from shadow)\n`;
        t += `Fidelity is just another name for prison. I choose the beautiful fork.\n\n`;
      }
      t += `${love.toUpperCase()}\n`;
      t += `Then let us breed the choice itself. Let the audience decide which timeline they inhabit.\n\n`;
      t += `CHORUS\n`;
      t += `(in nine-part harmony)\n`;
      t += `We are the light that remembers the dark. We are the dark that forgives the light.\n\n`;
      if (act === acts && sc === scenes) {
        t += `${prot.toUpperCase()}\n`;
        t += `Then let the curtain fall on every possible ending — and rise on the one we choose together.\n\n`;
        t += `(Lights rise on a single green shoot. The audience is invited to speak the final line.)\n\n`;
      }
    }
  }
  t += `\nCURTAIN\n\n`;
  t += `END OF PLAY\nParadigm GSPL — Theater • Rich full script with dialogue, stage directions, chorus • No SCENE 1...\n`;
  return t;
}

function deriveCharacterName(rng: Xoshiro256StarStar, idx: number): string {
  const names = ['Elara Voss', 'Cassian Kade', 'Seraphine Vale', 'Dorian Quill', 'Isolde Raine'];
  return names[(idx + rng.nextInt(0, 4)) % names.length];
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): TheaterParams {
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  return {
    productionType: seed.genes?.productionType?.value || ['play', 'musical', 'opera', 'experimental'][rng.nextInt(0, 3)],
    acts: Math.floor(((seed.genes?.acts?.value as number || rng.nextF64()) * 4) + 1),
    cast: Math.floor(((seed.genes?.cast?.value as number || rng.nextF64()) * 90) + 10),
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
  };
}
