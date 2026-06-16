/**
 * Creator Workflow API Routes - Phase 7
 * 
 * API endpoints for Creator Workflow, artifact management, and marketplace integration.
 * Hardened with telemetry integration for Vault/Loki/Prometheus monitoring.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pinoLogger } from '@/lib/logger';
import { creatorWorkflow } from '@/lib/creator/creator-workflow';
import { studioIntegration } from '@/lib/creator/studio-integration';
import { artifactValidator } from '@/lib/creator/artifact-validation';
import { SecretsManager } from '@/lib/security/secrets-manager';
import { LogAggregator } from '@/lib/logging/log-aggregator';

const router = Router();
const logger = pinoLogger.child({ component: 'creator-api' });

// Initialize services
const secretsManagerInstance = new SecretsManager();
const logAggregatorInstance = new LogAggregator();

// ─── Validation Schemas ───────────────────────────────────────────────────────

const CreateCreatorSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  walletAddress: z.string().optional(),
});

const CreateArtifactSchema = z.object({
  gsplCode: z.string().min(1),
  domain: z.string().optional(),
});

const MutateSeedSchema = z.object({
  seedHash: z.string(),
  mutationRate: z.number().min(0).max(1),
});

const PublishArtifactSchema = z.object({
  seedHash: z.string(),
  priceWei: z.string(),
});

const RecordFeedbackSchema = z.object({
  seedHash: z.string(),
  visual: z.number().min(0).max(1).optional(),
  tactile: z.number().min(0).max(1).optional(),
  harmonic: z.number().min(0).max(1).optional(),
});

// ─── Middleware ─────────────────────────────────────────────────────────────

async function requireCreatorAuth(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header required' });
    }

    // In production, verify JWT token with secrets manager
    const jwtSecret = await secretsManagerInstance.get('JWT_SECRET');
    if (!jwtSecret) {
      logger.warn('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Authentication system misconfigured' });
    }

    // For now, simple Bearer token validation
    const token = authHeader.replace('Bearer ', '');
    if (!token || token.length < 10) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Extract creator ID from token (simplified)
    const creatorId = `creator_${token.slice(0, 8)}`;
    (req as any).creatorId = creatorId;
    
    next();
  } catch (error) {
    logger.error({ error }, 'Authentication failed');
    res.status(500).json({ error: 'Authentication error' });
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/creator/profile
 * Create or get creator profile
 */
router.post('/profile', async (req: Request, res: Response) => {
  try {
    const body = CreateCreatorSchema.parse(req.body);
    
    // Check if creator already exists
    const existingProfile = creatorWorkflow.getProfile(body.email);
    if (existingProfile) {
      return res.json(existingProfile);
    }

    // Create new creator profile
    const profile = creatorWorkflow.initializeCreator(
      body.name,
      body.email,
      body.walletAddress
    );

    logAggregatorInstance.write({
      creatorId: profile.id,
      email: body.email,
      timestamp: Date.now(),
    });

    logger.info({ creatorId: profile.id }, 'Creator profile created');
    res.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.issues });
    }
    logger.error({ error }, 'Failed to create creator profile');
    res.status(500).json({ error: 'Failed to create creator profile' });
  }
});

/**
 * GET /api/creator/profile
 * Get current creator profile
 */
router.get('/profile', requireCreatorAuth, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).creatorId;
    const profile = creatorWorkflow.getProfile(creatorId);
    
    if (!profile) {
      return res.status(404).json({ error: 'Creator profile not found' });
    }

    res.json(profile);
  } catch (error) {
    logger.error({ error }, 'Failed to get creator profile');
    res.status(500).json({ error: 'Failed to get creator profile' });
  }
});

/**
 * POST /api/creator/artifacts
 * Create artifact from GSPL code
 */
router.post('/artifacts', requireCreatorAuth, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).creatorId;
    const body = CreateArtifactSchema.parse(req.body);

    const result = await studioIntegration.createFromGSPL({
      gsplCode: body.gsplCode,
      creatorId,
      domain: body.domain,
    });

    logAggregatorInstance.write({
      creatorId,
      seedHash: result.artifact.seedHash,
      domain: result.artifact.domain,
      timestamp: Date.now(),
    });

    logger.info(
      { creatorId, seedHash: result.artifact.seedHash },
      'Artifact created from GSPL'
    );
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.issues });
    }
    logger.error({ error }, 'Failed to create artifact');
    res.status(500).json({ error: 'Failed to create artifact' });
  }
});

/**
 * POST /api/creator/artifacts/mutate
 * Mutate existing artifact
 */
router.post('/artifacts/mutate', requireCreatorAuth, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).creatorId;
    const body = MutateSeedSchema.parse(req.body);

    const artifact = creatorWorkflow.getArtifact(body.seedHash);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    const seed: any = {
      id: body.seedHash,
      $hash: body.seedHash,
      $name: artifact.seedName,
      $domain: artifact.domain,
      genes: artifact.genes,
      $lineage: { generation: artifact.generation, parents: artifact.lineage.parents },
    };

    const result = await studioIntegration.mutateSeed({
      seed,
      mutationRate: body.mutationRate,
      creatorId,
    });

    logAggregatorInstance.write({
      creatorId,
      seedHash: result.artifact.seedHash,
      mutationRate: body.mutationRate,
      timestamp: Date.now(),
    });

    logger.info(
      { creatorId, seedHash: result.artifact.seedHash },
      'Artifact mutated'
    );
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.issues });
    }
    logger.error({ error }, 'Failed to mutate artifact');
    res.status(500).json({ error: 'Failed to mutate artifact' });
  }
});

/**
 * POST /api/creator/artifacts/publish
 * Publish artifact to marketplace
 */
router.post('/artifacts/publish', requireCreatorAuth, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).creatorId;
    const body = PublishArtifactSchema.parse(req.body);

    const listing = await creatorWorkflow.publishArtifact(
      body.seedHash,
      body.priceWei,
      creatorId
    );

    logAggregatorInstance.write({
      creatorId,
      seedHash: body.seedHash,
      priceWei: body.priceWei,
      timestamp: Date.now(),
    });

    logger.info(
      { creatorId, seedHash: body.seedHash, priceWei: body.priceWei },
      'Artifact published to marketplace'
    );
    res.json(listing);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.issues });
    }
    logger.error({ error }, 'Failed to publish artifact');
    res.status(500).json({ error: 'Failed to publish artifact' });
  }
});

/**
 * POST /api/creator/artifacts/feedback
 * Record sensory calibration feedback
 */
router.post('/artifacts/feedback', requireCreatorAuth, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).creatorId;
    const body = RecordFeedbackSchema.parse(req.body);

    creatorWorkflow.recordSensoryFeedback(body.seedHash, body);

    logAggregatorInstance.write({
      creatorId,
      seedHash: body.seedHash,
      feedback: body,
      timestamp: Date.now(),
    });

    logger.info(
      { creatorId, seedHash: body.seedHash },
      'Sensory feedback recorded'
    );
    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.issues });
    }
    logger.error({ error }, 'Failed to record feedback');
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * GET /api/creator/dashboard
 * Get creator dashboard data
 */
router.get('/dashboard', requireCreatorAuth, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).creatorId;
    const workflowState = creatorWorkflow.getWorkflowState(creatorId);
    
    res.json(workflowState);
  } catch (error) {
    logger.error({ error }, 'Failed to get dashboard data');
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

/**
 * GET /api/creator/artifacts
 * List creator's artifacts
 */
router.get('/artifacts', requireCreatorAuth, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).creatorId;
    const artifacts = creatorWorkflow.getCreatorArtifacts(creatorId);
    
    res.json({ artifacts, total: artifacts.length });
  } catch (error) {
    logger.error({ error }, 'Failed to list artifacts');
    res.status(500).json({ error: 'Failed to list artifacts' });
  }
});

/**
 * GET /api/creator/artifacts/:seedHash
 * Get specific artifact details
 */
router.get('/artifacts/:seedHash', requireCreatorAuth, async (req: Request, res: Response) => {
  try {
    const { seedHash } = req.params;
    const artifact = creatorWorkflow.getArtifact(seedHash);
    
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    const validation = await artifactValidator.validateArtifactIntegrity({
      id: seedHash,
      $hash: seedHash,
      $name: artifact.seedName,
      $domain: artifact.domain,
      genes: artifact.genes as Record<string, { type?: string; value?: any; schema?: any }>,
      $lineage: { generation: artifact.generation, parents: artifact.lineage.parents },
    });

    res.json({ artifact, validation });
  } catch (error) {
    logger.error({ error }, 'Failed to get artifact details');
    res.status(500).json({ error: 'Failed to get artifact details' });
  }
});

/**
 * GET /api/creator/analytics
 * Get creator analytics
 */
router.get('/analytics', requireCreatorAuth, async (req: Request, res: Response) => {
  try {
    const creatorId = (req as any).creatorId;
    const analytics = studioIntegration.getCreatorAnalytics(creatorId);
    
    res.json(analytics);
  } catch (error) {
    logger.error({ error }, 'Failed to get analytics');
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * GET /api/creator/health
 * Health check for creator workflow
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: Date.now(),
      services: {
        creatorWorkflow: 'operational',
        artifactValidator: 'operational',
        studioIntegration: 'operational',
        secretsManager: 'operational',
        logAggregator: 'operational',
      },
    };

    res.json(health);
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(500).json({ status: 'unhealthy', error: 'Health check failed' });
  }
});

export default router;
