import crypto from 'crypto';
import { growSeed, getAllDomains } from '../kernel/engines';
import { getCache } from '../cache';

// ─── RENDER FORMATS ──────────────────────────────────────────────────────

export const RENDER_FORMATS = [
  'glb', 'gltf', 'obj', 'stl', 'png', 'svg', 'wav', 'mid',
  'html', 'json', 'yaml',
] as const;

export type RenderFormat = (typeof RENDER_FORMATS)[number];

const FORMAT_EXTENSIONS: Record<RenderFormat, string> = {
  glb: 'model/gltf-binary', gltf: 'model/gltf+json',
  obj: 'model/obj', stl: 'model/stl',
  png: 'image/png', svg: 'image/svg+xml',
  wav: 'audio/wav', mid: 'audio/midi',
  html: 'text/html', json: 'application/json', yaml: 'text/yaml',
};

const DOMAIN_FORMATS: Record<string, RenderFormat[]> = {
  character: ['glb', 'gltf', 'obj', 'stl'],
  sprite: ['png', 'svg'],
  music: ['wav', 'mid'],
  visual2d: ['png', 'svg'],
  geometry3d: ['glb', 'gltf', 'obj', 'stl'],
  narrative: ['json', 'yaml'],
  ui: ['html', 'json'],
  audio: ['wav'],
  fullgame: ['html', 'json'],
  animation: ['glb', 'gltf'],
  shader: ['json'],
  particle: ['json'],
  procedural: ['png', 'json'],
  typography: ['json', 'svg'],
  architecture: ['glb', 'gltf', 'obj'],
  vehicle: ['glb', 'gltf', 'obj'],
  furniture: ['glb', 'gltf', 'obj'],
  fashion: ['glb', 'gltf'],
  robotics: ['glb', 'gltf', 'json'],
  circuit: ['json', 'svg'],
  food: ['glb', 'gltf', 'json'],
  choreography: ['json', 'yaml'],
  agent: ['json'],
  alife: ['json'],
  ecosystem: ['json'],
  physics: ['json'],
  game: ['json'],
};

// ─── RENDER RESPONSE ─────────────────────────────────────────────────────

export interface RenderResponse {
  format: RenderFormat;
  mimeType: string;
  data: Buffer;
  seedHash: string;
  quality: string;
  cached: boolean;
}

// ─── RENDER SERVICE ──────────────────────────────────────────────────────

/**
 * Render a seed to the specified format, with edge caching.
 * This is the heart of the Universal Content Fabric — seeds are 5KB,
 * artifacts are grown on demand or served from cache.
 */
export async function renderSeed(
  seed: any,
  format: RenderFormat = 'json',
): Promise<RenderResponse> {
  const cache = getCache();
  const cacheKey = `render:${seed.$hash || seed.id}:${format}`;

  // Check cache
  const cached = await cache.get(cacheKey);
  if (cached && typeof cached === 'string') {
    return { ...JSON.parse(cached), cached: true } as RenderResponse;
  }

  // Grow the seed
  const artifact = await growSeed(seed);
  const quality = artifact.generation_quality || 'full';

  // Convert artifact to requested format
  const data = await artifactToFormat(artifact, format, seed);

  // Determine MIME type
  const mimeType = FORMAT_EXTENSIONS[format] || 'application/octet-stream';

  const response: RenderResponse = {
    format,
    mimeType,
    data,
    seedHash: seed.$hash || seed.id,
    quality,
    cached: false,
  };

  // Cache for 1 hour
  await cache.set(cacheKey, JSON.stringify({ ...response, data: undefined, cached: true }), 3600);

  return response;
}

/**
 * Get supported formats for a domain.
 */
export function getSupportedFormats(domain: string): RenderFormat[] {
  return DOMAIN_FORMATS[domain] || ['json'];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────

async function artifactToFormat(
  artifact: any,
  format: RenderFormat,
  seed: any,
): Promise<Buffer> {
  switch (format) {
    case 'json':
    case 'yaml':
      return Buffer.from(JSON.stringify({
        seed: { id: seed.id, domain: seed.$domain, name: seed.$name, hash: seed.$hash },
        artifact: {
          type: artifact.type,
          quality: artifact.generation_quality,
          render_hints: artifact.render_hints,
          genes: seed.genes ? Object.keys(seed.genes).length : 0,
        },
      }, null, 2));

    case 'glb':
    case 'gltf':
      if (artifact.artifact?.filePath) {
        return Buffer.from(`Rendered at: ${artifact.artifact.filePath}`);
      }
      return Buffer.from(JSON.stringify(artifact, null, 2));

    case 'png':
    case 'svg':
      if (artifact.visual && typeof artifact.visual === 'string') {
        return Buffer.from(artifact.visual);
      }
      return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
        <rect width="100" height="100" fill="#4a9eff" rx="10"/>
        <text x="50" y="55" text-anchor="middle" fill="white" font-size="12">${seed.$name || 'Seed'}</text>
      </svg>`);

    case 'wav':
    case 'mid':
      if (artifact.artifact?.filePath) {
        return Buffer.from(`Rendered at: ${artifact.artifact.filePath}`);
      }
      return artifactToFormat(artifact, 'json', seed);

    case 'html':
      return Buffer.from(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${seed.$name || 'Paradigm Artifact'}</title>
<style>body{margin:0;background:#0d1117;color:#c9d1d9;font-family:sans-serif;padding:20px}
pre{background:#161b22;padding:16px;border-radius:8px;overflow:auto}</style>
<body><h1>${seed.$name || 'Artifact'}</h1>
<div>Domain: ${seed.$domain || 'unknown'}</div>
<div>Quality: ${artifact.generation_quality || 'unknown'}</div>
<pre>${JSON.stringify(artifact, null, 2)}</pre></body></html>`);

    default:
      return Buffer.from(JSON.stringify(artifact, null, 2));
  }
}

// ─── .PSEED FILE FORMAT ─────────────────────────────────────────────────

export interface PSeedPackage {
  metadata: {
    version: string;
    name: string;
    domain: string;
    hash: string;
    created: string;
    engineVersion: string;
  };
  seed: any;
  preview?: string;
  c2pa?: any;
}

/**
 * Package a seed into the .pseed portable format.
 */
export function packagePSeed(seed: any, c2paManifest?: any): Buffer {
  const pkg: PSeedPackage = {
    metadata: {
      version: '1.0',
      name: seed.$name || 'Untitled',
      domain: seed.$domain || 'unknown',
      hash: seed.$hash || '',
      created: new Date().toISOString(),
      engineVersion: '2.0.0',
    },
    seed,
    c2pa: c2paManifest,
  };

  return Buffer.from(JSON.stringify(pkg, null, 2));
}

/**
 * Parse a .pseed file.
 */
export function parsePSeed(data: Buffer): PSeedPackage {
  return JSON.parse(data.toString('utf-8'));
}
