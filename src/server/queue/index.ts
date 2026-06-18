/**
 * Job Queue Initialization
 * 
 * Exports queue system and initializes with handlers.
 * 
 * Phase 16.4: Queue System Initialization
 * Date: 2026-06-18
 */

import Redis from 'ioredis';
import { JobQueue } from './job-queue';
import { jobHandlers } from './handlers';

let queueInstance: JobQueue | null = null;

/**
 * Initialize the job queue system
 */
export function initializeQueue(redisUrl?: string): JobQueue {
  if (queueInstance) {
    return queueInstance;
  }

  // Create Redis client
  const redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 3) {
        console.error('[Queue] Redis connection failed after 3 retries');
        return null;
      }
      return Math.min(times * 100, 3000);
    },
  });

  redis.on('error', (err) => {
    console.error('[Queue] Redis error:', err);
  });

  redis.on('connect', () => {
    console.log('[Queue] Connected to Redis');
  });

  // Create queue
  queueInstance = new JobQueue({
    redis,
    queueName: 'paradigm:jobs',
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    pollInterval: parseInt(process.env.QUEUE_POLL_INTERVAL || '1000', 10),
  });

  // Register all handlers
  Object.entries(jobHandlers).forEach(([type, handler]) => {
    queueInstance!.registerHandler(type, handler as any);
  });

  // Start processing
  queueInstance.start();

  console.log('[Queue] Job queue initialized with', Object.keys(jobHandlers).length, 'handlers');

  return queueInstance;
}

/**
 * Get the queue instance (must be initialized first)
 */
export function getQueue(): JobQueue {
  if (!queueInstance) {
    throw new Error('Queue not initialized. Call initializeQueue() first.');
  }
  return queueInstance;
}

/**
 * Shutdown the queue gracefully
 */
export async function shutdownQueue(): Promise<void> {
  if (queueInstance) {
    console.log('[Queue] Shutting down job queue...');
    await queueInstance.stop();
    queueInstance = null;
    console.log('[Queue] Job queue shut down');
  }
}

// Export types and classes
export { JobQueue } from './job-queue';
export type { Job, JobOptions, JobHandler } from './job-queue';
export * from './handlers';

// Made with Bob
