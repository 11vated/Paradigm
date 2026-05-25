/**
 * /api/seeds/:id/embed — seed intelligence embedding route (slice of router split).
 * Extracted from server.ts by paradigm-infinite/ws-35.
 */
import type { Express, Request, Response, RequestHandler } from 'express';

interface Deps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: RequestHandler;
  validateBody: (schema: any) => RequestHandler;
  schemas: { embedSeed: any };
  IntelligenceLayer: { generateEmbedding: (seed: any) => Promise<number[]> };
  log: any;
}

export function registerSeedEmbedRoutes(app: Express, deps: Deps): void {
  const { seeds, saveSeeds, optionalAuth, validateBody, schemas, IntelligenceLayer, log } = deps;
  app.post('/api/seeds/:id/embed', optionalAuth, validateBody(schemas.embedSeed), async (req: Request, res: Response) => {
    try {
      const seedIndex = seeds.findIndex((s: any) => s.id === req.params.id);
      if (seedIndex === -1) return res.status(404).json({ detail: 'Seed not found' });
      const seed = seeds[seedIndex];
      const sbertUrl = process.env.SBERT_URL;
      const databaseUrl = process.env.DATABASE_URL;
      let embedding: number[];
      let source: 'sbert' | 'gemini' = 'gemini';
      if (sbertUrl) {
        const { embedSeed } = await import('../../lib/intelligence/embedding-client.js');
        embedding = await embedSeed(seed);
        source = 'sbert';
        if (databaseUrl) {
          try {
            const { upsertEmbedding } = await import('../../lib/intelligence/pgvector.js');
            await upsertEmbedding({
              seed_hash: seed.$hash,
              seed_id: seed.id,
              domain: seed.$domain,
              name: seed.$name ?? null,
              embedding,
            });
          } catch (e: any) {
            log('WARN', 'pgvector upsert failed; vector returned without persistence', { error: e.message });
          }
        }
      } else {
        embedding = await IntelligenceLayer.generateEmbedding(seed);
      }
      seeds[seedIndex] = { ...seed, $embedding: embedding };
      saveSeeds();
      res.json({ success: true, dimensions: embedding.length, source });
    } catch (e: any) {
      log('WARN', 'Embedding generation failed', { error: e.message });
      res.status(500).json({ detail: e.message || 'Embedding generation failed' });
    }
  });
}
