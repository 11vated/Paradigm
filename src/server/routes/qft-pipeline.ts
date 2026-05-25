/**
 * QFT + Pipeline execution routes (slice of the modular router split).
 *
 * Extracted from server.ts lines 1836-1876 by paradigm-infinite/ws-22.
 * Doctrine: 12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md — server.ts
 * decomposition workstream (batch 4).
 */
import type { Express, Request, Response, RequestHandler } from 'express';
import * as crypto from 'node:crypto';

type ValidatorFactory = (schema: any) => RequestHandler;

export interface QftPipelineDeps {
  seeds: { id: string; [k: string]: unknown }[];
  saveSeeds: () => void;
  optionalAuth: RequestHandler;
  validateBody: ValidatorFactory;
  schemas: { qftSimulate: any; pipelineExecute: any };
  QFTEngine: { execute(seeds: unknown[], parameters: unknown, jobId: string): Promise<{ result_seed?: unknown; [k: string]: unknown }> };
  ParadigmPipeline: { runEndToEnd(seed: unknown): Promise<{ unified_seed?: unknown; [k: string]: unknown }> };
  log: (level: any, msg: string, meta?: Record<string, unknown>) => void;
}

export function registerQftPipelineRoutes(app: Express, deps: QftPipelineDeps): void {
  const { seeds, saveSeeds, optionalAuth, validateBody, schemas, QFTEngine, ParadigmPipeline, log } = deps;

  app.post(
    '/api/qft/simulate',
    optionalAuth,
    validateBody(schemas.qftSimulate),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const body = req.body as { seed_id?: string; parameters?: unknown };
        const seed = seeds.find((s) => s.id === body.seed_id);
        if (!seed) {
          res.status(404).json({ detail: 'Seed not found' });
          return;
        }
        const jobId = crypto.randomUUID();
        const result = await QFTEngine.execute([seed], body.parameters ?? {}, jobId);
        if (result.result_seed) {
          seeds.push(result.result_seed as { id: string });
          saveSeeds();
        }
        log('INFO', 'QFT simulation complete', { seed_id: body.seed_id, jobId });
        res.json(result);
      } catch (e) {
        const err = e as Error;
        log('ERROR', 'QFT simulation error', { error: err.message });
        res.status(500).json({ detail: err.message || 'Simulation failed' });
      }
    },
  );

  app.post(
    '/api/pipeline/execute',
    optionalAuth,
    validateBody(schemas.pipelineExecute),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const body = req.body as { seed_id?: string };
        const seed = seeds.find((s) => s.id === body.seed_id);
        if (!seed) {
          res.status(404).json({ detail: 'Seed not found' });
          return;
        }
        const result = await ParadigmPipeline.runEndToEnd(seed);
        if (result.unified_seed) {
          seeds.push(result.unified_seed as { id: string });
          saveSeeds();
        }
        log('INFO', 'Pipeline execution complete', { seed_id: body.seed_id });
        res.json(result);
      } catch (e) {
        const err = e as Error;
        log('ERROR', 'Pipeline execution error', { error: err.message });
        res.status(500).json({ detail: err.message || 'Pipeline execution failed' });
      }
    },
  );
}
