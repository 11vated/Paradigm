/**
 * Architecture Generator — produces building plans
 * Generates architectural layouts as SVG
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface ArchitectureParams {
  buildingType: string;
  floors: number;
  style: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateArchitecture(seed: Seed, outputPath: string): Promise<{ filePath: string; floors: number }> {
  const params = extractParams(seed);

  // Generate SVG floor plan
  const svg = generateBuildingSVG(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write SVG
  const svgPath = outputPath.replace(/\.gltf$/, '.svg');
  fs.writeFileSync(svgPath, svg);

  return { filePath: svgPath, floors: params.floors };
}

function generateBuildingSVG(params: ArchitectureParams): string {
  const width = 800;
  const height = 600;
  const floorHeight = 80;
  const buildingWidth = 400;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `<rect width="${width}" height="${height}" fill="#e8e8e8"/>\n`;

  // Draw building
  const startX = (width - buildingWidth) / 2;
  let y = height - 50;

  for (let floor = 0; floor < params.floors; floor++) {
    // Floor rectangle
    svg += `<rect x="${startX}" y="${y - floorHeight}" width="${buildingWidth}" height="${floorHeight}" `;
    svg += `fill="${floor % 2 === 0 ? '#4a90e2' : '#357abd'}" stroke="#2c5aa0" stroke-width="2"/>\n`;

    // Windows
    const windowCount = 6;
    const windowWidth = 40;
    const windowSpacing = (buildingWidth - windowCount * windowWidth) / (windowCount + 1);

    for (let w = 0; w < windowCount; w++) {
      const wx = startX + windowSpacing + w * (windowWidth + windowSpacing);
      const wy = y - floorHeight + 20;
      svg += `<rect x="${wx}" y="${wy}" width="${windowWidth}" height="30" fill="#f5d742" opacity="0.8"/>\n`;
    }

    y -= floorHeight;
  }

  // Roof
  svg += `<polygon points="${startX},${y} ${startX + buildingWidth},${y} ${startX + buildingWidth/2},${y - 60}" `;
  svg += `fill="#8b4513" stroke="#654321" stroke-width="2"/>\n`;

  svg += `</svg>`;
  return svg;
}

function extractParams(seed: Seed): ArchitectureParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    buildingType: seed.genes?.building_type?.value || 'residential',
    floors: typeof seed.genes?.floors?.value === 'number' ? seed.genes.floors.value : 3,
    style: seed.genes?.style?.value || 'modern',
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
