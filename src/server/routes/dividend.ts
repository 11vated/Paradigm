/**
 * Civilizational Dividend routes — Doctrine v2 Part VIII.19 v1.
 *
 *   GET  /api/dividend/health                → { ok, sampleHash }
 *   POST /api/dividend/epoch                  { epochId, dividendBp?, platformAddress? } → DividendEpoch
 *   POST /api/dividend/epoch/:id/add          { sale: LineageRoyaltyResult } → updated DividendEpoch
 *   POST /api/dividend/epoch/:id/close        → { epoch, distribution }
 *   GET  /api/dividend/epoch/:id              → DividendEpoch
 *
 * The store is in-memory for v1; v2 persists to disk + propagates
 * distributions through federation.
 */
import type { Express, Request, Response } from 'express';
import {
  openEpoch,
  addSale,
  closeEpoch,
  dividendSelfCheck,
  type DividendEpoch,
  type DividendDistribution,
} from '../../lib/kernel/civilizational-dividend.js';
import type { LineageRoyaltyResult } from '../../lib/kernel/lineage-royalty.js';

interface StoredEpoch {
  epoch: DividendEpoch;
  distribution?: DividendDistribution;
}

class EpochStore {
  private readonly map = new Map<string, StoredEpoch>();

  put(epoch: DividendEpoch, distribution?: DividendDistribution): void {
    this.map.set(epoch.epochId, { epoch, distribution });
  }
  get(id: string): StoredEpoch | undefined {
    return this.map.get(id);
  }
  size(): number { return this.map.size; }
}

function isLineageRoyaltyResult(v: unknown): v is LineageRoyaltyResult {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  return typeof r.saleAmountCents === 'number'
    && typeof r.manifest === 'string'
    && Array.isArray(r.splits);
}

export function createEpochStore(): EpochStore {
  return new EpochStore();
}

export function registerDividendRoutes(app: Express, opts: { store?: EpochStore } = {}): EpochStore {
  const store = opts.store ?? new EpochStore();

  app.get('/api/dividend/health', (_req: Request, res: Response) => {
    const check = dividendSelfCheck();
    res.status(check.ok ? 200 : 503).json({ ...check, storeSize: store.size() });
  });

  app.post('/api/dividend/epoch', (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { epochId?: unknown; dividendBp?: unknown; platformAddress?: unknown };
    if (typeof body.epochId !== 'string' || body.epochId.length === 0) {
      return res.status(400).json({ error: 'epochId is required' });
    }
    const dividendBp = typeof body.dividendBp === 'number' ? body.dividendBp : undefined;
    const platformAddress = typeof body.platformAddress === 'string' ? body.platformAddress : undefined;
    const epoch = openEpoch({ epochId: body.epochId, dividendBp, platformAddress });
    store.put(epoch);
    res.status(201).json(epoch);
  });

  app.get('/api/dividend/epoch/:id', (req: Request, res: Response) => {
    const stored = store.get(String(req.params.id));
    if (!stored) return res.status(404).json({ error: 'epoch not found' });
    res.json({ epoch: stored.epoch, distribution: stored.distribution ?? null });
  });

  app.post('/api/dividend/epoch/:id/add', (req: Request, res: Response) => {
    const stored = store.get(String(req.params.id));
    if (!stored) return res.status(404).json({ error: 'epoch not found' });
    const body = (req.body ?? {}) as { sale?: unknown };
    if (!isLineageRoyaltyResult(body.sale)) {
      return res.status(400).json({ error: 'sale must be a LineageRoyaltyResult' });
    }
    try {
      const next = addSale(stored.epoch, body.sale);
      store.put(next, stored.distribution);
      res.status(200).json(next);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.post('/api/dividend/epoch/:id/close', (req: Request, res: Response) => {
    const stored = store.get(String(req.params.id));
    if (!stored) return res.status(404).json({ error: 'epoch not found' });
    try {
      const result = closeEpoch(stored.epoch);
      store.put(result.epoch, result.distribution);
      res.status(200).json(result);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return store;
}
