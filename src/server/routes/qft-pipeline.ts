/**
 * QFT simulation and Pipeline execution routes.
 * Slice 21 of the modular router split.
 */
import type { Express } from 'express';

export interface QftPipelineDeps {
  seeds: any[];
  saveSeeds: () => void;
  optionalAuth: (req: any, res: any, next: any) => void;
  validateBody: (schema: any) => any;
  QftSimulateSchema: any;
  PipelineExecuteSchema: any;
  QFTEngine: { execute: (seeds: any[], params: any, jobId: string) => Promise<any> };
  ParadigmPipeline: { runEndToEnd: (seed: any, opts?: any) => Promise<any> };
  crypto: { randomUUID: () => string };
  log: (level: string, msg: string, meta?: any) => void;
}

export function registerQftPipelineRoutes(app: Express, deps: QftPipelineDeps): void {
  const { seeds, saveSeeds, optionalAuth, validateBody, QftSimulateSchema, PipelineExecuteSchema, QFTEngine, ParadigmPipeline, crypto, log } = deps;

  app.post('/api/qft/simulate', optionalAuth, validateBody(QftSimulateSchema), async (req: any, res: any) => {
    try {
      const { seed_id, parameters } = req.body;
      const seed = seeds.find((s: any) => s.id === seed_id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const jobId = crypto.randomUUID();
      const result = await QFTEngine.execute([seed], parameters || {}, jobId);
      if (result.result_seed) { seeds.push(result.result_seed); saveSeeds(); }
      log('INFO', 'QFT simulation complete', { seed_id, jobId });
      res.json(result);
    } catch (e: any) { log('ERROR', 'QFT simulation error', { error: e.message }); res.status(500).json({ detail: e.message || 'Simulation failed' }); }
  });

  app.post('/api/pipeline/execute', optionalAuth, validateBody(PipelineExecuteSchema), async (req: any, res: any) => {
    try {
      const { seed_id } = req.body;
      const seed = seeds.find((s: any) => s.id === seed_id);
      if (!seed) return res.status(404).json({ detail: 'Seed not found' });
      const result = await ParadigmPipeline.runEndToEnd(seed);
      if (result.unified_seed) { seeds.push(result.unified_seed); saveSeeds(); }
      log('INFO', 'Pipeline execution complete', { seed_id });
      res.json(result);
    } catch (e: any) { log('ERROR', 'Pipeline execution error', { error: e.message }); res.status(500).json({ detail: e.message || 'Pipeline execution failed' }); }
  });
}
