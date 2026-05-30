/**
 * Static asset serving (artifacts, data, etc.)
 * Extracted as part of Phase 1 server modular split.
 */
import type { Express } from 'express';
import express from 'express';
import path from 'path';

export function registerStaticRoutes(app: Express): void {
  const artifactsDir = path.join(process.cwd(), 'data', 'artifacts');

  app.use('/artifacts', express.static(artifactsDir, {
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.svg'))  res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      if (filePath.endsWith('.html')) res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (filePath.endsWith('.wav'))  res.setHeader('Content-Type', 'audio/wav');
      if (filePath.endsWith('.mid'))  res.setHeader('Content-Type', 'audio/midi');
      if (filePath.endsWith('.pdb'))  res.setHeader('Content-Type', 'chemical/x-pdb');
      if (filePath.endsWith('.gltf')) res.setHeader('Content-Type', 'model/gltf+json');
      if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
    },
  }));

  app.use('/data/artifacts', express.static(artifactsDir));
}
