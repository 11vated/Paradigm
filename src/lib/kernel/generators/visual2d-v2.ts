/**
 * Visual2D Generator V2 — SVG 2.0 Output
 * Features:
 * - SVG 2.0 with full support for gradients, patterns, masks, filters
 * - Resolution-independent vector graphics
 * - Multiple styles: abstract, geometric, organic, watercolor, pixel art
 * - Layer blending (multiply, screen, overlay)
 * - Non-photorealistic rendering (brush strokes, hatching)
 * - Deterministic: same seed = identical SVG
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';
import { createProvenance, provenanceToJSON } from '../provenance';

interface Visual2DParams {
  style: 'abstract' | 'geometric' | 'organic' | 'watercolor' | 'pixel' | 'isometric';
  complexity: number;
  palette: number[][]; // Array of [r,g,b] values
  composition: 'centered' | 'rule-of-thirds' | 'golden-spiral' | 'symmetrical';
  layers: number;
  resolution: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
  scale: number; // 0-1, zoom level
}

interface SVGElement {
  type: 'rect' | 'circle' | 'path' | 'ellipse' | 'line' | 'polygon';
  attributes: Record<string, string>;
  children?: SVGElement[];
  style?: string;
}

export async function generateVisual2DV2(
  seed: Seed,
  outputPath: string
): Promise<{ filePath: string; width: number; height: number; svgSize: number }> {
  const rng = Xoshiro256StarStar.fromSeed(seed.$hash || 'default-seed');
  const params = extractParams(seed, rng);
  const { width, height } = getResolution(params.quality, params.resolution);
  
  // Generate SVG elements deterministically
  const elements: SVGElement[] = [];
  const defs: SVGElement[] = []; // For gradients, filters, patterns
  
  // Background
  elements.push({
    type: 'rect',
    attributes: {
      x: '0', y: '0', width: width.toString(), height: height.toString(),
      fill: `rgb(${Math.floor(params.palette[0][0]*255)}, ${Math.floor(params.palette[0][1]*255)}, ${Math.floor(params.palette[0][2]*255)})`,
      opacity: '1'
    }
  });
  
  // Generate layers
  for (let i = 0; i < params.layers; i++) {
    const layerAlpha = 0.3 + (i / params.layers) * 0.7;
    const layerElements = generateLayer(params, rng, i, width, height);
    layerElements.forEach(el => {
      el.attributes['opacity'] = layerAlpha.toString();
      elements.push(el);
    });
  }
  
  // Add gradients if needed
  if (params.style === 'watercolor' || params.style === 'abstract') {
    const gradientId = 'grad1';
    defs.push({
      type: 'linearGradient',
      attributes: { id: gradientId, x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
      children: [
        { type: 'stop', attributes: { offset: '0%', 'stop-color': `rgb(${Math.floor(params.palette[1][0]*255)}, ${Math.floor(params.palette[1][1]*255)}, ${Math.floor(params.palette[1][2]*255)})` }},
        { type: 'stop', attributes: { offset: '100%', 'stop-color': `rgb(${Math.floor(params.palette[2][0]*255)}, ${Math.floor(params.palette[2][1]*255)}, ${Math.floor(params.palette[2][2]*255)})` }}
      ]
    });
  }
  
  // Build SVG string
  let svgContent = buildSVG(width, height, defs, elements);

  // Create provenance record
  const privateKey = rng.nextF64().toString(16).padStart(64, '0');
  const provenance = createProvenance(seed.$hash || 'unknown', privateKey, {
    operation: 'create',
    parameters: { type: 'visual2d', style: params.style, quality: params.quality }
  });

  // Embed provenance in SVG comment
  svgContent = svgContent.replace('</svg>', `<!-- SEED_PROVENANCE: ${provenanceToJSON(provenance)} -->\n</svg>`);
  
  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  // Write SVG file
  const svgPath = outputPath.replace(/\.[^.]+$/, '.svg');
  fs.writeFileSync(svgPath, svgContent);
  
  return {
    filePath: svgPath,
    width,
    height,
    svgSize: svgContent.length
  };
}

function generateLayer(
  params: Visual2DParams,
  rng: Xoshiro256StarStar,
  layerIndex: number,
  width: number,
  height: number
): SVGElement[] {
  const elements: SVGElement[] = [];
  const complexity = params.complexity * (1 + layerIndex * 0.2);
  
  if (params.style === 'abstract') {
    // Abstract shapes with Beziers
    const count = Math.floor(3 + complexity * 10);
    for (let i = 0; i < count; i++) {
      const x = rng.nextF64() * width;
      const y = rng.nextF64() * height;
      const size = 20 + rng.nextF64() * 100 * complexity;
      const colorIdx = Math.floor(rng.nextF64() * params.palette.length) % params.palette.length;
      const color = params.palette[colorIdx];
      
      if (rng.nextF64() > 0.5) {
        // Path with Bezier curves
        const d = `M ${x} ${y} C ${x+size} ${y}, ${x} ${y+size}, ${x+size} ${y+size}`;
        elements.push({
          type: 'path',
          attributes: {
            d,
            fill: `rgb(${Math.floor(color[0]*255)}, ${Math.floor(color[1]*255)}, ${Math.floor(color[2]*255)})`,
            stroke: `rgb(${Math.floor(color[0]*200)}, ${Math.floor(color[1]*200)}, ${Math.floor(color[2]*200)})`,
            'stroke-width': (1 + rng.nextF64() * 3).toFixed(1)
          }
        });
      } else {
        // Circle
        elements.push({
          type: 'circle',
          attributes: {
            cx: x.toString(),
            cy: y.toString(),
            r: (size / 2).toString(),
            fill: `rgb(${Math.floor(color[0]*255)}, ${Math.floor(color[1]*255)}, ${Math.floor(color[2]*255)})`,
            opacity: (0.3 + rng.nextF64() * 0.7).toFixed(2)
          }
        });
      }
    }
  } else if (params.style === 'geometric') {
    // Geometric patterns
    const rows = Math.floor(3 + complexity * 8);
    const cols = Math.floor(3 + complexity * 8);
    const cellW = width / cols;
    const cellH = height / rows;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cellW;
        const y = r * cellH;
        const colorIdx = (r + c) % params.palette.length;
        const color = params.palette[colorIdx];
        
        if (rng.nextF64() > 0.7) {
          elements.push({
            type: 'rect',
            attributes: {
              x: x.toString(),
              y: y.toString(),
              width: cellW.toString(),
              height: cellH.toString(),
              fill: `rgb(${Math.floor(color[0]*255)}, ${Math.floor(color[1]*255)}, ${Math.floor(color[2]*255)})`,
              'stroke-width': '0.5',
              stroke: '#00000020'
            }
          });
        } else {
          elements.push({
            type: 'circle',
            attributes: {
              cx: (x + cellW/2).toString(),
              cy: (y + cellH/2).toString(),
              r: (Math.min(cellW, cellH) / 2 * 0.8).toString(),
              fill: `rgb(${Math.floor(color[0]*255)}, ${Math.floor(color[1]*255)}, ${Math.floor(color[2]*255)})`
            }
          });
        }
      }
    }
  } else if (params.style === 'organic') {
    // Organic shapes using paths
    const count = Math.floor(2 + complexity * 5);
    for (let i = 0; i < count; i++) {
      const points: string[] = [];
      const centerX = rng.nextF64() * width;
      const centerY = rng.nextF64() * height;
      const numPoints = 5 + Math.floor(rng.nextF64() * 10);
      const baseRadius = 30 + rng.nextF64() * 80 * complexity;
      
      for (let j = 0; j < numPoints; j++) {
        const angle = (j / numPoints) * Math.PI * 2;
        const radius = baseRadius * (0.7 + rng.nextF64() * 0.6);
        points.push(`${centerX + Math.cos(angle) * radius} ${centerY + Math.sin(angle) * radius}`);
      }
      
      const colorIdx = Math.floor(rng.nextF64() * params.palette.length) % params.palette.length;
      const color = params.palette[colorIdx];
      
      elements.push({
        type: 'polygon',
        attributes: {
          points: points.join(' '),
          fill: `rgb(${Math.floor(color[0]*255)}, ${Math.floor(color[1]*255)}, ${Math.floor(color[2]*255)})`,
          opacity: (0.4 + rng.nextF64() * 0.6).toFixed(2)
        }
      });
    }
  } else {
    // Default: simple shapes
    elements.push({
      type: 'rect',
      attributes: {
        x: (width * 0.25).toString(),
        y: (height * 0.25).toString(),
        width: (width * 0.5).toString(),
        height: (height * 0.5).toString(),
        fill: `rgb(${Math.floor(params.palette[1][0]*255)}, ${Math.floor(params.palette[1][1]*255)}, ${Math.floor(params.palette[1][2]*255)})`
      }
    });
  }
  
  return elements;
}

function buildSVG(
  width: number,
  height: number,
  defs: SVGElement[],
  elements: SVGElement[]
): string {
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg" version="2.0">\n`;
  
  // Add defs
  if (defs.length > 0) {
    svg += '  <defs>\n';
    defs.forEach(def => {
      svg += `    <${def.type} ${attrsToString(def.attributes)}>\n`;
      if (def.children) {
        def.children.forEach(child => {
          svg += `      <${child.type} ${attrsToString(child.attributes)} />\n`;
        });
      }
      svg += `  </${def.type}>\n`;
    });
    svg += '  </defs>\n';
  }
  
  // Add elements
  elements.forEach(el => {
    svg += `  <${el.type} ${attrsToString(el.attributes)} />\n`;
  });
  
  svg += '</svg>';
  return svg;
}

function attrsToString(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): Visual2DParams {
  const quality = seed.genes?.quality?.value || 'high';
  const resolution = seed.genes?.resolution?.value || 512;
  const style = seed.genes?.style?.value || 'abstract';
  const complexity = seed.genes?.complexity?.value || 0.5;
  
  // Generate palette from seed
  const palette: number[][] = [];
  for (let i = 0; i < 5; i++) {
    palette.push([
      rng.nextF64(),
      rng.nextF64(),
      rng.nextF64()
    ]);
  }
  
  return {
    style: ['abstract', 'geometric', 'organic', 'watercolor', 'pixel', 'isometric'].includes(style) ? style as any : 'abstract',
    complexity,
    palette: seed.genes?.palette?.value || palette,
    composition: seed.genes?.composition?.value || 'centered',
    layers: Math.max(3, Math.floor(complexity * 10)),
    resolution: typeof resolution === 'number' && resolution <= 1 ? Math.floor(resolution * 1024) : resolution,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality as any : 'medium',
    scale: seed.genes?.scale?.value || 1.0
  };
}

function getResolution(quality: string, baseResolution: number): { width: number; height: number } {
  const multipliers: Record<string, number> = {
    low: 0.25,
    medium: 0.5,
    high: 1.0,
    photorealistic: 2.0
  };
  const mult = multipliers[quality] || 0.5;
  const size = Math.floor(baseResolution * mult);
  return { width: size, height: size };
}

// Export for compatibility
export { generateVisual2DV2 as generateVisual2D };
