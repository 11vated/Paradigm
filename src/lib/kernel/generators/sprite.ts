/**
 * Sprite Generator — produces sprite sheets from seed genes
 * Creates pixel art sprites with animation frames
 * NOW WITH: Pixel art algorithms, dithering, multiple body types
 */

import type { Seed } from '../engines';
import { generateSpriteV2 } from './sprite-v2';

interface SpriteParams {
  resolution: number;
  paletteSize: number;
  colors: number[];
  symmetry: string;
  animations: string[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateSprite(seed: Seed, outputPath: string): Promise<{ filePath: string; width: number; height: number; frames: number }> {
  // Use world-class V2 generator
  const result = await generateSpriteV2(seed, outputPath);

  return {
    filePath: result.filePath,
    width: result.width,
    height: result.height,
    frames: result.frames
  };
}
