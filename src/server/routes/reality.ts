/**
 * Reality HTTP — POST /api/reality/{render,channels,batch}.
 *
 * Doctrinal headline: anyone hitting Paradigm's HTTP surface can now
 * render reality (including the unseen) from a single request.
 *
 *   POST /api/reality/channels  -> list 12 unseen channels + 9 dimensions
 *   POST /api/reality/render    -> FieldArtifact
 *   POST /api/reality/batch     -> FieldArtifact[]
 *
 * Added by paradigm-infinite/ws-33.
 */
import type { Express, Request, Response, RequestHandler } from 'express';
import * as os from 'node:os';
import * as path from 'node:path';
import { createRealitySeed, UNSEEN_CHANNELS, DIMENSIONS } from '../../seeds/reality-seed';
import { renderReality, renderRealityBatch } from '../../lib/engines/reality';

interface Deps {
  optionalAuth: RequestHandler;
  log: any;
  outputRoot?: string;
}

export function registerRealityRoutes(app: Express, deps: Deps): void {
  const { optionalAuth, log } = deps;
  const baseOutDir = deps.outputRoot ?? path.join(os.tmpdir(), 'paradigm-reality-http');

  app.get('/api/reality/channels', (_req: Request, res: Response) => {
    res.json({
      channels: UNSEEN_CHANNELS,
      dimensions: DIMENSIONS,
    });
  });

  app.post('/api/reality/render', optionalAuth, async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      const channel = String(body.channel ?? '');
      if (!UNSEEN_CHANNELS.includes(channel as typeof UNSEEN_CHANNELS[number])) {
        res.status(400).json({ error: 'unknown channel', valid: UNSEEN_CHANNELS });
        return;
      }
      const seed = createRealitySeed({
        prompt: typeof body.prompt === 'string' ? body.prompt : `render ${channel}`,
        channel: channel as typeof UNSEEN_CHANNELS[number],
        dimensions: body.dimensions,
        counterfactual: Boolean(body.counterfactual),
        constants: body.constants,
      });
      const outDir = path.join(baseOutDir, seed.$hash ?? 'no-hash');
      const artifact = await renderReality(seed, outDir);
      res.json({ seed: { hash: seed.$hash, channel: seed.channel, dimensions: seed.dimensions }, artifact });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('ERROR', '/api/reality/render', msg);
      res.status(500).json({ error: msg });
    }
  });

  app.post('/api/reality/batch', optionalAuth, async (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      const channels: string[] = Array.isArray(body.channels) ? body.channels : [];
      if (channels.length === 0) {
        res.status(400).json({ error: 'channels[] required' });
        return;
      }
      for (const c of channels) {
        if (!UNSEEN_CHANNELS.includes(c as typeof UNSEEN_CHANNELS[number])) {
          res.status(400).json({ error: 'unknown channel', channel: c, valid: UNSEEN_CHANNELS });
          return;
        }
      }
      const prompt = typeof body.prompt === 'string' ? body.prompt : 'reality batch';
      const seeds = channels.map((c) =>
        createRealitySeed({ prompt, channel: c as typeof UNSEEN_CHANNELS[number] }),
      );
      const outDir = path.join(baseOutDir, `batch-${seeds[0].$hash}`);
      const artifacts = await renderRealityBatch(seeds, outDir);
      res.json({ count: artifacts.length, artifacts });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('ERROR', '/api/reality/batch', msg);
      res.status(500).json({ error: msg });
    }
  });
}
