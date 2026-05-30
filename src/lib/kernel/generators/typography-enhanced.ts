/**
 * @deprecated Phase 2 Canonical Collapse (Doctrine v2) — PARADIGM-RENAME-OK waiver active (sunset 2026-08-25)
 * Typography sibling (enhanced). 
 * CANONICAL PRIMARY lives in typography.ts + typography-contract.ts.
 * All new development + dispatch must target the primary. This file will be removed after golden regeneration.
 *
 * Typography Generator — produces SVG/Variable font text (legacy enhanced)
 * Enhanced with embedded glyph paths and font specimen pages
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

// ─── Embedded 7×9 Bitmap Font ──────────────────────────────────────────────
// Each letter is a 7-wide, 9-high bitmap stored as a hex string (LSB first).
// 1 = ink, 0 = paper. Covers A-Z, a-z, 0-9, common punctuation.

const FONT_BITMAPS: Record<string, string> = {
  A: '1c223e414141417f4141', B: '7e4141417e4141417e', C: '1e213f404040213f1e',
  D: '7c424141414142427c', E: '7f4040407c4040407f', F: '7f4040407c40404040',
  G: '1e21404e414141231e', H: '414141417f41414141', I: '1f040404040404041f',
  J: '1f0808080808492a1c', K: '41424c5070504c4241', L: '40404040404040407f',
  M: '414163555549414141', N: '414161515149454341', O: '1e2241414141221e',
  P: '7e4141417e40404040', Q: '1e2241414141221e0e', R: '7e4141417e504c4241',
  S: '1e2141201e0402211e', T: '7f0808080808080808', U: '41414141414141413e',
  V: '414141412214142208', W: '414141414149556341', X: '412214080814224141',
  Y: '412214080808080808', Z: '7f020408102040407f',
  a: '003e01413f41433e', b: '40407c42414242427c', c: '001e21404040211e',
  d: '01013f414141433e', e: '001e21417f40211e', f: '0e1108101010101010',
  g: '003e4141433e013e', h: '40404e715141414141', i: '08000c0808080808',
  j: '0400060404040404', k: '4040484454444c44', l: '0c08080808080808',
  m: '00766b4949494949', n: '004e715141414141', o: '001e22414142221e',
  p: '007c4242427c4040', q: '003e4141413f0101', r: '005e614040404040',
  s: '003e41201e01417e', t: '10103e1010101010', u: '0041414141514b26',
  v: '0041414222140808', w: '0041414149495536', x: '0041221408142241',
  y: '004141433e013e', z: '007f020810207f',
  '0': '1e2241514945221e', '1': '1e1202020202021e', '2': '3e4122010814227f',
  '3': '7f0204080201413e', '4': '040c1424447f0404', '5': '7f40407e0101413e',
  '6': '1e21407e4141221e', '7': '7f01020408101010', '8': '1e2241221e42221e',
  '9': '1e2241211f01023c',
  '.': '0000000000000000', ',': '00000000080804',
  '!': '0808080808000808', '?': '3e4101040810080010',
  '-': '0000007f00000000', '_': '000000000000007f',
  "'": '10080800', ':': '00000800000800',
  ';': '0000080000080804', '/': '0102040810204080',
};

function glyphPath(char: string, x: number, y: number, scale: number): string {
  const hex = FONT_BITMAPS[char];
  if (!hex) return '';
  const bits = BigInt('0x' + hex).toString(2).padStart(hex.length * 4, '0');
  let path = '';
  const gw = 7, gh = Math.ceil(bits.length / gw);
  for (let row = 0; row < gh; row++) {
    for (let col = 0; col < gw; col++) {
      const idx = row * gw + col;
      if (idx < bits.length && bits[idx] === '1') {
        const rx = x + col * scale, ry = y + row * scale;
        path += `M${rx},${ry}h${scale}v${scale}h-${scale}z`;
      }
    }
  }
  return path;
}

function generateGlyphSVG(text: string, params: TypographyParams): string {
  const scale = Math.max(4, Math.floor(params.size / 9));
  const lineHeight = scale * 11;
  const lines = text.split('\n');
  const totalHeight = lines.length * lineHeight + scale * 2;
  const paths: string[] = [];

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const textWidth = line.length * scale * 8;
    let cx = (800 - textWidth) / 2;
    const cy = scale * 2 + li * lineHeight;
    for (const ch of line) {
      const p = glyphPath(ch, cx, cy, scale);
      if (p) paths.push(p);
      cx += scale * 8;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#fafafa" rx="8"/>
  <g fill="${params.weight > 500 ? '#1a1a1a' : '#333'}" stroke="none">
    ${paths.map(p => `  <path d="${p}"/>`).join('\n')}
  </g>
</svg>`;
}

function generateTextElementSVG(text: string, params: TypographyParams): string {
  const lines = text.split('\n');
  const lineHeight = params.size * 1.5;
  const totalHeight = lines.length * lineHeight + 50;
  const googleUrl = `https://fonts.googleapis.com/css2?family=${params.fontFamily.replace(/\s+/g, '+')}:wght@${params.weight}&display=swap`;

  let y = params.size;
  const textElements = lines.map(line => {
    const el = `  <text x="50%" y="${y}" text-anchor="middle" font-family="${params.fontFamily}, sans-serif" font-size="${params.size}" font-weight="${params.weight}" font-style="${params.style}" fill="currentColor">${escapeXml(line)}</text>`;
    y += lineHeight;
    return el;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="800" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>@import url('${googleUrl}');</style>
  </defs>
  <rect width="100%" height="100%" fill="#fafafa" rx="8"/>
${textElements}
</svg>`;
}

export async function generateTypographyEnhanced(seed: Seed, outputPath: string): Promise<{ filePath: string; svgPath: string; fontPath: string }> {
  const params = extractParams(seed);
  const quality = seed._quality || (seed as any).genes?.quality?.value || 'full';
  const isRich = quality !== 'metadata-only';

  // Generate SVG: glyph paths at full quality, text elements otherwise
  const svg = isRich
    ? generateGlyphSVG(params.text, params)
    : generateTextElementSVG(params.text, params);

  const fontCSS = generateVariableFontCSS(params);
  const specimen = generateFontSpecimen(params);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const svgPath = outputPath.replace(/\.json$/, '.svg');
  fs.writeFileSync(svgPath, svg);

  const cssPath = outputPath.replace(/\.json$/, '_font.css');
  fs.writeFileSync(cssPath, fontCSS);

  const specimenPath = outputPath.replace(/\.json$/, '_specimen.html');
  fs.writeFileSync(specimenPath, specimen);

  const jsonPath = outputPath.replace(/\.json$/, '_enhanced.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    typography: {
      fontFamily: params.fontFamily,
      weight: params.weight,
      style: params.style,
      size: params.size,
      text: params.text,
      variableAxes: params.variableAxes,
      quality: params.quality,
      glyphMode: isRich ? 'embedded' : 'system-font',
    },
    files: {
      svg: path.basename(svgPath),
      fontCSS: path.basename(cssPath),
      specimen: path.basename(specimenPath),
    },
  }, null, 2));

  return { filePath: jsonPath, svgPath, fontPath: cssPath };
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
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  let weight = (seed.genes?.weight?.value as number) || 400;
  if (typeof weight === 'number' && weight <= 1) weight = Math.floor(weight * 900);

  const variableAxes: Record<string, number> = {};
  if (seed.genes?.weight?.value) variableAxes.weight = typeof weight === 'number' ? weight : 400;
  if (seed.genes?.width?.value) variableAxes.width = typeof seed.genes.width.value === 'number' ? seed.genes.width.value * 100 : 100;

  return {
    fontFamily: (seed.genes?.fontFamily?.value as string) || 'Inter',
    weight,
    style: (seed.genes?.style?.value as string) || 'normal',
    size: typeof seed.genes?.size?.value === 'number' ? seed.genes.size.value : 24,
    text: (seed.genes?.text?.value as string) || 'The quick brown fox jumps over the lazy dog',
    variableAxes,
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
  };
}
