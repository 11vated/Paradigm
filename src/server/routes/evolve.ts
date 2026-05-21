/**
 * Evolution job query routes — status / result / cancel.
 * Slice 6 of the modular router split.
 */
import type { Express } from 'express';

export interface EvolveDeps {
  optionalAuth: (req: any, res: any, next: any) => void;
  evolutionJobs: Map<string, any>;
}

export function registerEvolveRoutes(app: Express, deps: EvolveDeps): void {
  const { optionalAuth, evolutionJobs } = deps;

  app.get('/api/evolve/:jobId/status', optionalAuth, (req: any, res: any) => {
    const job = evolutionJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ detail: 'Job not found' });
    
    // Return job info without sensitive data
    res.json({
    id: job.id,
    status: job.status,
    algorithm: job.algorithm,
    populationSize: job.populationSize,
    generations: job.generations,
    seedId: job.seedId,
    createdAt: job.createdAt,
    completedAt: job.completedAt
    });
  });

  // Get result of a completed evolution job
  app.get('/api/evolve/:jobId/result', optionalAuth, (req: any, res: any) => {
    const job = evolutionJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ detail: 'Job not found' });
    
    if (job.status !== 'completed') {
    return res.status(400).json({ 
      detail: `Job is not completed. Current status: ${job.status}` 
    });
    }
    
    res.json({
    id: job.id,
    status: job.status,
    result: job.result,
    completedAt: job.completedAt
    });
  });

  // Cancel an evolution job (only works if still queued or running)
  app.delete('/api/evolve/:jobId/cancel', optionalAuth, (req: any, res: any) => {
    const job = evolutionJobs.get(req.params.jobId);
    if (!job) return res.status(404).json({ detail: 'Job not found' });
    
    if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    return res.status(400).json({ 
      detail: `Cannot cancel job with status: ${job.status}` 
    });
    }
    
    job.status = 'cancelled';
    job.completedAt = Date.now();
    
    res.json({ 
    id: job.id, 
    status: job.status, 
    completedAt: job.completedAt 
    });
  });
}
