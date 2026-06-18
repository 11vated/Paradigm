/**
 * Job Queue API Routes
 *
 * REST API for managing background jobs.
 * Supports job creation, status checking, cancellation, and progress tracking.
 *
 * Phase 16.3: Job Queue API
 * Date: 2026-06-18
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { JobQueue, JobOptions } from '../queue/job-queue';

// Auth middleware type (to be provided by server)
type AuthMiddleware = (req: Request, res: Response, next: () => void) => void;

// Validation schemas
const createJobSchema = z.object({
  type: z.enum([
    'seed:generate',
    'seed:evolve',
    'seed:compose',
    'seed:batch',
    'seed:render',
    'seed:analyze',
  ]),
  data: z.record(z.string(), z.any()),
  options: z.object({
    priority: z.enum(['low', 'normal', 'high', 'critical']).optional(),
    maxRetries: z.number().min(0).max(10).optional(),
    timeout: z.number().min(1000).max(3600000).optional(), // 1s to 1h
    delay: z.number().min(0).max(86400000).optional(), // 0 to 24h
    metadata: z.record(z.string(), z.any()).optional(),
  }).optional(),
});

const cancelJobSchema = z.object({
  jobId: z.string().uuid(),
});

export function registerJobRoutes(
  app: Router,
  queue: JobQueue,
  authenticateToken?: AuthMiddleware
) {
  const router = Router();

  // Use auth if provided, otherwise allow all
  const auth = authenticateToken || ((req, res, next) => next());

  /**
   * POST /api/jobs
   * Create a new background job
   */
  router.post('/', auth, async (req: Request, res: Response) => {
    try {
      const body = createJobSchema.parse(req.body);
      
      // Add user ID to metadata
      const options: JobOptions = {
        ...body.options,
        metadata: {
          ...body.options?.metadata,
          userId: (req as any).user?.id,
          createdBy: (req as any).user?.username,
        },
      };

      const jobId = await queue.addJob(body.type, body.data, options);

      res.status(201).json({
        success: true,
        jobId,
        message: 'Job created successfully',
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: err.issues,
        });
      }

      console.error('Failed to create job:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to create job',
      });
    }
  });

  /**
   * GET /api/jobs/:jobId
   * Get job status and details
   */
  router.get('/:jobId', auth, async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      if (!jobId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid job ID format',
        });
      }

      const job = await queue.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Check if user owns this job
      const userId = (req as any).user?.id;
      if (job.options.metadata?.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      res.json({
        success: true,
        job: {
          id: job.id,
          type: job.type,
          status: job.status,
          progress: job.progress,
          result: job.result,
          error: job.error,
          attempts: job.attempts,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          completedAt: job.completedAt,
          updatedAt: job.updatedAt,
        },
      });
    } catch (err) {
      console.error('Failed to get job:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to get job',
      });
    }
  });

  /**
   * DELETE /api/jobs/:jobId
   * Cancel a pending job
   */
  router.delete('/:jobId', auth, async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      if (!jobId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid job ID format',
        });
      }

      const job = await queue.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }

      // Check if user owns this job
      const userId = (req as any).user?.id;
      if (job.options.metadata?.userId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }

      const cancelled = await queue.cancelJob(jobId);

      if (cancelled) {
        res.json({
          success: true,
          message: 'Job cancelled successfully',
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Job cannot be cancelled (already processing or completed)',
        });
      }
    } catch (err) {
      console.error('Failed to cancel job:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to cancel job',
      });
    }
  });

  /**
   * GET /api/jobs/stats
   * Get queue statistics
   */
  router.get('/stats', auth, async (req: Request, res: Response) => {
    try {
      const stats = await queue.getStats();

      res.json({
        success: true,
        stats,
      });
    } catch (err) {
      console.error('Failed to get queue stats:', err);
      res.status(500).json({
        success: false,
        error: 'Failed to get queue stats',
      });
    }
  });

  app.use('/api/jobs', router);
}

// Made with Bob
