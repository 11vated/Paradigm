/**
 * Furniture Generator — produces furniture schematics
 * Generates furniture blueprint as SVG
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface FurnitureParams {
  type: string;
  dimensions: [number, number, number];
  style: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFurniture(seed: Seed, outputPath: string): Promise<{ filePath: string; type: string }> {
  const params = extractParams(seed);

  // Generate SVG blueprint
  const svg = generateFurnitureSVG(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write SVG
  const svgPath = outputPath.replace(/\.gltf$/, '.svg');
  fs.writeFileSync(svgPath, svg);

  return { filePath: svgPath, type: params.type };
}

function generateFurnitureSVG(params: FurnitureParams): string {
  const width = 600;
  const height = 500;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `<rect width="${width}" height="${height}" fill="#fafafa"/>\n`;

  const cx = width / 2;
  const cy = height / 2;

  if (params.type === 'chair') {
    // Seat
    svg += `<rect x="${cx - 60}" y="${cy - 10}" width="120" height="20" fill="#8b4513"/>\n`;
    // Back
    svg += `<rect x="${cx - 60}" y="${cy - 80}" width="20" height="70" fill="#8b4513"/>\n`;
    // Legs
    [[-50, 10], [50, 10], [-50, -30], [50, -30]].forEach(([dx, dy]) => {
      svg += `<rect x="${cx + dx}" y="${cy + dy}" width="10" height="40" fill="#654321"/>\n`;
    });
  } else if (params.type === 'table') {
    // Table top
    svg += `<rect x="${cx - 100}" y="${cy - 10}" width="200" height="20" fill="#d2691e"/>\n`;
    // Legs
    [[-80, 10], [80, 10], [-80, -40], [80, -40]].forEach(([dx, dy]) => {
      svg += `<rect x="${cx + dx}" y="${cy + dy}" width="15" height="60" fill="#8b4513"/>\n`;
    });
  } else {
    // Generic furniture
    svg += `<rect x="${cx - 80}" y="${cy - 40}" width="160" height="80" fill="#a0522d" stroke="#654321" stroke-width="2"/>\n`;
  }

  // Dimensions label
  svg += `<text x="${cx}" y="${cy + 80}" text-anchor="middle" font-family="Arial" font-size="14">`;
  svg += `${params.type} - ${params.dimensions[0]}x${params.dimensions[1]}x${params.dimensions[2]}cm - ${params.style}`;
  svg += `</text>\n`;

  svg += `</svg>`;
  return svg;
}

function extractParams(seed: Seed): FurnitureParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    type: seed.genes?.type?.value || 'chair',
    dimensions: (() => {
      const d = seed.genes?.dimensions?.value || [60, 60, 80];
      return Array.isArray(d) && d.length === 3 ? [d[0], d[1], d[2]] : [60, 60, 80];
    })(),
    style: seed.genes?.style?.value || 'modern',
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
