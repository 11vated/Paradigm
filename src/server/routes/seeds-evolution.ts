/**
 * Evolution routes: algorithms list, map-elites, async evolve, embed, similar.
 * Slice 10 of the modular router split.
 */
import type { Express } from 'express';

export interface SeedsEvolutionDeps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  EmbedSeedSchema: any;
  crypto: { randomUUID: () => string };
  rngFromHash: (hash: string) => any;
  distanceGene: (type: string, a: any, b: any) => number;
  GENE_TYPES: Record<string, unknown>;
  log: (level: string, msg: string, meta?: any) => void;
  metrics: { seedsEvolved: number; agentQueries: number };
  evolutionJobs: Map<string, { id: string; status: string; algorithm: string; populationSize: number; generations: number; seedId: string; createdAt: number; completedAt?: number; result?: any; error?: string }>;
  IntelligenceLayer: { generateEmbedding: (seed: any) => Promise<any> };
}

export function registerSeedsEvolutionRoutes(app: Express, deps: SeedsEvolutionDeps): void {
  const { seeds, saveSeeds, optionalAuth, validateBody, EmbedSeedSchema, crypto, rngFromHash, distanceGene, GENE_TYPES, log, metrics, evolutionJobs, IntelligenceLayer } = deps;

  app.get('/api/evolution/algorithms', (_req: any, res: any) => {
    res.json({
      algorithms: [
        { id: 'ga', name: 'Genetic Algorithm', description: 'Tournament selection + crossover + mutation + elitism' },
        { id: 'map-elites', name: 'MAP-Elites', description: 'Quality-diversity grid-based population mapping' },
        { id: 'cmaes', name: 'CMA-ES', description: 'Covariance Matrix Adaptation Evolution Strategy' },
        { id: 'poet', name: 'POET', description: 'Paired Open-Ended Trailblazer (co-evolves environments + solutions)' },
        { id: 'dqd', name: 'DQD', description: 'Differentiable Quality Diversity (gradient-based QD)' },
        { id: 'aurora', name: 'AURORA', description: 'Adaptive User-guided Retrieval for Open-Ended Runtime Adaptation' },
        { id: 'nslc', name: 'NSLC', description: 'Novelty Search with Local Competition' },
      ],
    });
  });

  app.get('/api/evolve/map-elites', optionalAuth, async (req: any, res: any) => {
    const domain = (req.query.domain as string) || 'visual2d';
    const gridX = Math.min(parseInt(req.query.gridX as string) || 16, 32);
    const gridY = Math.min(parseInt(req.query.gridY as string) || 16, 32);
    const domainSeeds = seeds.filter((s: any) => s.$domain === domain || s.domain === domain);
    const { MAPElites } = await import('../../lib/evolution/index.js');
    const rng = rngFromHash(`me_${domain}_${gridX}_${gridY}`);
    const me = new MAPElites((s: any) => { const genes = Object.values(s.genes || {}) as any[]; const v0 = genes[0]?.value ?? 0.5; const v1 = genes[1]?.value ?? 0.5; return [typeof v0 === 'number' ? v0 : 0.5, typeof v1 === 'number' ? v1 : 0.5]; }, { gridSize: [gridX, gridY], mutationRate: 0.15, crossoverRate: 0.6 });
    const pool = domainSeeds.length >= 2 ? domainSeeds : seeds.slice(0, Math.max(2, seeds.length));
    const result = me.run(pool, (s: any) => s.$fitness?.overall ?? 0.5, 0);
    const cells: any[] = [];
    let maxFitness = 0;
    result.population.forEach((cell: any, key: string) => {
      const [cx, cy] = key.split(',').map(Number);
      maxFitness = Math.max(maxFitness, cell.fitness);
      cells.push({ x: cx, y: cy, fitness: cell.fitness, seed: cell.seed, domain, discoveredAt: 0 });
    });
    const geneKeys = pool.length > 0 ? Object.keys(pool[0].genes || {}) : ['x', 'y'];
    return res.json({ cells, gridX, gridY, behaviorX: geneKeys[0] ?? 'dim-1', behaviorY: geneKeys[1] ?? 'dim-2', generation: 0, coverage: result.population.size / (gridX * gridY), maxFitness: maxFitness || 1 });
  });

  app.post('/api/evolve/map-elites/step', optionalAuth, async (req: any, res: any) => {
    const domain = req.body.domain || 'visual2d';
    const steps = Math.min(req.body.steps || 10, 50);
    const { MAPElites } = await import('../../lib/evolution/index.js');
    const gridX = 16; const gridY = 16;
    const domainSeeds = seeds.filter((s: any) => s.$domain === domain || s.domain === domain);
    const pool = domainSeeds.length >= 2 ? domainSeeds : seeds.slice(0, Math.max(2, seeds.length));
    const me = new MAPElites((s: any) => { const genes = Object.values(s.genes || {}) as any[]; const v0 = genes[0]?.value ?? 0.5; const v1 = genes[1]?.value ?? 0.5; return [typeof v0 === 'number' ? v0 : 0.5, typeof v1 === 'number' ? v1 : 0.5]; }, { gridSize: [gridX, gridY], mutationRate: 0.2, crossoverRate: 0.65 });
    const result = me.run(pool, (s: any) => s.$fitness?.overall ?? 0.5, steps);
    return res.json({ ok: true, cells: result.population.size, generation: steps });
  });

  app.post('/api/seeds/:id/evolve/async', optionalAuth, async (req: any, res: any) => {
    const parent = seeds.find((s: any) => s.id === req.params.id);
    if (!parent) return res.status(404).json({ detail: 'Not found' });
    const algorithm = req.body.algorithm || 'ga';
    const popSize = Math.min(req.body.population_size || 20, 100);
    const generations = Math.min(req.body.generations || 10, 50);
    const jobId = `evolve_${parent.$hash}_${Date.now()}`;
    const job: any = { id: jobId, status: 'queued', algorithm, populationSize: popSize, generations, seedId: parent.id, createdAt: Date.now() };
    evolutionJobs.set(jobId, job);
    res.json({ jobId, status: 'queued', algorithm, population_size: popSize, generations });
    (async () => {
      try {
        job.status = 'running';
        const { GeneticAlgorithm, MAPElites, CMAES, POET, DQD, AURORA, NSLC } = await import('../../lib/evolution/index.js');
        const rng = rngFromHash((parent.$hash || parent.id || '') + `async_evolve_${algorithm}`);
        const geneKeys = Object.keys(parent.genes || {});
        let result: any[] = [];
        if (algorithm === 'ga') {
          const ga = new GeneticAlgorithm(rng);
          const gaResult = await ga.evolve([parent], (s: any) => s.$fitness?.overall || 0.5, { populationSize: popSize, generationLimit: generations, mutationRate: 0.2, crossoverRate: 0.7, tournamentSize: 3, elitismCount: 1 });
          result = gaResult.population;
        } else if (algorithm === 'map-elites') {
          const me = new MAPElites((s: any) => geneKeys.map(k => (s.genes as any)?.[k]?.value || 0.5), { gridSize: [5, 5] });
          const meResult = me.run([parent], (s: any) => s.$fitness?.overall || 0.5, generations);
          result = Array.from(meResult.population.values()).map((c: any) => c.seed);
        } else if (algorithm === 'cmaes') {
          const cmaes = new CMAES({ populationSize: popSize, generations });
          const cmaesResult = await cmaes.optimize(parent, (s: any) => s.$fitness?.overall || 0.5, geneKeys);
          result = [cmaesResult.best];
        } else if (algorithm === 'dqd') {
          const dqd = new DQD({ populationSize: popSize, generations });
          const dqdResult = await dqd.run([parent], async (s: any) => s.$fitness?.overall || 0.5, (s: any) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
          result = [dqdResult.best];
        } else if (algorithm === 'aurora') {
          const aurora = new AURORA({ archiveSize: popSize * 5, generations });
          const auroraResult = await aurora.run([parent], async (s: any) => s.$fitness?.overall || 0.5, (s: any) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
          result = auroraResult.archive.slice(0, popSize).map((a: any) => a.seed);
        } else if (algorithm === 'nslc') {
          const nslc = new NSLC({ archiveSize: popSize * 5, generations });
          const nslcResult = await nslc.run([parent], async (s: any) => s.$fitness?.overall || 0.5, (s: any) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
          result = nslcResult.archive.slice(0, popSize).map((a: any) => a.seed);
        } else {
          const poet = new POET({ maxEnvironments: popSize, generations });
          const poetResult = await poet.run([parent], async (env: any, sol: any) => sol.$fitness?.overall || 0.5, (env: any, r: any) => { const child = JSON.parse(JSON.stringify(env)); if (child.genes) for (const [, g] of Object.entries(child.genes)) { const ge = g as any; if (typeof ge.value === 'number') ge.value = Math.max(0, Math.min(1, ge.value + (r.nextF64() - 0.5) * 0.2)); } return child; });
          result = poetResult.environments.slice(0, popSize).map((e: any) => e.solution);
        }
        for (const seed of result) { seeds.push(seed); }
        saveSeeds();
        metrics.seedsEvolved++;
        job.status = 'completed';
        job.completedAt = Date.now();
        job.result = result;
        log('INFO', 'Async evolution complete', { jobId, count: result.length });
      } catch (e: any) {
        job.status = 'failed';
        job.error = e.message;
        job.completedAt = Date.now();
        log('ERROR', 'Async evolution failed', { jobId, error: e.message });
      }
    })();
  });

  app.post('/api/seeds/:id/embed', optionalAuth, validateBody(EmbedSeedSchema), async (req: any, res: any) => {
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
            await upsertEmbedding({ seed_hash: seed.$hash, seed_id: seed.id, domain: seed.$domain, name: seed.$name ?? null, embedding });
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

  app.get('/api/seeds/:id/similar', async (req: any, res: any) => {
    try {
      const limit = parseInt(req.query.limit as string) || 5;
      const targetSeed = seeds.find((s: any) => s.id === req.params.id);
      if (!targetSeed) return res.status(404).json({ detail: 'Seed not found' });
      if (process.env.SBERT_URL && process.env.DATABASE_URL) {
        try {
          const { embedSeed } = await import('../../lib/intelligence/embedding-client.js');
          const { findSimilar, upsertEmbedding } = await import('../../lib/intelligence/pgvector.js');
          let vector: number[];
          if (Array.isArray(targetSeed.$embedding) && targetSeed.$embedding.length > 0) {
            vector = targetSeed.$embedding;
          } else {
            vector = await embedSeed(targetSeed);
            upsertEmbedding({ seed_hash: targetSeed.$hash, seed_id: targetSeed.id, domain: targetSeed.$domain, name: targetSeed.$name ?? null, embedding: vector }).catch((e: any) => log('WARN', 'pgvector opportunistic upsert failed', { error: e.message }));
          }
          const hits = await findSimilar({ vector, limit, excludeHash: targetSeed.$hash });
          const byHash = new Map(seeds.map((s: any) => [s.$hash, s]));
          const result = hits.map((h: any) => { const s = byHash.get(h.seed_hash); return s ? { ...s, _distance: h.distance } : null; }).filter((x: any) => x !== null);
          return res.json(result);
        } catch (e: any) {
          log('WARN', 'pgvector similarity failed; falling back to gene distance', { error: e.message });
        }
      }
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
      distances.sort((a, b) => a.distance - b.distance);
      res.json(distances.slice(0, limit).map(d => ({ ...d.seed, _distance: d.distance })));
    } catch (e: any) {
      res.status(500).json({ detail: e.message || 'Similarity search failed' });
    }
  });
}
