/**
 * Per-seed sovereignty routes (slice of the modular router split).
 *
 * Extracted from server.ts lines 1882-1920 by paradigm-infinite/ws-25.
 * Doctrine: 12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md — server.ts
 * decomposition workstream (batch 5).
 */
import type { Express, Request, Response, RequestHandler } from 'express';

interface Deps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: RequestHandler;
  validateBody: (schema: any) => RequestHandler;
  schemas: { signSeed: any; verifySeed: any };
  SovereigntyLayer: {
    generateKeys: () => any;
    signSeed: (seed: any, privateKey: string) => any;
    verifySeed: (seed: any, publicKey: string) => boolean;
  };
  log: (level: any, msg: string, meta?: Record<string, unknown>) => void;
  audit: (action: string, target: string, targetId: string, payload: Record<string, unknown>, req: Request) => void;
}

export function registerSeedSovereigntyRoutes(app: Express, deps: Deps): void {
  const {
    seeds, saveSeeds, optionalAuth, validateBody, schemas,
    SovereigntyLayer, log, audit,
  } = deps;

  app.post('/api/keys/generate', (_req: Request, res: Response) => {
    try {
      const keys = SovereigntyLayer.generateKeys();
      res.json(keys);
    } catch (e: any) {
      res.status(500).json({ detail: e.message || 'Key generation failed' });
    }
  });

  app.post('/api/seeds/:id/sign', optionalAuth, validateBody(schemas.signSeed), (req: any, res: any) => {
    try {
      const seedIndex = seeds.findIndex((s: any) => s.id === req.params.id);
      if (seedIndex === -1) return res.status(404).json({ detail: 'Seed not found' });

      const seed = seeds[seedIndex];
      const sovereignty = SovereigntyLayer.signSeed(seed, req.body.private_key);
      seeds[seedIndex] = { ...seed, $sovereignty: sovereignty };
      saveSeeds();

      const verified = SovereigntyLayer.verifySeed(seeds[seedIndex], sovereignty.public_key);
      log('INFO', 'Seed signed', { id: seed.id });
      audit('seed.sign', 'seed', seed.id, {}, req);
      res.json({ sovereignty, verified });
    } catch (e: any) {
      log('ERROR', 'Signing error', { error: e.message });
      res.status(500).json({ detail: e.message || 'Signing failed' });
    }
  });

  app.post('/api/seeds/:id/verify', validateBody(schemas.verifySeed), (req: any, res: any) => {
    try {
      const seed = seeds.find((s: any) => s.id === req.params.id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });

      const verified = SovereigntyLayer.verifySeed(seed, req.body.public_key);
      res.json({ verified });
    } catch (e: any) {
      res.status(500).json({ detail: e.message || 'Verification failed' });
    }
  });
}
