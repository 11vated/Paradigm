/**
 * Job Queue System
 * 
 * Redis-based background job processing for long-running operations.
 * Supports job priorities, retries, timeouts, and progress tracking.
 * 
 * Phase 16.1: Job Queue Infrastructure
 * Date: 2026-06-18
 */

import Redis from 'ioredis';
import { randomUUID } from 'crypto';

export interface JobOptions {
  priority?: 'low' | 'normal' | 'high' | 'critical';
  maxRetries?: number;
  timeout?: number; // milliseconds
  delay?: number; // milliseconds to delay execution
  metadata?: Record<string, any>;
}

export interface Job<T = any> {
  id: string;
  type: string;
  data: T;
  options: Required<JobOptions>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0-100
  result?: any;
  error?: string;
  attempts: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  updatedAt: number;
}

export type JobHandler<T = any, R = any> = (
  job: Job<T>,
  updateProgress: (progress: number) => Promise<void>
) => Promise<R>;

interface QueueConfig {
  redis: Redis;
  queueName?: string;
  concurrency?: number;
  pollInterval?: number;
}

export class JobQueue {
  private redis: Redis;
  private queueName: string;
  private handlers: Map<string, JobHandler> = new Map();
  private processing: Set<string> = new Set();
  private concurrency: number;
  private pollInterval: number;
  private isRunning = false;
  private pollTimer?: NodeJS.Timeout;

  constructor(config: QueueConfig) {
    this.redis = config.redis;
    this.queueName = config.queueName || 'paradigm:jobs';
    this.concurrency = config.concurrency || 5;
    this.pollInterval = config.pollInterval || 1000;
  }

  /**
   * Register a job handler
   */
  registerHandler<T = any, R = any>(type: string, handler: JobHandler<T, R>): void {
    if (this.handlers.has(type)) {
      throw new Error(`Handler for job type "${type}" already registered`);
    }
    this.handlers.set(type, handler);
  }

  /**
   * Add a job to the queue
   */
  async addJob<T = any>(
    type: string,
    data: T,
    options: JobOptions = {}
  ): Promise<string> {
    const jobId = randomUUID();
    
    const job: Job<T> = {
      id: jobId,
      type,
      data,
      options: {
        priority: options.priority || 'normal',
        maxRetries: options.maxRetries ?? 3,
        timeout: options.timeout || 300000, // 5 minutes default
        delay: options.delay || 0,
        metadata: options.metadata || {},
      },
      status: 'pending',
      progress: 0,
      attempts: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Store job data
    await this.redis.set(
      `${this.queueName}:job:${jobId}`,
      JSON.stringify(job),
      'EX',
      86400 // 24 hours TTL
    );

    // Add to appropriate priority queue
    const queueKey = this.getQueueKey(job.options.priority);
    const score = Date.now() + job.options.delay;
    await this.redis.zadd(queueKey, score, jobId);

    return jobId;
  }

  /**
   * Get job status
   */
  async getJob(jobId: string): Promise<Job | null> {
    const data = await this.redis.get(`${this.queueName}:job:${jobId}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  /**
   * Update job progress
   */
  async updateJobProgress(jobId: string, progress: number): Promise<void> {
    const job = await this.getJob(jobId);
    if (!job) return;

    job.progress = Math.max(0, Math.min(100, progress));
    job.updatedAt = Date.now();

    await this.redis.set(
      `${this.queueName}:job:${jobId}`,
      JSON.stringify(job),
      'EX',
      86400
    );

    // Publish progress update
    await this.redis.publish(
      `${this.queueName}:progress:${jobId}`,
      JSON.stringify({ jobId, progress: job.progress })
    );
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    if (!job) return false;

    if (job.status === 'processing') {
      // Can't cancel running jobs, but mark for cancellation
      job.status = 'cancelled';
      job.updatedAt = Date.now();
      await this.redis.set(
        `${this.queueName}:job:${jobId}`,
        JSON.stringify(job),
        'EX',
        86400
      );
      return false;
    }

    if (job.status === 'pending') {
      // Remove from queue
      const queueKey = this.getQueueKey(job.options.priority);
      await this.redis.zrem(queueKey, jobId);
      
      job.status = 'cancelled';
      job.updatedAt = Date.now();
      await this.redis.set(
        `${this.queueName}:job:${jobId}`,
        JSON.stringify(job),
        'EX',
        86400
      );
      return true;
    }

    return false;
  }

  /**
   * Start processing jobs
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.poll();
  }

  /**
   * Stop processing jobs
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
    }
    
    // Wait for current jobs to complete
    while (this.processing.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Poll for jobs to process
   */
  private async poll(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // Check if we can process more jobs
      if (this.processing.size < this.concurrency) {
        const job = await this.getNextJob();
        if (job) {
          this.processJob(job).catch(err => {
            console.error(`Failed to process job ${job.id}:`, err);
          });
        }
      }
    } catch (err) {
      console.error('Error polling for jobs:', err);
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), this.pollInterval);
  }

  /**
   * Get next job from queue (priority order)
   */
  private async getNextJob(): Promise<Job | null> {
    const now = Date.now();
    
    // Check queues in priority order
    const priorities: Array<'critical' | 'high' | 'normal' | 'low'> = [
      'critical',
      'high',
      'normal',
      'low',
    ];

    for (const priority of priorities) {
      const queueKey = this.getQueueKey(priority);
      
      // Get jobs that are ready (score <= now)
      const results = await this.redis.zrangebyscore(
        queueKey,
        '-inf',
        now,
        'LIMIT',
        0,
        1
      );

      if (results.length > 0) {
        const jobId = results[0];
        
        // Remove from queue atomically
        const removed = await this.redis.zrem(queueKey, jobId);
        if (removed === 0) continue; // Another worker got it
        
        const job = await this.getJob(jobId);
        if (job && job.status === 'pending') {
          return job;
        }
      }
    }

    return null;
  }

  /**
   * Process a job
   */
  private async processJob(job: Job): Promise<void> {
    this.processing.add(job.id);

    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = Date.now();
      job.attempts++;
      job.updatedAt = Date.now();
      await this.redis.set(
        `${this.queueName}:job:${job.id}`,
        JSON.stringify(job),
        'EX',
        86400
      );

      // Get handler
      const handler = this.handlers.get(job.type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`);
      }

      // Create progress updater
      const updateProgress = async (progress: number) => {
        await this.updateJobProgress(job.id, progress);
      };

      // Execute with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Job timeout')), job.options.timeout);
      });

      const result = await Promise.race([
        handler(job, updateProgress),
        timeoutPromise,
      ]);

      // Job completed successfully
      job.status = 'completed';
      job.result = result;
      job.progress = 100;
      job.completedAt = Date.now();
      job.updatedAt = Date.now();
      await this.redis.set(
        `${this.queueName}:job:${job.id}`,
        JSON.stringify(job),
        'EX',
        86400
      );

    } catch (err) {
      // Job failed
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      job.error = errorMessage;
      job.updatedAt = Date.now();

      // Retry if attempts remaining
      if (job.attempts < job.options.maxRetries) {
        job.status = 'pending';
        
        // Exponential backoff: 2^attempts seconds
        const delay = Math.pow(2, job.attempts) * 1000;
        const queueKey = this.getQueueKey(job.options.priority);
        const score = Date.now() + delay;
        
        await this.redis.zadd(queueKey, score, job.id);
      } else {
        job.status = 'failed';
        job.completedAt = Date.now();
      }

      await this.redis.set(
        `${this.queueName}:job:${job.id}`,
        JSON.stringify(job),
        'EX',
        86400
      );
    } finally {
      this.processing.delete(job.id);
    }
  }

  /**
   * Get queue key for priority
   */
  private getQueueKey(priority: string): string {
    return `${this.queueName}:queue:${priority}`;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    const priorities = ['critical', 'high', 'normal', 'low'];
    let pending = 0;

    for (const priority of priorities) {
      const count = await this.redis.zcard(this.getQueueKey(priority));
      pending += count;
    }

    return {
      pending,
      processing: this.processing.size,
      completed: 0, // Would need separate tracking
      failed: 0, // Would need separate tracking
    };
  }
}

// Made with Bob
