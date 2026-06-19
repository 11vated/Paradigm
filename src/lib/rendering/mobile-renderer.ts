/**
 * Mobile Renderer — adapts seed artifacts for mobile/tablet viewports.
 *
 * Maps all 27 domains to viewport-optimized representations (SVG previews,
 * HTML summaries, JSON extracts) so .gseed artifacts render with parity on
 * narrow screens. 13 flagship domains get full visual previews; the rest
 * get structured metadata cards.
 */
import { rngFromHash, Xoshiro256StarStar } from '../kernel/rng';
import type { Seed, Artifact } from '../kernel/types';

export interface MobileRenderConfig {
  width: number;
  height: number;
  devicePixelRatio: number;
  format: 'svg' | 'html' | 'json';
}

export interface MobileRenderOutput {
  format: 'svg' | 'html' | 'json';
  content: string;
  width: number;
  height: number;
  domain: string;
  seedName: string;
  seedHash: string;
}

const DEFAULT_CONFIG: MobileRenderConfig = {
  width: 375,
  height: 667,
  devicePixelRatio: 2,
  format: 'svg',
};

const FLAGSHIP_DOMAINS = new Set([
  'animation', 'character', 'cosmology', 'field', 'fullgame',
  'geometry3d', 'molecule', 'music', 'quantum', 'sprite',
  'visual2d', 'website', 'world',
]);

function domainLabel(domain: string): string {
  return domain.charAt(0).toUpperCase() + domain.slice(1);
}

function extractSeedColor(seed: Seed, rng: Xoshiro256StarStar): [number, number, number] {
  const hue = rng.nextF64();
  const sat = 0.5 + rng.nextF64() * 0.4;
  const val = 0.4 + rng.nextF64() * 0.5;
  return hsvToRgb(hue, sat, val);
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function randomShape(rng: Xoshiro256StarStar): 'circle' | 'square' | 'diamond' | 'hexagon' {
  const shapes: Array<'circle' | 'square' | 'diamond' | 'hexagon'> = ['circle', 'square', 'diamond', 'hexagon'];
  return shapes[rng.nextInt(0, shapes.length - 1)];
}

function shapePath(shape: string, cx: number, cy: number, r: number): string {
  switch (shape) {
    case 'circle':
      return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
    case 'square':
      return `<rect x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" rx="${r * 0.15}"/>`;
    case 'diamond':
      return `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}"/>`;
    case 'hexagon': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
      }).join(' ');
      return `<polygon points="${pts}"/>`;
    }
    default:
      return `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
  }
}

function renderSceneToSvg(
  seed: Seed,
  artifact: Artifact | null,
  cfg: MobileRenderConfig,
): string {
  const rng = rngFromHash(`${seed.hash || seed.$hash || 'seed'}:mobile-render`);
  const domain = seed.$domain || 'unknown';
  const name = seed.$name || 'Untitled Seed';
  const w = cfg.width;
  const h = cfg.height;
  const primary = extractSeedColor(seed, rng);
  const secondary = extractSeedColor(seed, rng);
  const tertiary = extractSeedColor(seed, rng);
  const bgHex = '#0a0a10';
  const pHex = rgbToHex(primary[0], primary[1], primary[2]);
  const sHex = rgbToHex(secondary[0], secondary[1], secondary[2]);
  const tHex = rgbToHex(tertiary[0], tertiary[1], tertiary[2]);

  const isFlagship = FLAGSHIP_DOMAINS.has(domain);

  let body = '';

  if (isFlagship) {
    switch (domain) {
      case 'character':
      case 'friend': {
        const headR = Math.min(w, h) * 0.08;
        const bodyR = Math.min(w, h) * 0.12;
        const cx = w / 2;
        const cy = h / 2 - bodyR * 0.3;
        body = `
          <ellipse cx="${cx}" cy="${cy + bodyR * 0.6}" rx="${bodyR}" ry="${bodyR * 1.3}" fill="${pHex}" opacity="0.9"/>
          <circle cx="${cx}" cy="${cy - bodyR * 0.5}" r="${headR}" fill="${sHex}"/>
          <circle cx="${cx - headR * 0.3}" cy="${cy - bodyR * 0.5 - headR * 0.2}" r="${headR * 0.12}" fill="#fff"/>
          <circle cx="${cx + headR * 0.3}" cy="${cy - bodyR * 0.5 - headR * 0.2}" r="${headR * 0.12}" fill="#fff"/>`;
        break;
      }
      case 'world':
      case 'field': {
        body = `
          <ellipse cx="${w / 2}" cy="${h * 0.7}" rx="${w * 0.4}" ry="${h * 0.08}" fill="${pHex}" opacity="0.6"/>
          <circle cx="${w / 2}" cy="${h * 0.45}" r="${Math.min(w, h) * 0.12}" fill="${pHex}" opacity="0.3"/>
          <circle cx="${w * 0.35}" cy="${h * 0.35}" r="${Math.min(w, h) * 0.04}" fill="${sHex}" opacity="0.5"/>
          <circle cx="${w * 0.65}" cy="${h * 0.38}" r="${Math.min(w, h) * 0.03}" fill="${tHex}" opacity="0.5"/>`;
        break;
      }
      case 'music': {
        const barW = Math.min(w, h) * 0.025;
        const barGap = barW * 1.8;
        const bars = Array.from({ length: 12 }, (_, i) => {
          const bh = (0.15 + rng.nextF64() * 0.6) * h * 0.3;
          const bx = w / 2 - 6 * barGap + i * barGap;
          const by = h / 2 - bh / 2;
          return `<rect x="${bx}" y="${by}" width="${barW}" height="${bh}" rx="${barW / 2}" fill="${i % 3 === 0 ? pHex : i % 3 === 1 ? sHex : tHex}" opacity="0.8"/>`;
        }).join('\n');
        body = bars;
        break;
      }
      case 'visual2d':
      case 'sprite': {
        const size = Math.min(w, h) * 0.5;
        const cx = w / 2;
        const cy = h / 2;
        body = `
          <rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" rx="${size * 0.08}" fill="${pHex}" opacity="0.7"/>
          <circle cx="${cx}" cy="${cy}" r="${size * 0.2}" fill="${sHex}" opacity="0.9"/>
          <circle cx="${cx}" cy="${cy - size * 0.25}" r="${size * 0.08}" fill="#fff" opacity="0.3"/>`;
        break;
      }
      case 'fullgame':
      case 'game': {
        body = `
          <rect x="${w * 0.15}" y="${h * 0.25}" width="${w * 0.7}" height="${h * 0.5}" rx="${Math.min(w, h) * 0.04}" fill="${pHex}" opacity="0.3" stroke="${pHex}" stroke-width="2"/>
          <rect x="${w * 0.25}" y="${h * 0.45}" width="${w * 0.2}" height="${h * 0.04}" rx="2" fill="${sHex}"/>
          <rect x="${w * 0.5}" y="${h * 0.35}" width="${w * 0.25}" height="${h * 0.04}" rx="2" fill="${tHex}"/>
          <circle cx="${w / 2}" cy="${h * 0.55}" r="${Math.min(w, h) * 0.08}" fill="none" stroke="${sHex}" stroke-width="2"/>`;
        break;
      }
      case 'geometry3d':
      case 'quantum':
      case 'molecule':
      case 'cosmology': {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.15;
        const orbs = Array.from({ length: 8 }, (_, i) => {
          const a = (Math.PI * 2 / 8) * i;
          const ox = cx + r * Math.cos(a);
          const oy = cy + r * Math.sin(a);
          const col = i % 3 === 0 ? pHex : i % 3 === 1 ? sHex : tHex;
          return `<circle cx="${ox}" cy="${oy}" r="${r * 0.2}" fill="${col}" opacity="0.8"/>`;
        }).join('\n');
        body = `
          <circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="${pHex}" opacity="0.4"/>
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sHex}" stroke-width="1" opacity="0.5"/>
          ${orbs}`;
        break;
      }
      case 'animation': {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.12;
        const dots = Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI * 2 / 6) * i + Date.now() * 0.001;
          const dx = cx + r * Math.cos(a);
          const dy = cy + r * Math.sin(a);
          const col = i % 3 === 0 ? pHex : i % 3 === 1 ? sHex : tHex;
          return `<circle cx="${dx}" dy="${dy}" r="${r * 0.15}" fill="${col}" opacity="0.8">
            <animate attributeName="r" values="${r * 0.1};${r * 0.25};${r * 0.1}" dur="${1 + i * 0.2}s" repeatCount="indefinite"/>
          </circle>`;
        }).join('\n');
        body = dots;
        break;
      }
      case 'website': {
        body = `
          <rect x="${w * 0.1}" y="${h * 0.2}" width="${w * 0.8}" height="${h * 0.55}" rx="8" fill="${pHex}" opacity="0.15" stroke="${pHex}" stroke-width="1"/>
          <rect x="${w * 0.15}" y="${h * 0.25}" width="${w * 0.35}" height="${h * 0.04}" rx="2" fill="${sHex}" opacity="0.6"/>
          <rect x="${w * 0.15}" y="${h * 0.32}" width="${w * 0.7}" height="${h * 0.02}" rx="1" fill="${tHex}" opacity="0.3"/>
          <rect x="${w * 0.15}" y="${h * 0.37}" width="${w * 0.5}" height="${h * 0.02}" rx="1" fill="${tHex}" opacity="0.3"/>
          <rect x="${w * 0.15}" y="${h * 0.42}" width="${w * 0.6}" height="${h * 0.02}" rx="1" fill="${tHex}" opacity="0.3"/>`;
        break;
      }
      default: {
        const shape = randomShape(rng);
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.15;
        const shapeEl = shapePath(shape, cx, cy, r);
        body = `<g>${shapeEl.replace('/>', ` fill="${pHex}" opacity="0.7"/>`)}
          <circle cx="${cx + r * 0.5}" cy="${cy - r * 0.5}" r="${r * 0.2}" fill="${sHex}" opacity="0.9"/>
          <circle cx="${cx - r * 0.6}" cy="${cy + r * 0.4}" r="${r * 0.15}" fill="${tHex}" opacity="0.7"/></g>`;
      }
    }
  } else {
    const shape = randomShape(rng);
    const cx = w / 2;
    const cy = h / 2;
    const r = Math.min(w, h) * 0.12;
    const shapeEl = shapePath(shape, cx, cy, r);
    body = `<g>${shapeEl.replace('/>', ` fill="${pHex}" opacity="0.5"/>`)}
      <circle cx="${cx}" cy="${cy}" r="${r * 0.3}" fill="${sHex}" opacity="0.7"/></g>`;
  }

  const strataTags = seed.strata || artifact?.strataCompliance
    ? `<text x="${w / 2}" y="${h - 16}" text-anchor="middle" font-size="8" fill="#555">${domain} · deterministic substrate</text>`
    : '';

  const badge = isFlagship
    ? `<rect x="${w - 60}" y="8" width="52" height="16" rx="3" fill="#1a1a2e" stroke="${pHex}" stroke-width="0.5"/>
       <text x="${w - 34}" y="19" text-anchor="middle" font-size="7" fill="${pHex}" font-weight="600">flagship</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${name} — ${domainLabel(domain)} artifact preview">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${bgHex}"/>
        <stop offset="100%" stop-color="#050510"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <text x="${w / 2}" y="36" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#e0e0e0" font-weight="600">${name}</text>
    <text x="${w / 2}" y="52" text-anchor="middle" font-family="monospace" font-size="8" fill="#666">${domainLabel(domain)}</text>
    <g transform="translate(0, ${h * 0.06})">
      ${body}
    </g>
    ${strataTags}
    ${badge}
  </svg>`;
}

function renderToHtml(seed: Seed, artifact: Artifact | null, cfg: MobileRenderConfig): string {
  const domain = seed.$domain || 'unknown';
  const name = seed.$name || 'Untitled Seed';
  const hash = seed.hash || seed.$hash || '';
  const generation = seed.generation ?? seed.$lineage?.generation ?? 0;
  const fitness = seed.$fitness?.overall ?? null;
  const isFlagship = FLAGSHIP_DOMAINS.has(domain);

  const geneSummary = seed.genes
    ? Object.entries(seed.genes).slice(0, 8).map(([k, v]) =>
      `<div class="gene"><span class="gene-key">${k}</span><span class="gene-val">${String(v?.value ?? '').slice(0, 60)}</span></div>`
    ).join('\n')
    : '';

  const svgPreview = renderSceneToSvg(seed, artifact, cfg);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${name} — Paradigm Artifact</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0a10;color:#d0d0d8;font-family:system-ui,sans-serif;padding:16px;min-height:100vh}
.card{background:#12121a;border-radius:12px;padding:16px;margin-bottom:12px;border:1px solid #1e1e2a}
h1{font-size:18px;font-weight:600;margin-bottom:4px}
.domain{font-size:11px;color:#666;font-family:monospace;text-transform:uppercase;letter-spacing:0.08em}
.meta{display:flex;gap:8px;flex-wrap:wrap;font-size:11px;color:#888;margin-top:8px}
.meta span{background:#1a1a24;padding:2px 8px;border-radius:4px}
.flagship-badge{display:inline-block;background:#1a1a2e;color:#7c7cff;font-size:9px;padding:2px 8px;border-radius:4px;border:1px solid #7c7cff33;text-transform:uppercase;letter-spacing:0.06em;margin-top:8px}
.preview{width:100%;border-radius:8px;margin-top:12px;background:#0e0e16}
.gene{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #181822;font-size:12px}
.gene-key{color:#666;min-width:80px;text-transform:capitalize;font-family:monospace;font-size:10px}
.gene-val{color:#b0b0c0;word-break:break-all}
.footer{text-align:center;font-size:10px;color:#444;margin-top:16px}
</style>
</head>
<body>
<div class="card">
  <div style="display:flex;justify-content:space-between;align-items:start">
    <div>
      <h1>${name}</h1>
      <div class="domain">${domain}</div>
    </div>
    ${isFlagship ? '<div class="flagship-badge">flagship</div>' : ''}
  </div>
  <div class="meta">
    <span>gen ${generation}</span>
    <span>${hash.slice(0, 12)}</span>
    ${fitness !== null ? `<span>fitness ${(fitness * 100).toFixed(0)}%</span>` : ''}
  </div>
  <img class="preview" src="data:image/svg+xml,${encodeURIComponent(svgPreview)}" alt="${name} preview" loading="lazy" width="${cfg.width}" height="${cfg.height}"/>
</div>
${geneSummary ? `<div class="card"><h2 style="font-size:13px;margin-bottom:8px;color:#888">genes</h2>${geneSummary}</div>` : ''}
<div class="footer">deterministic · sovereign · breedable — paradigm</div>
</body>
</html>`;
}

function renderToJson(seed: Seed, artifact: Artifact | null, _cfg: MobileRenderConfig): string {
  const domain = seed.$domain || 'unknown';
  const name = seed.$name || 'Untitled Seed';
  return JSON.stringify({
    seed: {
      name,
      domain,
      hash: seed.hash || seed.$hash || '',
      generation: seed.generation ?? seed.$lineage?.generation ?? 0,
      fitness: seed.$fitness?.overall ?? null,
      geneCount: seed.genes ? Object.keys(seed.genes).length : 0,
    },
    artifact: artifact ? {
      type: artifact.type,
      quality: artifact.generation_quality || null,
    } : null,
    mobile: {
      width: _cfg.width,
      height: _cfg.height,
      format: 'json',
    },
  }, null, 2);
}

export function renderSeedMobile(
  seed: Seed,
  artifact: Artifact | null,
  config?: Partial<MobileRenderConfig>,
): MobileRenderOutput {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const domain = seed.$domain || 'unknown';
  const name = seed.$name || 'Untitled Seed';
  const hash = seed.hash || seed.$hash || '';

  let content: string;
  let format: 'svg' | 'html' | 'json';

  switch (cfg.format) {
    case 'html':
      content = renderToHtml(seed, artifact, cfg);
      format = 'html';
      break;
    case 'json':
      content = renderToJson(seed, artifact, cfg);
      format = 'json';
      break;
    case 'svg':
    default:
      content = renderSceneToSvg(seed, artifact, cfg);
      format = 'svg';
      break;
  }

  return { format, content, width: cfg.width, height: cfg.height, domain, seedName: name, seedHash: hash };
}

export function isFlagshipDomain(domain: string): boolean {
  return FLAGSHIP_DOMAINS.has(domain);
}
