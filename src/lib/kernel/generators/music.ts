/**
 * Music Generator — produces music compositions
 * Classical, jazz, electronic, pop, soundtracks
 * NOW WITH: Multi-track, actual audio synthesis, music theory
 */

import type { Seed } from '../engines';
import { generateMusicV2 } from './music-v2';

export async function generateMusic(seed: Seed, outputPath: string): Promise<{ filePath: string; scorePath: string; genre: string }> {
  // Use world-class V2 generator
  const result = await generateMusicV2(seed, outputPath);

  return {
    filePath: result.filePath,
    scorePath: result.scorePath,
    genre: result.genre
  };
}
