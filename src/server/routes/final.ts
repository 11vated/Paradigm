/**
 * Final catch-all and Vite/static fallback routes.
 * Extracted as part of Phase 1 server modular split.
 */
import type { Express } from 'express';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

export async function registerFinalRoutes(app: Express, isProd: boolean): Promise<void> {
  app.use('/api/*', (req: any, res: any) => {
    // This is a placeholder; real routes are registered earlier
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}
