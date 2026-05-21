/**
 * Composition graph + path-finding routes (slice 3 of the modular router split).
 */
import type { Express, Request, Response } from 'express';

export interface CompositionDeps {
  getCompositionGraph: () => any;
  findCompositionPath: (source: string, target: string) => { bridges: string[]; totalCoherence: number } | null;
  cache: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, ttl?: number) => Promise<void> };
  compositionPathKey: (a: string, b: string) => string;
}

export function registerCompositionRoutes(app: Express, deps: CompositionDeps): void {
  app.get('/api/composition/graph', (_req: Request, res: Response) => {
    res.json(deps.getCompositionGraph());
  });

  app.get('/api/composition/path', async (req: any, res: any) => {
    const source = String(req.query.source || '');
    const target = String(req.query.target || '');
    if (!source || !target) return res.status(400).json({ detail: 'source and target required' });
    const cacheKey = deps.compositionPathKey(source, target);
    const cached = await deps.cache.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
    const pathResult = deps.findCompositionPath(source, target);
    if (!pathResult) return res.status(404).json({ detail: 'No composition path found' });
    const formatted = pathResult.bridges.map((name) => [source, name, target]);
    const result = { path: formatted, cost: pathResult.bridges.length, coherence: pathResult.totalCoherence };
    await deps.cache.set(cacheKey, JSON.stringify(result), 3600);
    res.json(result);
  });
}
