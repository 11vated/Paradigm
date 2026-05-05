/**
 * Art Generator — produces art pieces
 * Paintings, sculptures, digital art, NFTs
 * $0.5T market: Art & Collectibles
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface ArtParams {
  medium: 'painting' | 'sculpture' | 'digital' | 'photography';
  style: string;
  dimensions: { width: number; height: number };
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateArt(seed: Seed, outputPath: string): Promise<{ filePath: string; imagePath: string; medium: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    art: { medium: params.medium, style: params.style, dimensions: params.dimensions, quality: params.quality },
    composition: generateComposition(params, rng),
    colors: generateColors(params, rng),
    pricing: { estimate: rng.nextF64() * 1000000 + 1000, insurance: rng.nextF64() * 100000, provenance: rng.nextF64() > 0.5 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_art.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const imagePath = outputPath.replace(/\.json$/, '_art.svg');
  fs.writeFileSync(imagePath, generateSVG(params, rng));

  return { filePath: jsonPath, imagePath, medium: params.medium };
}

function generateComposition(params: ArtParams, rng: Xoshiro256StarStar): any {
  return {
    focalPoint: [rng.nextF64(), rng.nextF64()],
    balance: ['symetrical', 'asymetrical', 'radial'][rng.nextInt(0, 2)],
    elements: Math.floor(rng.nextF64() * 20) + 5,
    technique: ['oil', 'acrylic', 'watercolor', 'digital'][rng.nextInt(0, 3)]
  };
}

function generateColors(params: ArtParams, rng: Xoshiro256StarStar): any {
  return {
    palette: Array.from({ length: 5 }, () => `rgb(${rng.nextInt(0,255)},${rng.nextInt(0,255)},${rng.nextInt(0,255)})`),
    dominant: `rgb(${rng.nextInt(0,255)},${rng.nextInt(0,255)},${rng.nextInt(0,255)})`,
    mood: ['warm', 'cool', 'neutral', 'vibrant'][rng.nextInt(0, 3)]
  };
}

function generateSVG(params: ArtParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${`rgb(${rng.nextInt(200,255)},${rng.nextInt(200,255)},${rng.nextInt(200,255)})`}"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="#333">${params.style} — ${params.medium}</text>
  ${Array.from({ length: 10 }, (_, i) => `<circle cx="${rng.nextF64()*700+50}" cy="${rng.nextF64()*400+80}" r="${rng.nextF64()*50+10}" fill="rgb(${rng.nextInt(0,255)},${rng.nextInt(0,255)},${rng.nextInt(0,255)})" opacity="0.7"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Art</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): ArtParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const styles = ['impressionism', 'cubism', 'surrealism', 'minimalism', 'abstract', 'pop_art'];
  return {
    medium: seed.genes?.medium?.value || ['painting', 'sculpture', 'digital', 'photography'][rng.nextInt(0, 3)],
    style: seed.genes?.style?.value || styles[rng.nextInt(0, styles.length - 1)],
    dimensions: { width: Math.floor(rng.nextF64() * 200) + 20, height: Math.floor(rng.nextF64() * 200) + 20 },
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
