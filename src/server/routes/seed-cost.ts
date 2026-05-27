/**
 * Seed cost route — Doctrine v2 Part VIII.20 v0.
 *
 *   POST /api/seed/cost
 *     body: { seedId, license, intendedUse, saleAmountCents, lineage[],
 *             now?, royalty overrides… }
 *     → SeedCostResult
 */
import type { Express, Request, Response } from 'express';
import { computeSeedCost } from '../../lib/kernel/seed-cost.js';
import { isStructurallyValid, type IntendedUse } from '../../lib/kernel/seed-license.js';
import type { LineageNode } from '../../lib/kernel/lineage-royalty.js';

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

const ALLOWED_USES: IntendedUse[] = [
  'view', 'public-display', 'remix', 'commercial-display', 'commercial-resale', 'redistribute',
];

export function registerSeedCostRoutes(app: Express): void {
  app.post('/api/seed/cost', async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (typeof body.seedId !== 'string' || !body.seedId) {
      res.status(400).json({ error: 'seedId required (string)' });
      return;
    }
    if (!isStructurallyValid(body.license)) {
      res.status(400).json({ error: 'license is structurally invalid' });
      return;
    }
    if (typeof body.intendedUse !== 'string' || !ALLOWED_USES.includes(body.intendedUse as IntendedUse)) {
      res.status(400).json({ error: `intendedUse must be one of ${ALLOWED_USES.join(', ')}` });
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

    try {
      const result = await computeSeedCost({
        seedId: body.seedId,
        license: body.license,
        intendedUse: body.intendedUse as IntendedUse,
        saleAmountCents: body.saleAmountCents,
        lineage: body.lineage as LineageNode[],
        now: typeof body.now === 'string' ? body.now : undefined,
        platformAddress: typeof body.platformAddress === 'string' ? body.platformAddress : undefined,
        ancestorShareBp: typeof body.ancestorShareBp === 'number' ? body.ancestorShareBp : undefined,
        platformShareBp: typeof body.platformShareBp === 'number' ? body.platformShareBp : undefined,
        ancestorDecay: typeof body.ancestorDecay === 'number' ? body.ancestorDecay : undefined,
        maxDepth: typeof body.maxDepth === 'number' ? body.maxDepth : undefined,
      });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(400).json({ error: message });
    }
  });
}
