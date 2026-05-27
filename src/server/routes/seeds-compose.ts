/**
 * Seed compose routes (by ID, cross-domain, plan).
 * Slice 15 of the modular router split.
 */
import type { Express } from 'express';

export interface SeedsComposeDeps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  ComposeSeedSchema: any;
  crypto: { randomUUID: () => string };
  composeSeed: (seed: any, targetDomain: string) => any;
  findCompositionPath: (source: string, target: string) => { bridges: string[]; totalCoherence: number } | null;
  log: (level: string, msg: string, meta?: any) => void;
  audit: (action: string, resource: string, resourceId?: string, details?: any, req?: any) => void;
  metrics: { seedsComposed: number };
}

export function registerSeedsComposeRoutes(app: Express, deps: SeedsComposeDeps): void {
  const { seeds, saveSeeds, optionalAuth, validateBody, ComposeSeedSchema, crypto, composeSeed, findCompositionPath, log, audit, metrics } = deps;

  app.post('/api/seeds/:id/compose', optionalAuth, validateBody(ComposeSeedSchema), (req: any, res: any) => {
    const parent = seeds.find((s: any) => s.id === req.params.id);
    if (!parent) return res.status(404).json({ detail: 'Not found' });
    const targetDomain = req.body.target_domain;
    const composed = composeSeed(parent, targetDomain);
    if (!composed) { return res.status(400).json({ detail: `No composition path from ${parent.$domain} to ${targetDomain}` }); }
    (composed as any).id = crypto.randomUUID();
    seeds.push(composed as any);
    saveSeeds();
    const pathResult = findCompositionPath(parent.$domain || '', targetDomain);
    const pathFormatted = pathResult ? { path: pathResult.bridges.map(name => [parent.$domain, name, targetDomain]), cost: pathResult.bridges.length, coherence: pathResult.totalCoherence } : { path: [[parent.$domain, 'direct', targetDomain]], cost: 1 };
    metrics.seedsComposed++;
    log('INFO', 'Seed composed', { id: composed.id, from: parent.$domain, to: targetDomain });
    audit('seed.compose', 'seed', composed.id, { from: parent.$domain, to: targetDomain }, req);
    res.json({ seed: composed, path: pathFormatted });
  });

  app.post('/api/seeds/compose/cross-domain', optionalAuth, async (req: any, res: any) => {
    try {
      const { seed_ids, target_domain, strategy, weights, strict, name, persist } = req.body ?? {};
      if (!Array.isArray(seed_ids) || seed_ids.length === 0) { return res.status(400).json({ detail: 'seed_ids must be a non-empty array' }); }
      if (!target_domain || typeof target_domain !== 'string') { return res.status(400).json({ detail: 'target_domain required' }); }
      const inputs: any[] = [];
      const missing: string[] = [];
      for (const id of seed_ids) { const seed = seeds.find((s: any) => s.id === id); if (!seed) missing.push(id); else inputs.push(seed); }
      if (missing.length > 0) { return res.status(404).json({ detail: 'Unknown seed ids', missing }); }
      const { composeMultiDomain, planMultiDomainComposition } = await import('../../lib/composition/cross_domain.js');
      const plan = planMultiDomainComposition(inputs, target_domain);
      const result = composeMultiDomain(inputs, target_domain, { strategy, weights: Array.isArray(weights) ? weights : undefined, strict: Boolean(strict), name });
      const out: any = result.seed;
      if (persist) {
        out.id = crypto.randomUUID();
        seeds.push(out);
        saveSeeds();
        metrics.seedsComposed++;
        audit('seed.compose.cross_domain', 'seed', out.id, { strategy, target_domain, sources: seed_ids }, req);
      }
      log('INFO', 'Cross-domain compose', { strategy, target_domain, used: result.contributions.filter((c: any) => c.reachable).length });
      res.json({ seed: out, plan, contributions: result.contributions, resolutions: result.resolutions });
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      const status = /cannot reach|no input seed/i.test(msg) ? 422 : 400;
      res.status(status).json({ detail: msg });
    }
  });

  app.post('/api/seeds/compose/cross-domain/plan', optionalAuth, async (req: any, res: any) => {
    try {
      const { seed_ids, target_domain } = req.body ?? {};
      if (!Array.isArray(seed_ids) || seed_ids.length === 0) { return res.status(400).json({ detail: 'seed_ids must be a non-empty array' }); }
      if (!target_domain || typeof target_domain !== 'string') { return res.status(400).json({ detail: 'target_domain required' }); }
      const inputs = seed_ids.map((id: string) => seeds.find((s: any) => s.id === id)).filter((seed: any): seed is any => Boolean(seed));
      if (inputs.length !== seed_ids.length) { return res.status(404).json({ detail: 'Unknown seed ids' }); }
      const { planMultiDomainComposition } = await import('../../lib/composition/cross_domain.js');
      res.json(planMultiDomainComposition(inputs, target_domain));
    } catch (err: any) { res.status(400).json({ detail: err?.message ?? String(err) }); }
  });
}
