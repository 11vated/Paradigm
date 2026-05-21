/**
 * Library list + import routes (slice 4 of the modular router split).
 */
import type { Express, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export interface LibraryDeps {
  seeds: any[];
  saveSeeds: () => void;
  validateBody: (schema: any) => any;
  optionalAuth: (req: any, res: any, next: any) => void;
  LibraryImportSchema: any;
}

export function registerLibraryRoutes(app: Express, deps: LibraryDeps): void {
  app.get('/api/library', (_req: Request, res: Response) => {
    res.json({ seeds: deps.seeds, stats: { total_seeds: deps.seeds.length } });
  });

  app.post('/api/library/import', deps.optionalAuth, deps.validateBody(deps.LibraryImportSchema), (req: any, res: any) => {
    const seedToImport = deps.seeds.find((s: any) => s.$hash === req.body.seed_hash);
    if (!seedToImport) return res.status(404).json({ detail: 'Seed not found in library' });
    const newSeed = {
      ...seedToImport,
      id: randomUUID(),
      $lineage: { generation: 0, operation: 'import' },
      $fitness: { overall: 1.0 },
    };
    deps.seeds.push(newSeed);
    deps.saveSeeds();
    res.json(newSeed);
  });
}
