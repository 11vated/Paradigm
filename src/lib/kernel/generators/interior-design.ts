/**
 * Interior Design Generator — produces interior designs
 * Residential, office, hospitality, retail interiors
 * $0.4T market: Interior Design
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface InteriorDesignParams {
  spaceType: 'living_room' | 'bedroom' | 'office' | 'restaurant';
  style: string;
  area: number; // sq meters
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateInteriorDesign(seed: Seed, outputPath: string): Promise<{ filePath: string; renderPath: string; spaceType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    interiorDesign: { spaceType: params.spaceType, style: params.style, area: params.area, quality: params.quality },
    layout: generateLayout(params, rng),
    furniture: generateFurniture(params, rng),
    colorScheme: { primary: `rgb(${rng.nextInt(0,255)},${rng.nextInt(0,255)},${rng.nextInt(0,255)})`, accent: `rgb(${rng.nextInt(0,255)},${rng.nextInt(0,255)},${rng.nextInt(0,255)})` }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_interior.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const renderPath = outputPath.replace(/\.json$/, '_render.svg');
  fs.writeFileSync(renderPath, generateSVG(params, rng));

  return { filePath: jsonPath, renderPath, spaceType: params.spaceType };
}

function generateLayout(params: InteriorDesignParams, rng: Xoshiro256StarStar): any {
  return {
    zones: ['seating', 'dining', 'work', 'storage'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    flow: ['open', 'semi_open', 'compartmentalized'][rng.nextInt(0, 2)],
    focalPoint: ['fireplace', 'window', 'artwork', 'tv'][rng.nextInt(0, 3)]
  };
}

function generateFurniture(params: InteriorDesignParams, rng: Xoshiro256StarStar): any {
  return {
    pieces: Array.from({ length: Math.floor(rng.nextF64() * 10) + 3 }, (_, i) => ({
      name: `Piece ${i+1}`,
      type: ['sofa', 'table', 'chair', 'lamp', 'shelf'][rng.nextInt(0, 4)],
      material: ['wood', 'metal', 'fabric', 'leather'][rng.nextInt(0, 3)]
    }))
  };
}

function generateSVG(params: InteriorDesignParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${`rgb(${rng.nextInt(200,255)},${rng.nextInt(200,255)},${rng.nextInt(200,255)})`}"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="#333">${params.style} — ${params.spaceType}</text>
  ${Array.from({ length: 6 }, (_, i) => `<rect x="${150+i%3*180}" y="${100+Math.floor(i/3)*200}" width="150" height="150" fill="#fff" stroke="#333" stroke-width="1"/>`).join('\n  ')}
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Interior Design</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): InteriorDesignParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const styles = ['scandinavian', 'industrial', 'mid_century_modern', 'bohemian', 'contemporary', 'traditional'];
  return {
    spaceType: seed.genes?.spaceType?.value || ['living_room', 'bedroom', 'office', 'restaurant'][rng.nextInt(0, 3)],
    style: seed.genes?.style?.value || styles[rng.nextInt(0, styles.length - 1)],
    area: Math.floor(((seed.genes?.area?.value as number || rng.nextF64()) * 990) + 10),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
