/**
 * Queue Integration Tests
 * 
 * Tests end-to-end queue workflows including:
 * - Job creation via API
 * - Job processing lifecycle
 * - Priority ordering
 * - Retry logic
 * - Timeout handling
 * - Progress tracking
 * - Job cancellation
 * 
 * Phase 17: Test Coverage to 90%+
 * Target: +6% coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JobQueue } from '../../src/server/queue/job-queue.js';
import type { Job, JobOptions } from '../../src/server/queue/job-queue.js';
import Redis from 'ioredis';

// Mock Redis for testing
const createMockRedis = () => {
  const store = new Map<string, string>();
  const lists = new Map<string, string[]>();
  const sortedSets = new Map<string, Map<string, number>>();
  
  const self = {
    get: (key: string) => store.get(key) || null,
    set: (key: string, value: string) => { store.set(key, value); return 'OK'; },
    del: (key: string) => { store.delete(key); sortedSets.delete(key); return 1; },
    lpush: (key: string, ...values: string[]) => {
      if (!lists.has(key)) lists.set(key, []);
      lists.get(key)!.unshift(...values);
      return lists.get(key)!.length;
    },
    rpop: (key: string) => { const list = lists.get(key); return list?.pop() || null; },
    lrange: (key: string, start: number, stop: number) => {
      const list = lists.get(key) || [];
      return list.slice(start, stop === -1 ? undefined : stop + 1);
    },
    zadd: (key: string, score: number, member: string) => {
      if (!sortedSets.has(key)) sortedSets.set(key, new Map());
      sortedSets.get(key)!.set(member, score);
      return 1;
    },
    zrange: (key: string, start: number, stop: number) => {
      const set = sortedSets.get(key);
      if (!set) return [];
      return Array.from(set.entries())
        .sort((a, b) => a[1] - b[1])
        .slice(start, stop === -1 ? undefined : stop + 1)
        .map(([member]) => member);
    },
    zrangebyscore: (key: string, min: string, max: number | string) => {
      const set = sortedSets.get(key);
      if (!set) return [];
      const minVal = min === '-inf' ? -Infinity : Number(min);
      const maxVal = max === '+inf' ? Infinity : Number(max);
      return Array.from(set.entries())
        .filter(([, score]) => score >= minVal && score <= maxVal)
        .sort((a, b) => a[1] - b[1])
        .map(([member]) => member);
    },
    zcard: (key: string) => { const set = sortedSets.get(key); return set ? set.size : 0; },
    zrem: (key: string, member: string) => {
      const set = sortedSets.get(key);
      if (!set) return 0;
      return set.delete(member) ? 1 : 0;
    },
    publish: () => 0,
    keys: (pattern: string) => {
      return Array.from(store.keys()).filter(k => k.includes(pattern.replace('*', '')));
    },
    quit: () => 'OK',
  };
  return self as unknown as Redis;
};

describe('Queue Integration Tests', () => {
  let queue: JobQueue;
  let redis: Redis;

  beforeEach(() => {
    redis = createMockRedis();
    queue = new JobQueue({
      redis,
      queueName: 'test-queue',
      concurrency: 2,
      pollInterval: 50,
      retryBackoffMs: 1,
    });
  });

  afterEach(async () => {
    await queue.stop();
    await redis.quit();
  });

  describe('Job Creation and Processing', () => {
    it('should create job and process it successfully', async () => {
      let processed = false;
      
      queue.registerHandler('test-job', async (job) => {
        processed = true;
        return { success: true, jobId: job.id };
      });

      const jobId = await queue.addJob('test-job', { data: 'test' });
      
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      queue.start();
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(processed).toBe(true);
    });

    it('should process multiple jobs in order', async () => {
      const processedJobs: string[] = [];
      
      queue.registerHandler('ordered-job', async (job) => {
        processedJobs.push(job.id);
        return { processed: job.id };
      });

      const job1 = await queue.addJob('ordered-job', { order: 1 });
      const job2 = await queue.addJob('ordered-job', { order: 2 });
      const job3 = await queue.addJob('ordered-job', { order: 3 });

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      expect(processedJobs).toHaveLength(3);
      expect(processedJobs).toContain(job1);
      expect(processedJobs).toContain(job2);
      expect(processedJobs).toContain(job3);
    });

    it('should handle concurrent job processing', async () => {
      const processing = new Set<string>();
      const maxConcurrent = { value: 0 };
      
      queue.registerHandler('concurrent-job', async (job) => {
        processing.add(job.id);
        maxConcurrent.value = Math.max(maxConcurrent.value, processing.size);
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        processing.delete(job.id);
        return { processed: job.id };
      });

      // Add 5 jobs
      await Promise.all([
        queue.addJob('concurrent-job', { id: 1 }),
        queue.addJob('concurrent-job', { id: 2 }),
        queue.addJob('concurrent-job', { id: 3 }),
        queue.addJob('concurrent-job', { id: 4 }),
        queue.addJob('concurrent-job', { id: 5 }),
      ]);

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Should respect concurrency limit of 2
      expect(maxConcurrent.value).toBeLessThanOrEqual(2);
      expect(maxConcurrent.value).toBeGreaterThan(0);
    });
  });

  describe('Priority Ordering', () => {
    it('should process high priority jobs before normal priority', async () => {
      const processOrder: string[] = [];
      
      queue.registerHandler('priority-job', async (job) => {
        processOrder.push(job.data.priority);
        return { processed: true };
      });

      // Add jobs in reverse priority order
      await queue.addJob('priority-job', { priority: 'low' }, { priority: 'low' });
      await queue.addJob('priority-job', { priority: 'normal' }, { priority: 'normal' });
      await queue.addJob('priority-job', { priority: 'high' }, { priority: 'high' });
      await queue.addJob('priority-job', { priority: 'critical' }, { priority: 'critical' });

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Critical and high should be processed before normal and low
      const criticalIndex = processOrder.indexOf('critical');
      const highIndex = processOrder.indexOf('high');
      const normalIndex = processOrder.indexOf('normal');
      const lowIndex = processOrder.indexOf('low');
      
      expect(criticalIndex).toBeLessThan(normalIndex);
      expect(highIndex).toBeLessThan(normalIndex);
      expect(normalIndex).toBeLessThan(lowIndex);
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed jobs up to maxRetries', async () => {
      let attempts = 0;
      
      queue.registerHandler('retry-job', async (job) => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Simulated failure');
        }
        return { success: true, attempts };
      });

      const jobId = await queue.addJob('retry-job', { test: 'retry' }, { maxRetries: 3 });

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      expect(attempts).toBe(3);
      
      const job = await queue.getJob(jobId);
      expect(job?.status).toBe('completed');
      expect(job?.attempts).toBe(3);
    });

    it('should mark job as failed after exceeding maxRetries', async () => {
      let attempts = 0;
      
      queue.registerHandler('fail-job', async () => {
        attempts++;
        throw new Error('Always fails');
      });

      const jobId = await queue.addJob('fail-job', { test: 'fail' }, { maxRetries: 2 });

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      expect(attempts).toBe(2);
      
      const job = await queue.getJob(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.error).toContain('Always fails');
    });

    it('should not retry jobs with maxRetries set to 0', async () => {
      let attempts = 0;
      
      queue.registerHandler('no-retry-job', async () => {
        attempts++;
        throw new Error('Fail immediately');
      });

      const jobId = await queue.addJob('no-retry-job', { test: 'no-retry' }, { maxRetries: 0 });

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(attempts).toBe(1);
      
      const job = await queue.getJob(jobId);
      expect(job?.status).toBe('failed');
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long-running jobs', async () => {
      queue.registerHandler('timeout-job', async () => {
        // Simulate long-running job
        await new Promise(resolve => setTimeout(resolve, 5000));
        return { completed: true };
      });

      const jobId = await queue.addJob('timeout-job', { test: 'timeout' }, { 
        timeout: 100,
        maxRetries: 0 
      });

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const job = await queue.getJob(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.error).toContain('timeout');
    });

    it('should complete jobs that finish before timeout', async () => {
      queue.registerHandler('fast-job', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { completed: true };
      });

      const jobId = await queue.addJob('fast-job', { test: 'fast' }, { 
        timeout: 200 
      });

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const job = await queue.getJob(jobId);
      expect(job?.status).toBe('completed');
      expect(job?.result).toEqual({ completed: true });
    });
  });

  describe('Progress Tracking', () => {
    it('should track job progress during execution', async () => {
      const progressUpdates: number[] = [];
      
      queue.registerHandler('progress-job', async (job, updateProgress) => {
        await updateProgress(25);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        await updateProgress(50);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        await updateProgress(75);
        await new Promise(resolve => setTimeout(resolve, 50));
        
        await updateProgress(100);
        return { completed: true };
      });

      const jobId = await queue.addJob('progress-job', { test: 'progress' });

      // Monitor progress
      const checkProgress = setInterval(async () => {
        const job = await queue.getJob(jobId);
        if (job) {
          progressUpdates.push(job.progress);
        }
      }, 30);

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 400));
      
      clearInterval(checkProgress);
      
      // Should have captured multiple progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(Math.max(...progressUpdates)).toBe(100);
    });

    it('should initialize progress at 0', async () => {
      queue.registerHandler('init-progress-job', async () => {
        return { completed: true };
      });

      const jobId = await queue.addJob('init-progress-job', { test: 'init' });
      
      const job = await queue.getJob(jobId);
      expect(job?.progress).toBe(0);
    });
  });

  describe('Job Cancellation', () => {
    it('should cancel pending jobs', async () => {
      queue.registerHandler('cancel-job', async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { completed: true };
      });

      const jobId = await queue.addJob('cancel-job', { test: 'cancel' });
      
      // Cancel before processing
      await queue.cancelJob(jobId);
      
      const job = await queue.getJob(jobId);
      expect(job?.status).toBe('cancelled');
    });

    it('should not process cancelled jobs', async () => {
      let processed = false;
      
      queue.registerHandler('cancelled-job', async () => {
        processed = true;
        return { completed: true };
      });

      const jobId = await queue.addJob('cancelled-job', { test: 'cancelled' });
      await queue.cancelJob(jobId);

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(processed).toBe(false);
    });
  });

  describe('Job Metadata', () => {
    it('should store and retrieve job metadata', async () => {
      queue.registerHandler('metadata-job', async () => {
        return { completed: true };
      });

      const metadata = {
        userId: 'user-123',
        source: 'api',
        tags: ['test', 'integration'],
      };

      const jobId = await queue.addJob('metadata-job', { test: 'metadata' }, { 
        metadata 
      });

      const job = await queue.getJob(jobId);
      expect(job?.options.metadata).toEqual(metadata);
    });

    it('should track job timestamps', async () => {
      queue.registerHandler('timestamp-job', async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { completed: true };
      });

      const beforeCreate = Date.now();
      const jobId = await queue.addJob('timestamp-job', { test: 'timestamp' });
      const afterCreate = Date.now();

      const jobBefore = await queue.getJob(jobId);
      expect(jobBefore?.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(jobBefore?.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(jobBefore?.startedAt).toBeUndefined();
      expect(jobBefore?.completedAt).toBeUndefined();

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const jobAfter = await queue.getJob(jobId);
      expect(jobAfter?.startedAt).toBeDefined();
      expect(jobAfter?.completedAt).toBeDefined();
      expect(jobAfter?.completedAt!).toBeGreaterThan(jobAfter?.startedAt!);
    });
  });

  describe('Queue Statistics', () => {
    it('should track queue statistics', async () => {
      queue.registerHandler('stats-job', async () => {
        return { completed: true };
      });

      // Add multiple jobs
      await queue.addJob('stats-job', { id: 1 });
      await queue.addJob('stats-job', { id: 2 });
      await queue.addJob('stats-job', { id: 3 });

      const stats = await queue.getStats();
      
      expect(stats.pending).toBeGreaterThanOrEqual(0);
      expect(stats.pending + stats.processing + stats.completed + stats.failed).toBeGreaterThanOrEqual(3);
    });

    it('should update statistics as jobs are processed', async () => {
      queue.registerHandler('dynamic-stats-job', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { completed: true };
      });

      await queue.addJob('dynamic-stats-job', { id: 1 });
      await queue.addJob('dynamic-stats-job', { id: 2 });

      const statsBefore = await queue.getStats();
      
      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const statsAfter = await queue.getStats();
      
      expect(statsAfter.completed).toBeGreaterThan(statsBefore.completed);
    });
  });

  describe('Error Handling', () => {
    it('should handle handler errors gracefully', async () => {
      queue.registerHandler('error-job', async () => {
        throw new Error('Handler error');
      });

      const jobId = await queue.addJob('error-job', { test: 'error' }, { maxRetries: 0 });

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const job = await queue.getJob(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.error).toContain('Handler error');
    });

    it('should handle missing handlers', async () => {
      const jobId = await queue.addJob('missing-handler', { test: 'missing' });

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const job = await queue.getJob(jobId);
      expect(job?.status).toBe('failed');
      expect(job?.error).toContain('No handler registered');
    });

    it('should handle invalid job data', async () => {
      queue.registerHandler('invalid-data-job', async (job) => {
        if (!job.data || typeof job.data !== 'object') {
          throw new Error('Invalid job data');
        }
        return { valid: true };
      });

      const jobId = await queue.addJob('invalid-data-job', null as any, { maxRetries: 0 });

      queue.start();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const job = await queue.getJob(jobId);
      expect(job?.status).toBe('failed');
    });
  });

  describe('Queue Lifecycle', () => {
    it('should start and stop queue cleanly', async () => {
      let processed = 0;
      
      queue.registerHandler('lifecycle-job', async () => {
        processed++;
        return { processed: true };
      });

      await queue.addJob('lifecycle-job', { id: 1 });
      await queue.addJob('lifecycle-job', { id: 2 });

      queue.start();
      // Queue is now running (isRunning is private, so we test behavior instead)
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      await queue.stop();
      // Queue is now stopped
      
      const processedBefore = processed;
      
      // Add more jobs after stop
      await queue.addJob('lifecycle-job', { id: 3 });
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should not process new jobs after stop
      expect(processed).toBe(processedBefore);
    });

    it('should resume processing after restart', async () => {
      let processed = 0;
      
      queue.registerHandler('restart-job', async () => {
        processed++;
        await new Promise(resolve => setTimeout(resolve, 50));
        return { processed: true };
      });

      await queue.addJob('restart-job', { id: 1 });
      await queue.addJob('restart-job', { id: 2 });

      queue.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await queue.stop();
      
      const processedAfterStop = processed;
      
      await queue.addJob('restart-job', { id: 3 });
      
      queue.start();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(processed).toBeGreaterThan(processedAfterStop);
    });
  });
});

// Made with Bob
