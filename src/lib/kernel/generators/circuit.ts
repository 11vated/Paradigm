/**
 * Circuit Generator — produces circuit diagrams
 * Generates circuit schematic as SVG
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface CircuitParams {
  type: string;
  components: string[];
  complexity: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateCircuit(seed: Seed, outputPath: string): Promise<{ filePath: string; componentCount: number }> {
  const params = extractParams(seed);

  // Generate SVG schematic
  const svg = generateCircuitSVG(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write SVG
  const svgPath = outputPath.replace(/\.gltf$/, '.svg');
  fs.writeFileSync(svgPath, svg);

  return { filePath: svgPath, componentCount: params.components.length };
}

function generateCircuitSVG(params: CircuitParams): string {
  const width = 800;
  const height = 600;

  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`;
  svg += `<rect width="${width}" height="${height}" fill="#ffffff"/>\n`;
  svg += `<line x1="50" y1="300" x2="750" y2="300" stroke="#000" stroke-width="2"/>\n`;

  let x = 100;
  const y = 300;

  params.components.forEach((comp, i) => {
    if (comp === 'resistor') {
      svg += `<rect x="${x}" y="${y - 15}" width="60" height="30" fill="#f39c12" stroke="#000" stroke-width="1"/>\n`;
      svg += `<text x="${x + 30}" y="${y + 5}" text-anchor="middle" font-size="10">R${i}</text>\n`;
      x += 100;
    } else if (comp === 'capacitor') {
      svg += `<line x1="${x}" y1="${y - 20}" x2="${x}" y2="${y + 20}" stroke="#000" stroke-width="3"/>\n`;
      svg += `<line x1="${x + 20}" y1="${y - 20}" x2="${x + 20}" y2="${y + 20}" stroke="#000" stroke-width="3"/>\n`;
      x += 60;
    } else if (comp === 'inductor') {
      for (let j = 0; j < 3; j++) {
        svg += `<path d="M${x + j * 15} ${y} Q${x + j * 15 + 7.5} ${y - 15} ${x + j * 15 + 15} ${y}" stroke="#000" fill="none"/>\n`;
      }
      x += 70;
    } else {
      // Generic component
      svg += `<rect x="${x}" y="${y - 20}" width="40" height="40" fill="#3498db" stroke="#000" stroke-width="1"/>\n`;
      x += 70;
    }
    x += 20; // Gap between components
  });

  // Labels
  svg += `<text x="400" y="550" text-anchor="middle" font-family="Arial" font-size="16">${params.type} Circuit - Complexity: ${(params.complexity * 100).toFixed(0)}%</text>\n`;

  svg += `</svg>`;
  return svg;
}

function extractParams(seed: Seed): CircuitParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    type: seed.genes?.type?.value || 'analog',
    components: (() => {
      const c = seed.genes?.components?.value || ['resistor', 'capacitor', 'inductor'];
      return Array.isArray(c) ? c : ['resistor', 'capacitor'];
    })(),
    complexity: seed.genes?.complexity?.value || 0.5,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
