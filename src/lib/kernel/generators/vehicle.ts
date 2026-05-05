/**
 * Vehicle Generator — produces vehicle schematics
 * Generates vehicle blueprint as SVG
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface VehicleParams {
  type: string;
  speed: number;
  capacity: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateVehicle(seed: Seed, outputPath: string): Promise<{ filePath: string; type: string }> {
  const params = extractParams(seed);

  // Generate SVG schematic
  const svg = generateVehicleSVG(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write SVG
  const svgPath = outputPath.replace(/\.gltf$/, '.svg');
  fs.writeFileSync(svgPath, svg);

  return { filePath: svgPath, type: params.type };
}

function generateVehicleSVG(params: VehicleParams): string {
  const width = 600;
  const height = 400;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `<rect width="${width}" height="${height}" fill="#f0f0f0"/>\n`;

  // Draw vehicle based on type
  const cx = width / 2;
  const cy = height / 2;

  if (params.type === 'car') {
    // Car body
    svg += `<rect x="${cx - 150}" y="${cy - 30}" width="300" height="60" fill="#e74c3c" rx="10"/>\n`;
    // Roof
    svg += `<rect x="${cx - 80}" y="${cy - 60}" width="160" height="40" fill="#c0392b" rx="5"/>\n`;
    // Wheels
    svg += `<circle cx="${cx - 100}" cy="${cy + 35}" r="25" fill="#333"/>\n`;
    svg += `<circle cx="${cx + 100}" cy="${cy + 35}" r="25" fill="#333"/>\n`;
  } else if (params.type === 'bike') {
    // Frame
    svg += `<line x1="${cx - 80}" y1="${cy}" x2="${cx + 80}" y2="${cy}" stroke="#333" stroke-width="5"/>\n`;
    // Wheels
    svg += `<circle cx="${cx - 80}" cy="${cy}" r="40" fill="none" stroke="#333" stroke-width="5"/>\n`;
    svg += `<circle cx="${cx + 80}" cy="${cy}" r="40" fill="none" stroke="#333" stroke-width="5"/>\n`;
  } else {
    // Generic vehicle
    svg += `<ellipse cx="${cx}" cy="${cy}" rx="150" ry="50" fill="#3498db"/>\n`;
    svg += `<ellipse cx="${cx}" cy="${cy}" rx="100" ry="30" fill="#2980b9"/>\n`;
  }

  // Labels
  svg += `<text x="${cx}" y="${cy + 80}" text-anchor="middle" font-family="Arial" font-size="16">${params.type.toUpperCase()} - Speed: ${params.speed} - Capacity: ${params.capacity}</text>\n`;

  svg += `</svg>`;
  return svg;
}

function extractParams(seed: Seed): VehicleParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    type: seed.genes?.type?.value || 'car',
    speed: seed.genes?.speed?.value || 100,
    capacity: seed.genes?.capacity?.value || 4,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
