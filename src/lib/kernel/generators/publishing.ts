/**
 * Publishing Generator — produces publishing designs
 * Books, magazines, e-books, academic journals
 * $0.2T market: Publishing
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface PublishingParams {
  format: 'book' | 'magazine' | 'ebook' | 'journal';
  pages: number;
  printRun: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generatePublishing(seed: Seed, outputPath: string): Promise<{ filePath: string; layoutPath: string; format: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    publishing: { format: params.format, pages: params.pages, printRun: params.printRun, quality: params.quality },
    design: { trimSize: params.format === 'book' ? '6x9' : '8.5x11', binding: ['perfect', 'saddle_stitch', 'hardcover', 'spiral'][rng.nextInt(0, 3)], cover: ['paperback', 'hardcover', 'digital'][rng.nextInt(0, 2)] },
    production: { printing: ['digital', 'offset', 'letterpress'][rng.nextInt(0, 2)], paper: ['white', 'cream', 'recycled'][rng.nextInt(0, 2)], ink: rng.nextF64() > 0.5 ? 'color' : 'bw' },
    distribution: { channels: ['retail', 'online', 'direct', 'wholesale'].slice(0, Math.floor(rng.nextF64() * 4) + 1), territories: Math.floor(rng.nextF64() * 100) + 1 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_publishing.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const layoutPath = outputPath.replace(/\.json$/, '_layout.svg');
  fs.writeFileSync(layoutPath, generateSVG(params, rng));

  return { filePath: jsonPath, layoutPath, format: params.format };
}

function generateSVG(params: PublishingParams, rng: Xoshiro256StarStar): string {
  return `<?xml version="1.0"?>
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f5f5f0"/>
  <text x="400" y="30" text-anchor="middle" font-size="20" fill="#333">${params.format} — ${params.pages} pages</text>
  <rect x="250" y="100" width="300" height="400" fill="#fff" stroke="#333" stroke-width="2"/>
  <text x="400" y="320" text-anchor="middle" fill="#333" font-size="16">${params.format.toUpperCase()}</text>
  <text x="400" y="570" text-anchor="middle" font-size="12" fill="#aaa">Paradigm GSPL — Publishing</text>
</svg>`;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): PublishingParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    format: seed.genes?.format?.value || ['book', 'magazine', 'ebook', 'journal'][rng.nextInt(0, 3)],
    pages: Math.floor(((seed.genes?.pages?.value as number || rng.nextF64()) * 990) + 10),
    printRun: Math.floor(((seed.genes?.printRun?.value as number || rng.nextF64()) * 990000) + 10000),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
