/**
 * Royalty Routes — Phase 10
 * 
 * POST /royalty/calculate     — Compute royalty waterfall for a seed sale
 * POST /royalty/transaction   — Record a royalty transaction
 * GET  /royalty/ledger        — View all royalty transactions
 * GET  /royalty/summary       — Platform revenue summary
 * GET  /royalty/creator/:id   — Royalties earned by a creator
 */

import type { Request, Response } from 'express';
import { computeRoyaltyWaterfall, createRoyaltyTransaction, verifyRoyaltyTransaction, computePlatformRevenue, DEFAULT_ROYALTY_CONFIG } from '../../lib/sovereignty/royalty-waterfall';
import type { SeedLineage, RoyaltyTransaction } from '../../lib/sovereignty/royalty-waterfall';

// In-memory ledger (production: database)
const transactions: RoyaltyTransaction[] = [];
const lineage = new Map<string, SeedLineage>();

export function registerRoyaltyRoutes(app: any) {
  /**
   * POST /royalty/calculate
   * Compute royalty splits for a hypothetical sale.
   */
  app.post('/royalty/calculate', (req: Request, res: Response) => {
    const { seedHash, salePrice, currency } = req.body;

    if (!seedHash || !salePrice) {
      res.status(400).json({ error: 'Missing seedHash or salePrice' });
      return;
    }

    const seed = lineage.get(seedHash);
    if (!seed) {
      // Return default calculation with no ancestors
      const defaultSeed: SeedLineage = {
        seedId: seedHash,
        seedHash,
        creator: 'unknown',
        parentIds: [],
        generation: 0,
        createdAt: Date.now(),
      };
      const result = computeRoyaltyWaterfall(defaultSeed, salePrice, lineage);
      res.json({ ...result, currency: currency || 'PARA' });
      return;
    }

    const result = computeRoyaltyWaterfall(seed, salePrice, lineage);
    res.json({ ...result, currency: currency || 'PARA' });
  });

  /**
   * POST /royalty/transaction
   * Record a royalty transaction.
   */
  app.post('/royalty/transaction', (req: Request, res: Response) => {
    const { seedHash, buyerId, sellerId, salePrice, currency } = req.body;

    if (!seedHash || !buyerId || !sellerId || !salePrice) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const seed = lineage.get(seedHash) || {
      seedId: seedHash,
      seedHash,
      creator: sellerId,
      parentIds: [],
      generation: 0,
      createdAt: Date.now(),
    };

    const tx = createRoyaltyTransaction(seed, buyerId, sellerId, salePrice, currency || 'PARA', lineage);
    transactions.push(tx);

    res.json({
      transactionId: tx.transactionId,
      splits: tx.splits,
      totalRoyalty: tx.totalRoyalty,
      platformFee: tx.platformFee,
      sellerAmount: tx.sellerAmount,
      verified: verifyRoyaltyTransaction(tx),
    });
  });

  /**
   * GET /royalty/ledger
   * View all royalty transactions.
   */
  app.get('/royalty/ledger', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    res.json({
      transactions: transactions.slice(offset, offset + limit),
      total: transactions.length,
    });
  });

  /**
   * GET /royalty/summary
   * Platform revenue summary.
   */
  app.get('/royalty/summary', (req: Request, res: Response) => {
    const summary = computePlatformRevenue(transactions);
    res.json(summary);
  });

  /**
   * GET /royalty/creator/:id
   * Royalties earned by a specific creator.
   */
  app.get('/royalty/creator/:id', (req: Request, res: Response) => {
    const creatorId = req.params.id;
    const creatorTxs = transactions.filter(tx =>
      tx.splits.some(s => s.ancestorId === creatorId)
    );

    let totalEarned = 0;
    for (const tx of creatorTxs) {
      for (const split of tx.splits) {
        if (split.ancestorId === creatorId) {
          totalEarned += split.amount;
        }
      }
    }

    res.json({
      creatorId,
      transactionCount: creatorTxs.length,
      totalEarned,
      transactions: creatorTxs.slice(0, 20),
    });
  });

  console.log('[Royalty] Routes registered at /royalty/*');
}
