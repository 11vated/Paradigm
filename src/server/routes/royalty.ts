/**
 * Royalty routes — Doctrine v2 Part VIII.17 v1.
 *
 * Exposes the lineage-royalty engine over HTTP so external clients
 * (marketplaces, smart-contract bridges, accounting) can request a
 * canonical, on-chain-anchorable royalty manifest for a sale.
 *
 *   POST /api/royalty/compute
 *     body: { seedId, saleAmountCents, lineage: LineageNode[],
 *             ancestorShareBp?, platformShareBp?, ancestorDecay?,
 *             maxDepth?, platformAddress? }
 *     → { schema, seedId, splits, totalCents, manifest }
 *
 *   GET  /api/royalty/example
 *     → a stable worked-example payload, useful for client integrators
 *
 * The lineage is supplied INLINE by the caller — this v1 does not look
 * up lineage from the federation peer store. That keeps the endpoint
 * stateless and side-effect-free; the smart-contract author is
 * responsible for assembling the lineage they want to honor.
 */
import type { Express, Request, Response } from 'express';
import {
  computeLineageRoyalty,
  type LineageNode,
  type LineageResolver,
} from '../../lib/kernel/lineage-royalty.js';

interface ComputeBody {
  seedId?: unknown;
  saleAmountCents?: unknown;
  lineage?: unknown;
  ancestorShareBp?: unknown;
  platformShareBp?: unknown;
  ancestorDecay?: unknown;
  maxDepth?: unknown;
  platformAddress?: unknown;
}

function isLineageNode(x: unknown): x is LineageNode {
  if (!x || typeof x !== 'object') return false;
  const n = x as Record<string, unknown>;
  return (
    typeof n.seedId === 'string' &&
    typeof n.authorAddress === 'string' &&
    Array.isArray(n.parents) &&
    n.parents.every((p) => typeof p === 'string')
  );
}

export function registerRoyaltyRoutes(app: Express): void {
  app.post('/api/royalty/compute', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as ComputeBody;
    if (typeof body.seedId !== 'string' || body.seedId.length === 0) {
      res.status(400).json({ error: 'seedId required (string)' });
      return;
    }
    if (typeof body.saleAmountCents !== 'number' || !Number.isFinite(body.saleAmountCents) || body.saleAmountCents < 0) {
      res.status(400).json({ error: 'saleAmountCents required (non-negative finite number)' });
      return;
    }
    if (!Array.isArray(body.lineage) || !body.lineage.every(isLineageNode)) {
      res.status(400).json({ error: 'lineage required (array of {seedId, authorAddress, parents})' });
      return;
    }
    const lineageMap = new Map<string, LineageNode>((body.lineage as LineageNode[]).map((n) => [n.seedId, n]));
    if (!lineageMap.has(body.seedId)) {
      res.status(400).json({ error: `lineage must include the root seedId (${body.seedId})` });
      return;
    }
    const resolveLineage: LineageResolver = async (id) => lineageMap.get(id) ?? null;

    try {
      const result = await computeLineageRoyalty({
        seedId: body.seedId,
        saleAmountCents: body.saleAmountCents,
        resolveLineage,
        ancestorShareBp: typeof body.ancestorShareBp === 'number' ? body.ancestorShareBp : undefined,
        platformShareBp: typeof body.platformShareBp === 'number' ? body.platformShareBp : undefined,
        ancestorDecay: typeof body.ancestorDecay === 'number' ? body.ancestorDecay : undefined,
        maxDepth: typeof body.maxDepth === 'number' ? body.maxDepth : undefined,
        platformAddress: typeof body.platformAddress === 'string' ? body.platformAddress : undefined,
      });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: message });
    }
  });

  app.get('/api/royalty/example', async (_req: Request, res: Response) => {
    // Stable worked-example for integrators. Three-generation chain.
    const lineage: LineageNode[] = [
      { seedId: 'great-grandchild', authorAddress: '0xGreatGrandchild', parents: ['grandchild'] },
      { seedId: 'grandchild',       authorAddress: '0xGrandchild',      parents: ['child'] },
      { seedId: 'child',            authorAddress: '0xChild',           parents: ['parent'] },
      { seedId: 'parent',           authorAddress: '0xParent',          parents: [] },
    ];
    const map = new Map(lineage.map((n) => [n.seedId, n]));
    const result = await computeLineageRoyalty({
      seedId: 'great-grandchild',
      saleAmountCents: 10_000,
      resolveLineage: async (id) => map.get(id) ?? null,
    });
    res.json({ lineage, result });
  });
}
