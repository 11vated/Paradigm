/**
 * /api/seeds/:id/similar route - extracted by paradigm-infinite/ws-36.
 * Pgvector-first with cosine-distance fallback.
 */
import type { Express, Request, Response, RequestHandler } from 'express';

interface Deps {
  seeds: any[];
  optionalAuth?: RequestHandler;
  log: any;
  IntelligenceLayer: any;
  GENE_TYPES: any;
  distanceGene: any;
}

export function registerSeedSimilarRoutes(app: Express, deps: Deps): void {
  const { seeds, log, IntelligenceLayer, GENE_TYPES, distanceGene } = deps;
  app.get('/api/seeds/:id/similar', async (req: any, res: any) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const targetSeed = seeds.find((s: any) => s.id === req.params.id);
      if (!targetSeed) return res.status(404).json({ detail: 'Seed not found' });

      // Prefer pgvector ANN when SBERT + DATABASE_URL are both configured.
      // Requires the target seed's embedding already exist in the table;
      // if it doesn't, we embed-on-read so a first-time /similar call still
      // works instead of silently falling back.
      if (process.env.SBERT_URL && process.env.DATABASE_URL) {
        try {
          const { embedSeed } = await import('../../lib/intelligence/embedding-client.js');
          const { findSimilar, upsertEmbedding } = await import('../../lib/intelligence/pgvector.js');
          let vector: number[];
          if (Array.isArray(targetSeed.$embedding) && targetSeed.$embedding.length > 0) {
            vector = targetSeed.$embedding;
          } else {
            vector = await embedSeed(targetSeed);
            // Opportunistic: store it so future queries hit pgvector directly.
            upsertEmbedding({
              seed_hash: targetSeed.$hash,
              seed_id: targetSeed.id,
              domain: targetSeed.$domain,
              name: targetSeed.$name ?? null,
              embedding: vector,
            }).catch((e: any) => log('WARN', 'pgvector opportunistic upsert failed', { error: e.message }));
          }
          const hits = await findSimilar({
            vector,
            limit,
            excludeHash: targetSeed.$hash,
          });
          // Return full seed objects so the response shape matches the legacy path.
          // Missing seeds (DB has embedding but in-memory cache doesn't) are skipped.
          const byHash = new Map(seeds.map((s: any) => [s.$hash, s]));
          const result = hits
            .map((h) => {
              const s = byHash.get(h.seed_hash);
              return s ? { ...s, _distance: h.distance } : null;
            })
            .filter((x: any) => x !== null);
          return res.json(result);
        } catch (e: any) {
          log('WARN', 'pgvector similarity failed; falling back to gene distance', { error: e.message });
          // fall through to legacy path
        }
      }

      // Legacy fallback: gene-space distance. Preserved so tests without
      // external deps still succeed.
      const distances: { seed: any; distance: number }[] = [];
      for (const other of seeds) {
        if (other.id === targetSeed.id) continue;
        let totalDist = 0;
        let count = 0;
        const allKeys = new Set([...Object.keys(targetSeed.genes || {}), ...Object.keys(other.genes || {})]);
        for (const key of allKeys) {
          const gA = (targetSeed.genes || {})[key];
          const gB = (other.genes || {})[key];
          if (gA && gB && gA.type === gB.type && GENE_TYPES[gA.type]) {
            totalDist += distanceGene(gA.type, gA.value, gB.value);
            count++;
          } else {
            totalDist += 1.0;
            count++;
          }
        }
        distances.push({ seed: other, distance: count > 0 ? totalDist / count : 1.0 });
      }
      distances.sort((a: any, b: any) => a.distance - b.distance);
      res.json(distances.slice(0, limit).map(d => ({ ...d.seed, _distance: d.distance })));
    } catch (e: any) {
      res.status(500).json({ detail: e.message || 'Similarity search failed' });
    }
  });
}
