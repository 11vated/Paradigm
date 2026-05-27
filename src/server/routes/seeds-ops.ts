/**
 * Seed operation routes: mutate, evolve, breed, inverse, edit genes, distance.
 * Slice 9 of the modular router split.
 */
import type { Express } from 'express';

export interface SeedsOpsDeps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  MutateSeedSchema: any;
  EvolveSeedSchema: any;
  BreedSeedsSchema: any;
  EditGeneSchema: any;
  SeedDistanceSchema: any;
  crypto: { randomUUID: () => string; createHash: (algo: string) => { update: (d: string | Buffer) => any; digest: (enc: string) => string } };
  GENE_TYPES: Record<string, unknown>;
  mutateGene: (type: string, value: any, rate: number, rng: any) => any;
  crossoverGene: (type: string, a: any, b: any, rng: any) => any;
  distanceGene: (type: string, a: any, b: any) => number;
  validateGeneWithDetails: (type: string, value: any, schema?: any) => { valid: boolean; errors: string[]; suggestion?: string };
  rngFromHash: (hash: string) => any;
  deterministicSeedId: (parentHash?: string, extra?: string) => string;
  addOwnerIfAuthed: (seed: any, user: any) => void;
  authorizeSeedMutation: (seed: any, req: any, res: any, action: string, audit?: any) => any;
  log: (level: string, msg: string, meta?: any) => void;
  audit: (action: string, resource: string, resourceId?: string, details?: any, req?: any) => void;
  metrics: { seedsMutated: number; seedsEvolved: number; seedsBred: number };
  inversePipeline: (input: any) => Promise<any>;
  formatInverseResult: (result: any) => any;
}

export function registerSeedsOpsRoutes(app: Express, deps: SeedsOpsDeps): void {
  const { seeds, saveSeeds, optionalAuth, validateBody, MutateSeedSchema, EvolveSeedSchema, BreedSeedsSchema, EditGeneSchema, SeedDistanceSchema, crypto, GENE_TYPES, mutateGene, crossoverGene, distanceGene, validateGeneWithDetails, rngFromHash, deterministicSeedId, addOwnerIfAuthed, authorizeSeedMutation, log, audit, metrics, inversePipeline, formatInverseResult } = deps;

  app.post('/api/seeds/inverse', optionalAuth, async (req: any, res: any) => {
    const input = req.body || {};
    if (!input.description && !input.data) {
      return res.status(400).json({ error: 'Provide description or data' });
    }
    try {
      const result = await inversePipeline(input);
      if (result.seed) {
        seeds.push(result.seed);
        saveSeeds();
      }
      log('INFO', 'Inverse pipeline completed', { domain: result.domain, confidence: result.confidence });
      res.json(formatInverseResult(result));
    } catch (err: any) {
      log('ERROR', 'Inverse pipeline failed', { error: err.message });
      res.status(500).json({ error: 'Inverse pipeline failed', message: err.message });
    }
  });

  app.post('/api/seeds/:id/mutate', optionalAuth, validateBody(MutateSeedSchema), (req: any, res: any) => {
    const parent = seeds.find((s: any) => s.id === req.params.id);
    if (!parent) return res.status(404).json({ detail: 'Not found' });
    const rate = req.body.rate || 0.1;
    const rng = rngFromHash((parent.$hash || parent.id || '') + 'mutate');
    const newGenes: Record<string, any> = {};
    for (const [key, gene] of Object.entries(parent.genes || {}) as [string, any][]) {
      if (rng.nextF64() < rate && gene.type && GENE_TYPES[gene.type]) {
        newGenes[key] = { type: gene.type, value: mutateGene(gene.type, gene.value, rate, rng) };
      } else {
        newGenes[key] = JSON.parse(JSON.stringify(gene));
      }
    }
    const mutateHash = crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex');
    const newSeed: any = {
      ...parent, id: deterministicSeedId(parent.$hash, 'mutate'),
      $name: `${parent.$name} (Mutated)`,
      $lineage: { generation: (parent.$lineage?.generation || 0) + 1, operation: 'mutate', parents: [parent.$hash], timestamp: 0 },
      $hash: mutateHash,
      $fitness: { overall: Math.min(1.0, Math.max(0.0, (parent.$fitness?.overall || 0.5) + (rng.nextF64() * 0.2 - 0.1))) },
      genes: newGenes,
    };
    delete newSeed.$owner;
    addOwnerIfAuthed(newSeed, req.user);
    seeds.push(newSeed);
    saveSeeds();
    metrics.seedsMutated++;
    log('INFO', 'Seed mutated', { id: newSeed.id, parent: parent.id, rate, owner: newSeed.$owner?.userId ?? null });
    audit('seed.mutate', 'seed', newSeed.id, { parent: parent.id, rate }, req);
    res.json(newSeed);
  });

  app.post('/api/seeds/:id/evolve', optionalAuth, validateBody(EvolveSeedSchema), async (req: any, res: any) => {
    const parent = seeds.find((s: any) => s.id === req.params.id);
    if (!parent) return res.status(404).json({ detail: 'Not found' });
    const popSize = Math.min(req.body.population_size || 4, 20);
    const generations = Math.min(req.body.generations || 1, 10);
    const algorithm = req.body.algorithm || 'ga';
    const results: any[] = [];
    if (algorithm === 'ga' || algorithm === 'map-elites' || algorithm === 'cmaes' || algorithm === 'poet' || algorithm === 'dqd' || algorithm === 'aurora' || algorithm === 'nslc') {
      const { GeneticAlgorithm, MAPElites, CMAES, POET, DQD, AURORA, NSLC } = await import('../../lib/evolution/index.js');
      const rng = rngFromHash((parent.$hash || parent.id || '') + `evolve_${algorithm}`);
      const geneKeys = Object.keys(parent.genes || {});
      if (algorithm === 'ga') {
        const ga = new GeneticAlgorithm(rng);
        const gaResult = await ga.evolve([parent], (s: any) => s.$fitness?.overall || 0.5, { populationSize: popSize, generationLimit: generations, mutationRate: 0.2, crossoverRate: 0.7, tournamentSize: 3, elitismCount: 1 });
        results.push(...gaResult.population);
      } else if (algorithm === 'map-elites') {
        const me = new MAPElites((s: any) => geneKeys.map(k => (s.genes as any)?.[k]?.value || 0.5), { gridSize: [5, 5], mutationRate: 0.15, crossoverRate: 0.6 });
        const meResult = me.run([parent], (s: any) => s.$fitness?.overall || 0.5, generations);
        results.push(...Array.from(meResult.population.values()).map((c: any) => c.seed));
      } else if (algorithm === 'cmaes') {
        const cmaes = new CMAES({ populationSize: popSize, generations, initialSigma: 0.3 });
        const cmaesResult = await cmaes.optimize(parent, (s: any) => s.$fitness?.overall || 0.5, geneKeys);
        results.push(cmaesResult.best);
      } else if (algorithm === 'dqd') {
        const dqd = new DQD({ populationSize: popSize, generations, mutationRate: 0.15, gradientSteps: 2 });
        const dqdResult = await dqd.run([parent], async (s: any) => s.$fitness?.overall || 0.5, (s: any) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
        results.push(dqdResult.best);
      } else if (algorithm === 'aurora') {
        const aurora = new AURORA({ archiveSize: popSize * 5, generations, mutationRate: 0.2 });
        const auroraResult = await aurora.run([parent], async (s: any) => s.$fitness?.overall || 0.5, (s: any) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
        results.push(...auroraResult.archive.slice(0, popSize).map((a: any) => a.seed));
      } else if (algorithm === 'nslc') {
        const nslc = new NSLC({ archiveSize: popSize * 5, generations, mutationRate: 0.2 });
        const nslcResult = await nslc.run([parent], async (s: any) => s.$fitness?.overall || 0.5, (s: any) => geneKeys.slice(0, 2).map(k => (s.genes as any)?.[k]?.value || 0.5));
        results.push(...nslcResult.archive.slice(0, popSize).map((a: any) => a.seed));
      } else {
        const poet = new POET({ maxEnvironments: popSize, generations, mutationRate: 0.2 });
        const poetResult = await poet.run([parent], async (env: any, sol: any) => sol.$fitness?.overall || 0.5, (env: any, r: any) => { const child = JSON.parse(JSON.stringify(env)); if (child.genes) for (const [, g] of Object.entries(child.genes)) { const ge = g as any; if (typeof ge.value === 'number') ge.value = Math.max(0, Math.min(1, ge.value + (r.nextF64() - 0.5) * 0.2)); } return child; });
        results.push(...poetResult.environments.slice(0, popSize).map((e: any) => e.solution));
      }
    } else {
      for (let i = 0; i < popSize; i++) {
        const rng = rngFromHash((parent.$hash || parent.id || '') + `evolve_${i}`);
        const mutationRate = 0.1 + rng.nextF64() * 0.3;
        const newGenes: Record<string, any> = {};
        for (const [key, gene] of Object.entries(parent.genes || {}) as [string, any][]) {
          if (rng.nextF64() < mutationRate && gene.type && GENE_TYPES[gene.type]) {
            newGenes[key] = { type: gene.type, value: mutateGene(gene.type, gene.value, mutationRate, rng) };
          } else {
            newGenes[key] = JSON.parse(JSON.stringify(gene));
          }
        }
        const evolveHash = crypto.createHash('sha256').update(JSON.stringify(newGenes) + i).digest('hex');
        results.push({ ...parent, id: deterministicSeedId(parent.$hash || '', `evolve-${i}`), $name: `${parent.$name} (Evolved ${i + 1})`, $lineage: { generation: (parent.$lineage?.generation || 0) + generations, operation: 'evolve', parents: [parent.$hash], timestamp: 0 }, $hash: evolveHash, $fitness: { overall: Math.min(1.0, Math.max(0.0, (parent.$fitness?.overall || 0.5) + (rng.nextF64() * 0.4 - 0.2))) }, genes: newGenes });
      }
    }
    results.sort((a, b) => (b.$fitness?.overall || 0) - (a.$fitness?.overall || 0));
    for (const seed of results) { seeds.push(seed); }
    saveSeeds();
    metrics.seedsEvolved++;
    log('INFO', 'Seed evolved', { parent: parent.id, population: popSize, generations, algorithm });
    audit('seed.evolve', 'seed', parent.id, { population: popSize, generations, algorithm }, req);
    res.json({ population: results, count: results.length, algorithm });
  });

  app.post('/api/seeds/breed', optionalAuth, validateBody(BreedSeedsSchema), (req: any, res: any) => {
    const parentA = seeds.find((s: any) => s.id === req.body.parent_a_id);
    const parentB = seeds.find((s: any) => s.id === req.body.parent_b_id);
    if (!parentA || !parentB) return res.status(404).json({ detail: 'Parent seed(s) not found' });
    const rng = rngFromHash((parentA.$hash || '') + (parentB.$hash || ''));
    const newGenes: Record<string, any> = {};
    const allKeys = new Set([...Object.keys(parentA.genes || {}), ...Object.keys(parentB.genes || {})]);
    for (const key of allKeys) {
      const geneA = (parentA.genes || {})[key];
      const geneB = (parentB.genes || {})[key];
      if (geneA && geneB && geneA.type === geneB.type && GENE_TYPES[geneA.type]) {
        newGenes[key] = { type: geneA.type, value: crossoverGene(geneA.type, geneA.value, geneB.value, rng) };
      } else if (geneA && geneB) {
        newGenes[key] = rng.nextBool() ? JSON.parse(JSON.stringify(geneA)) : JSON.parse(JSON.stringify(geneB));
      } else if (geneA) {
        newGenes[key] = JSON.parse(JSON.stringify(geneA));
      } else if (geneB) {
        newGenes[key] = JSON.parse(JSON.stringify(geneB));
      }
    }
    const breedHash = crypto.createHash('sha256').update(JSON.stringify(newGenes)).digest('hex');
    const newSeed: any = {
      ...parentA, id: deterministicSeedId(parentA.$hash || '', 'breed'),
      $domain: parentA.$domain, $name: `${parentA.$name} × ${parentB.$name}`,
      $lineage: { generation: Math.max(parentA.$lineage?.generation || 0, parentB.$lineage?.generation || 0) + 1, operation: 'breed', parents: [parentA.$hash, parentB.$hash], parent_ids: [parentA.id, parentB.id], ancestry_depth: Math.max(parentA.$lineage?.ancestry_depth || 0, parentB.$lineage?.ancestry_depth || 0) + 1, timestamp: 0 },
      $hash: breedHash,
      $fitness: { overall: Math.min(1.0, Math.max(0.0, ((parentA.$fitness?.overall || 0.5) + (parentB.$fitness?.overall || 0.5)) / 2 + (rng.nextF64() * 0.1 - 0.05))) },
      genes: newGenes,
    };
    seeds.push(newSeed);
    saveSeeds();
    metrics.seedsBred++;
    log('INFO', 'Seeds bred', { id: newSeed.id, parentA: parentA.id, parentB: parentB.id });
    audit('seed.breed', 'seed', newSeed.id, { parentA: parentA.id, parentB: parentB.id }, req);
    res.json(newSeed);
  });

  app.put('/api/seeds/:id/genes', optionalAuth, validateBody(EditGeneSchema), (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) return res.status(404).json({ detail: 'Not found' });
    if (!authorizeSeedMutation(seed, req, res, 'seed.edit_genes', audit)) return;
    const { gene_name, gene_type, value } = req.body;
    if (GENE_TYPES[gene_type]) {
      const result = validateGeneWithDetails(gene_type, value);
      if (!result.valid) {
        return res.status(400).json({ error: 'Invalid gene value', message: result.errors.join('. '), details: result.errors, suggestion: result.suggestion, docs: '/api/docs#genes' });
      }
    }
    if (!seed.genes) seed.genes = {};
    seed.genes[gene_name] = { type: gene_type, value };
    seed.$lineage = { generation: (seed.$lineage?.generation || 0) + 1, operation: 'mutate_gene', timestamp: 0 };
    seed.$hash = crypto.createHash('sha256').update(JSON.stringify(seed.genes)).digest('hex');
    saveSeeds();
    res.json(seed);
  });

  app.post('/api/seeds/distance', validateBody(SeedDistanceSchema), (req: any, res: any) => {
    const seedA = seeds.find((s: any) => s.id === req.body.seed_a_id);
    const seedB = seeds.find((s: any) => s.id === req.body.seed_b_id);
    if (!seedA || !seedB) return res.status(404).json({ detail: 'Seed(s) not found' });
    const distances: Record<string, number> = {};
    let totalDistance = 0;
    let geneCount = 0;
    const allKeys = new Set([...Object.keys(seedA.genes || {}), ...Object.keys(seedB.genes || {})]);
    for (const key of allKeys) {
      const gA = (seedA.genes || {})[key];
      const gB = (seedB.genes || {})[key];
      if (gA && gB && gA.type === gB.type && GENE_TYPES[gA.type]) {
        const d = distanceGene(gA.type, gA.value, gB.value);
        distances[key] = d;
        totalDistance += d;
        geneCount++;
      } else {
        distances[key] = 1.0;
        totalDistance += 1.0;
        geneCount++;
      }
    }
    res.json({ gene_distances: distances, average_distance: geneCount > 0 ? totalDistance / geneCount : 0, total_genes_compared: geneCount });
  });
}
