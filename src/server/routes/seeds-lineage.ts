/**
 * Seed lineage and descendent routes.
 * Slice 13 of the modular router split.
 */
import type { Express } from 'express';

export interface SeedsLineageDeps {
  seeds: any[];
}

export function registerSeedsLineageRoutes(app: Express, deps: SeedsLineageDeps): void {
  const { seeds } = deps;

  app.get('/api/seeds/:id/lineage', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) { return res.status(404).json({ error: 'Seed not found', message: `No seed found with ID '${req.params.id}'`, suggestion: 'Check the seed ID and try again', example: { id: '53a6edaf-9a76-46ea-845b-ae283e8ad21c' }, docs: '/api/docs#lineage' }); }
    const lineage: any[] = [];
    const visited = new Set<string>();
    const queue = [{ seed, depth: 0 }];
    while (queue.length > 0 && queue.length < 100) {
      const { seed: current, depth } = queue.shift()!;
      if (visited.has(current.$hash)) continue;
      visited.add(current.$hash);
      lineage.push({ id: current.id, hash: current.$hash, name: current.$name, domain: current.$domain, generation: current.$lineage?.generation || 0, operation: current.$lineage?.operation || 'primordial', parents: current.$lineage?.parents || [], parent_ids: current.$lineage?.parent_ids || [], depth });
      const parentHashes = current.$lineage?.parents || [];
      for (const parentHash of parentHashes) {
        const parent = seeds.find((s: any) => s.$hash === parentHash);
        if (parent && !visited.has(parent.$hash)) { queue.push({ seed: parent, depth: depth + 1 }); }
      }
    }
    lineage.sort((a, b) => a.depth - b.depth);
    res.json({ seed_id: req.params.id, seed_hash: seed.$hash, lineage, total_ancestors: lineage.length - 1, max_depth: Math.max(...lineage.map(l => l.depth)), docs: '/api/docs#lineage' });
  });

  app.get('/api/seeds/:id/descendants', async (req: any, res: any) => {
    const seed = seeds.find((s: any) => s.id === req.params.id);
    if (!seed) { return res.status(404).json({ error: 'Seed not found', message: `No seed found with ID '${req.params.id}'`, suggestion: 'Check the seed ID and try again', docs: '/api/docs#descendants' }); }
    const descendants: any[] = [];
    for (const s of seeds) {
      if (s.id === seed.id) continue;
      const parents = s.$lineage?.parents || [];
      if (parents.includes(seed.$hash)) { descendants.push({ id: s.id, hash: s.$hash, name: s.$name, domain: s.$domain, generation: s.$lineage?.generation || 0, operation: s.$lineage?.operation || 'unknown', relationship: 'child' }); }
    }
    const limited = descendants.slice(0, 100);
    res.json({ seed_id: req.params.id, seed_hash: seed.$hash, descendants: limited, total_descendants: descendants.length, limited: descendants.length > 100, docs: '/api/docs#descendants' });
  });
}
