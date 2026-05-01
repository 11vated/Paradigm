/**
 * Robotics Generator — produces robot schematics
 * Generates robot blueprint as SVG
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface RoboticsParams {
  type: string;
  dof: number;
  payload: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateRobotics(seed: Seed, outputPath: string): Promise<{ filePath: string; type: string }> {
  const params = extractParams(seed);

  // Generate SVG schematic
  const svg = generateRobotSVG(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write SVG
  const svgPath = outputPath.replace(/\.gltf$/, '.svg');
  fs.writeFileSync(svgPath, svg);

  return { filePath: svgPath, type: params.type };
}

function generateRobotSVG(params: RoboticsParams): string {
  const width = 600;
  const height = 500;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `<rect width="${width}" height="${height}" fill="#ecf0f1"/>\n`;

  const cx = width / 2;
  const cy = height / 2;

  // Base
  svg += `<rect x="${cx - 80}" y="${cy + 100}" width="160" height="30" fill="#7f8c8d"/>\n`;

  // Body
  svg += `<rect x="${cx - 40}" y="${cy - 50}" width="80" height="150" fill="#3498db"/>\n`;

  // Head
  svg += `<circle cx="${cx}" cy="${cy - 80}" r="30" fill="#2980b9"/>\n`;

  // Arms based on DOF
  const armCount = Math.min(params.dof, 6);
  for (let i = 0; i < armCount; i++) {
    const angle = (i / armCount) * Math.PI * 2;
    const ax = cx + Math.cos(angle) * 60;
    const ay = cy + Math.sin(angle) * 60;
    svg += `<line x1="${cx}" y1="${cy}" x2="${ax}" y2="${ay}" stroke="#2c3e50" stroke-width="8"/>\n`;
    svg += `<circle cx="${ax}" cy="${ay}" r="10" fill="#e74c3c"/>\n`;
  }

  // Label
  svg += `<text x="${cx}" y="${cy + 180}" text-anchor="middle" font-family="Arial" font-size="14">`;
  svg += `${params.type} Robot - DOF: ${params.dof} - Payload: ${params.payload}kg`;
  svg += `</text>\n`;

  svg += `</svg>`;
  return svg;
}

function extractParams(seed: Seed): RoboticsParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    type: seed.genes?.type?.value || 'manipulator',
    dof: seed.genes?.dof?.value || 6,
    payload: seed.genes?.payload?.value || 10,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
