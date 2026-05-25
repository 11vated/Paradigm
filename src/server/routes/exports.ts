/**
 * Per-format seed export routes (slice of the modular router split).
 *
 * Extracted from `server.ts` lines 398-485 by
 * `paradigm-infinite/ws-3-server-routes-batch-2`.
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`.
 *
 * All routes accept `{ seed, artifact }` in the JSON body, look up the
 * artifact file path from the artifact metadata, and stream the file
 * back as a download. Falls back to a synthesized inline artifact where
 * the format allows it (JSON, SVG, HTML, MD), or returns 404 for binary
 * formats that require prior `grow`.
 */
import type { Express, Request, Response } from 'express';
import * as fs from 'node:fs';

export interface ExportDeps {
  optionalAuth: (req: any, res: any, next: any) => void;
}

function hashSlice(seed: any): string {
  return (seed?.$hash || 'x').slice(0, 8);
}

export function registerExportRoutes(app: Express, deps: ExportDeps): void {
  const { optionalAuth } = deps;

  app.post('/api/seeds/export/json', optionalAuth, (req: Request, res: Response) => {
    const { seed } = req.body || {};
    if (!seed) return res.status(400).json({ error: 'seed required' });
    res.setHeader('Content-Disposition', `attachment; filename="seed-${hashSlice(seed)}.json"`);
    res.type('json').send(JSON.stringify(seed, null, 2));
  });

  app.post('/api/seeds/export/svg', optionalAuth, async (req: Request, res: Response) => {
    const { seed, artifact } = req.body || {};
    if (!seed) return res.status(400).json({ error: 'seed required' });
    const svgPath = artifact?.svgPath as string | undefined;
    if (svgPath && fs.existsSync(svgPath)) {
      const svg = fs.readFileSync(svgPath, 'utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="seed-${hashSlice(seed)}.svg"`);
      return res.type('image/svg+xml').send(svg);
    }
    // Fallback: deterministic inline SVG from seed hash
    const h = (seed.$hash || 'aabbccdd').slice(0, 6);
    const fallback =
      `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">` +
      `<rect width="256" height="256" fill="#${h}"/>` +
      `<text x="128" y="135" text-anchor="middle" fill="white" font-size="14" font-family="monospace">${h}</text>` +
      `</svg>`;
    res.setHeader('Content-Disposition', `attachment; filename="seed-${h}.svg"`);
    return res.type('image/svg+xml').send(fallback);
  });

  app.post('/api/seeds/export/html', optionalAuth, async (req: Request, res: Response) => {
    const { seed, artifact } = req.body || {};
    if (!seed) return res.status(400).json({ error: 'seed required' });
    const htmlPath = artifact?.htmlPath as string | undefined;
    if (htmlPath && fs.existsSync(htmlPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="seed-${hashSlice(seed)}.html"`);
      return res.type('text/html').send(fs.readFileSync(htmlPath, 'utf-8'));
    }
    const fallback = `<!DOCTYPE html><html><head><title>Paradigm Seed ${hashSlice(seed)}</title></head><body><pre>${JSON.stringify(seed, null, 2)}</pre></body></html>`;
    res.setHeader('Content-Disposition', `attachment; filename="seed-${hashSlice(seed)}.html"`);
    return res.type('text/html').send(fallback);
  });

  app.post('/api/seeds/export/wav', optionalAuth, async (req: Request, res: Response) => {
    const { seed, artifact } = req.body || {};
    if (!seed) return res.status(400).json({ error: 'seed required' });
    const wavPath = artifact?.wavPath as string | undefined;
    if (wavPath && fs.existsSync(wavPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="seed-${hashSlice(seed)}.wav"`);
      return res.type('audio/wav').send(fs.readFileSync(wavPath));
    }
    return res.status(404).json({ error: 'WAV artifact not yet generated. Grow this seed first.' });
  });

  app.post('/api/seeds/export/markdown', optionalAuth, (req: Request, res: Response) => {
    const { seed, artifact } = req.body || {};
    if (!seed) return res.status(400).json({ error: 'seed required' });
    const story = artifact?.story ?? artifact?.narrative ?? JSON.stringify(seed, null, 2);
    res.setHeader('Content-Disposition', `attachment; filename="seed-${hashSlice(seed)}.md"`);
    res.type('text/markdown').send(story);
  });

  app.post('/api/seeds/export/gltf', optionalAuth, async (req: Request, res: Response) => {
    const { seed, artifact } = req.body || {};
    if (!seed) return res.status(400).json({ error: 'seed required' });
    const gltfPath = (artifact?.gltfPath ?? artifact?.outputPath) as string | undefined;
    if (gltfPath && fs.existsSync(gltfPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="seed-${hashSlice(seed)}.gltf"`);
      return res.type('model/gltf+json').send(fs.readFileSync(gltfPath, 'utf-8'));
    }
    return res.status(404).json({ error: 'GLTF artifact not yet generated. Grow this seed first.' });
  });

  app.post('/api/seeds/export/pdb', optionalAuth, async (req: Request, res: Response) => {
    const { seed, artifact } = req.body || {};
    if (!seed) return res.status(400).json({ error: 'seed required' });
    const pdbPath = artifact?.pdbPath as string | undefined;
    if (pdbPath && fs.existsSync(pdbPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="seed-${hashSlice(seed)}.pdb"`);
      return res.type('chemical/x-pdb').send(fs.readFileSync(pdbPath, 'utf-8'));
    }
    return res.status(404).json({ error: 'PDB artifact not yet generated. Grow this seed first.' });
  });

  app.post('/api/seeds/export/glsl', optionalAuth, async (req: Request, res: Response) => {
    const { seed, artifact } = req.body || {};
    if (!seed) return res.status(400).json({ error: 'seed required' });
    const glslPath = (artifact?.glslPath ?? artifact?.fragPath) as string | undefined;
    if (glslPath && fs.existsSync(glslPath)) {
      res.setHeader('Content-Disposition', `attachment; filename="seed-${hashSlice(seed)}.glsl"`);
      return res.type('text/plain').send(fs.readFileSync(glslPath, 'utf-8'));
    }
    return res.status(404).json({ error: 'GLSL artifact not yet generated. Grow this seed first.' });
  });
}
