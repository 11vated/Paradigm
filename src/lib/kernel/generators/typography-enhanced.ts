/**
 * Typography Generator — produces SVG/Variable font text
 * Enhanced with OpenType variable fonts and SVG rendering
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface TypographyParams {
  fontFamily: string;
  weight: number;
  style: string;
  size: number;
  text: string;
  variableAxes: Record<string, number>;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateTypographyEnhanced(seed: Seed, outputPath: string): Promise<{ filePath: string; svgPath: string; fontPath: string }> {
  const params = extractParams(seed);

  // Generate SVG text rendering
  const svg = generateSVGText(params);

  // Generate variable font CSS
  const fontCSS = generateVariableFontCSS(params);

  // Generate font specimen sheet
  const specimen = generateFontSpecimen(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write SVG file
  const svgPath = outputPath.replace(/\.json$/, '.svg');
  fs.writeFileSync(svgPath, svg);

  // Write font CSS file
  const cssPath = outputPath.replace(/\.json$/, '_font.css');
  fs.writeFileSync(cssPath, fontCSS);

  // Write specimen sheet
  const specimenPath = outputPath.replace(/\.json$/, '_specimen.html');
  fs.writeFileSync(specimenPath, specimen);

  // Write metadata JSON
  const jsonPath = outputPath.replace(/\.json$/, '_enhanced.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    typography: {
      fontFamily: params.fontFamily,
      weight: params.weight,
      style: params.style,
      size: params.size,
      text: params.text,
      variableAxes: params.variableAxes,
      quality: params.quality
    },
    files: {
      svg: path.basename(svgPath),
      fontCSS: path.basename(cssPath),
      specimen: path.basename(specimenPath)
    }
  }, null, 2));

  return {
    filePath: jsonPath,
    svgPath,
    fontPath: cssPath
  };
}

function generateSVGText(params: TypographyParams): string {
  const lines = params.text.split('\n');
  const lineHeight = params.size * 1.5;
  const totalHeight = lines.length * lineHeight;

  let y = params.size;
  const textElements = lines.map(line => {
    const element = `  <text x="50%" y="${y}" text-anchor="middle" font-family="${params.fontFamily}" font-size="${params.size}" font-weight="${params.weight}" font-style="${params.style}" fill="currentColor">${escapeXml(line)}</text>`;
    y += lineHeight;
    return element;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="${totalHeight + 50}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style type="text/css">
      @font-face {
        font-family: '${params.fontFamily}';
        src: url('${params.fontFamily.toLowerCase().replace(/\s+/g, '-')}.woff2') format('woff2');
        font-weight: ${params.weight};
        font-style: ${params.style};
        ${Object.entries(params.variableAxes).map(([axis, value]) => `--${axis}: ${value};`).join('\n        ')}
      }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="transparent"/>
${textElements}
</svg>`;
}

function generateVariableFontCSS(params: TypographyParams): string {
  return `/* Variable Font CSS for ${params.fontFamily} */

@font-face {
  font-family: '${params.fontFamily}';
  src: url('${params.fontFamily.toLowerCase().replace(/\s+/g, '-')}.woff2') format('woff2');
  font-weight: ${params.weight};
  font-style: ${params.style};
  font-display: swap;
  
  /* Variable font axes */
  ${Object.entries(params.variableAxes).map(([axis, value]) => {
    const axisName = axis === 'weight' ? 'wght' : axis === 'width' ? 'wdth' : axis;
    return `font-variation-settings: '${axisName}' ${value};`;
  }).join('\n  ')}
}

.typography-text {
  font-family: '${params.fontFamily}', sans-serif;
  font-size: ${params.size}px;
  font-weight: ${params.weight};
  font-style: ${params.style};
  line-height: 1.5;
  color: inherit;
  
  /* Enable variable font features */
  font-feature-settings: 'kern', 'liga', 'calt';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Responsive scaling */
@media (max-width: 768px) {
  .typography-text {
    font-size: ${params.size * 0.8}px;
  }
}

/* Print styles */
@media print {
  .typography-text {
    font-size: ${params.size * 0.9}pt;
  }
}
`;
}

function generateFontSpecimen(params: TypographyParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.fontFamily} — Font Specimen</title>
  <link rel="stylesheet" href="${path.basename(params.fontFamily.toLowerCase().replace(/\s+/g, '-'))}_font.css">
  <style>
    body { font-family: '${params.fontFamily}', sans-serif; padding: 40px; max-width: 1200px; margin: 0 auto; }
    .sample { margin: 40px 0; padding: 20px; border-left: 4px solid #ccc; }
    .label { font-size: 12px; color: #666; margin-bottom: 10px; }
    .large { font-size: 72px; line-height: 1.1; }
    .medium { font-size: 36px; line-height: 1.3; }
    .small { font-size: 18px; line-height: 1.5; }
    .variable-controls { margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 8px; }
    .control { margin: 10px 0; }
    label { display: inline-block; width: 150px; }
    input[type="range"] { width: 300px; }
  </style>
</head>
<body>
  <h1>${params.fontFamily} — Font Specimen</h1>
  
  <div class="sample">
    <div class="label">Large Display (72px)</div>
    <div class="large">${escapeHtml(params.text)}</div>
  </div>
  
  <div class="sample">
    <div class="label">Medium Heading (36px)</div>
    <div class="medium">${escapeHtml(params.text)}</div>
  </div>
  
  <div class="sample">
    <div class="label">Body Text (18px)</div>
    <div class="small">${escapeHtml(params.text)}</div>
  </div>
  
  <div class="variable-controls">
    <h3>Variable Font Axes</h3>
    ${Object.entries(params.variableAxes).map(([axis, value]) => `
    <div class="control">
      <label>${axis}:</label>
      <input type="range" min="100" max="900" value="${value}" oninput="updateVariableFont('${axis}', this.value)">
      <span id="${axis}-value">${value}</span>
    </div>
    `).join('')}
  </div>
  
  <script>
    function updateVariableFont(axis, value) {
      document.documentElement.style.setProperty('--' + axis, value);
      document.getElementById(axis + '-value').textContent = value;
    }
  </script>
</body>
</html>`;
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function extractParams(seed: Seed): TypographyParams {
  const quality = seed.genes?.quality?.value || 'medium';
  let weight = seed.genes?.weight?.value || 400;
  if (typeof weight === 'number' && weight <= 1) weight = Math.floor(weight * 900);

  const variableAxes: Record<string, number> = {};
  if (seed.genes?.weight?.value) variableAxes.weight = typeof weight === 'number' ? weight : 400;
  if (seed.genes?.width?.value) variableAxes.width = typeof seed.genes.width.value === 'number' ? seed.genes.width.value * 100 : 100;

  return {
    fontFamily: seed.genes?.fontFamily?.value || 'Inter',
    weight,
    style: seed.genes?.style?.value || 'normal',
    size: typeof seed.genes?.size?.value === 'number' ? seed.genes.size.value : 24,
    text: seed.genes?.text?.value || 'The quick brown fox jumps over the lazy dog',
    variableAxes,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
