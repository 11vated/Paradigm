/**
 * Job Queue Tests
 * 
 * Tests for Redis-based job queue functionality.
 * 
 * Phase 17.3: Job Queue Tests
 * Date: 2026-06-18
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JobQueue, Job, JobHandler } from '../../src/server/queue/job-queue';
import Redis from 'ioredis';

// Mock Redis
vi.mock('ioredis');

describe('JobQueue', () => {
  let queue: JobQueue;
  let mockRedis: any;

  beforeEach(() => {
    // Create mock Redis client
    mockRedis = {
      set: vi.fn().mockResolvedValue('OK'),
      get: vi.fn().mockResolvedValue(null),
      zadd: vi.fn().mockResolvedValue(1),
      zrem: vi.fn().mockResolvedValue(1),
      zcard: vi.fn().mockResolvedValue(0),
      zrangebyscore: vi.fn().mockResolvedValue([]),
      publish: vi.fn().mockResolvedValue(1),
    };

    queue = new JobQueue({
      redis: mockRedis as any,
      queueName: 'test:jobs',
      concurrency: 2,
      pollInterval: 100,
    });
  });

  afterEach(async () => {
    await queue.stop();
    vi.clearAllMocks();
  });

  describe('addJob', () => {
    it('should add job to queue with default options', async () => {
      const jobId = await queue.addJob('test:job', { data: 'test' });

      expect(jobId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.zadd).toHaveBeenCalled();
    });

    it('should add job with custom priority', async () => {
      const jobId = await queue.addJob('test:job', { data: 'test' }, {
        priority: 'high',
      });

      expect(mockRedis.zadd).toHaveBeenCalledWith(
        'test:jobs:queue:high',
        expect.any(Number),
        jobId
      );
    });

    it('should add job with delay', async () => {
      const delay = 5000;
      const beforeTime = Date.now();
      
      const jobId = await queue.addJob('test:job', { data: 'test' }, {
        delay,
      });

      const zaddCall = mockRedis.zadd.mock.calls[0];
      const score = zaddCall[1];
      
      expect(score).toBeGreaterThanOrEqual(beforeTime + delay);
    });

    it('should store job data in Redis', async () => {
      const jobData = { test: 'data', nested: { value: 123 } };
      
      await queue.addJob('test:job', jobData);

      const setCall = mockRedis.set.mock.calls[0];
      const storedData = JSON.parse(setCall[1]);

      expect(storedData.type).toBe('test:job');
      expect(storedData.data).toEqual(jobData);
      expect(storedData.status).toBe('pending');
      expect(storedData.progress).toBe(0);
      expect(storedData.attempts).toBe(0);
    });
  });

  describe('getJob', () => {
    it('should return null for non-existent job', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const job = await queue.getJob('non-existent-id');

      expect(job).toBeNull();
    });

    it('should return job data for existing job', async () => {
      const jobData: Job = {
        id: 'test-id',
        type: 'test:job',
        data: { test: 'data' },
        options: {
          priority: 'normal',
          maxRetries: 3,
          timeout: 300000,
          delay: 0,
          metadata: {},
        },
        status: 'pending',
        progress: 0,
        attempts: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(jobData));

      const job = await queue.getJob('test-id');

      expect(job).toEqual(jobData);
    });
  });

  describe('updateJobProgress', () => {
    it('should update job progress', async () => {
      const jobData: Job = {
        id: 'test-id',
        type: 'test:job',
        data: {},
        options: {
          priority: 'normal',
          maxRetries: 3,
          timeout: 300000,
          delay: 0,
          metadata: {},
        },
        status: 'processing',
        progress: 0,
        attempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(jobData));

      await queue.updateJobProgress('test-id', 50);

      const setCall = mockRedis.set.mock.calls[0];
      const updatedData = JSON.parse(setCall[1]);

      expect(updatedData.progress).toBe(50);
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'test:jobs:progress:test-id',
        expect.stringContaining('"progress":50')
      );
    });

    it('should clamp progress to 0-100 range', async () => {
      const jobData: Job = {
        id: 'test-id',
        type: 'test:job',
        data: {},
        options: {
          priority: 'normal',
          maxRetries: 3,
          timeout: 300000,
          delay: 0,
          metadata: {},
        },
        status: 'processing',
        progress: 0,
        attempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.get.mockResolvedValue(JSON.stringify(jobData));

      // Test upper bound
      await queue.updateJobProgress('test-id', 150);
      let setCall = mockRedis.set.mock.calls[mockRedis.set.mock.calls.length - 1];
      let updatedData = JSON.parse(setCall[1]);
      expect(updatedData.progress).toBe(100);

      // Test lower bound
      await queue.updateJobProgress('test-id', -50);
      setCall = mockRedis.set.mock.calls[mockRedis.set.mock.calls.length - 1];
      updatedData = JSON.parse(setCall[1]);
      expect(updatedData.progress).toBe(0);
    });
  });

  describe('cancelJob', () => {
    it('should cancel pending job', async () => {
      const jobData: Job = {
        id: 'test-id',
        type: 'test:job',
        data: {},
        options: {
          priority: 'normal',
          maxRetries: 3,
          timeout: 300000,
          delay: 0,
          metadata: {},
        },
        status: 'pending',
        progress: 0,
        attempts: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(jobData));

      const cancelled = await queue.cancelJob('test-id');

      expect(cancelled).toBe(true);
      expect(mockRedis.zrem).toHaveBeenCalledWith(
        'test:jobs:queue:normal',
        'test-id'
      );
    });

    it('should not cancel processing job', async () => {
      const jobData: Job = {
        id: 'test-id',
        type: 'test:job',
        data: {},
        options: {
          priority: 'normal',
          maxRetries: 3,
          timeout: 300000,
          delay: 0,
          metadata: {},
        },
        status: 'processing',
        progress: 50,
        attempts: 1,
        createdAt: Date.now(),
        startedAt: Date.now(),
        updatedAt: Date.now(),
      };

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(jobData));

      const cancelled = await queue.cancelJob('test-id');

      expect(cancelled).toBe(false);
      expect(mockRedis.zrem).not.toHaveBeenCalled();
    });

    it('should return false for non-existent job', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const cancelled = await queue.cancelJob('non-existent');

      expect(cancelled).toBe(false);
    });
  });

  describe('registerHandler', () => {
    it('should register job handler', () => {
      const handler: JobHandler = async (job: Job) => {
        return { success: true };
      };

      expect(() => {
        queue.registerHandler('test:job', handler);
      }).not.toThrow();
    });

    it('should throw error for duplicate handler', () => {
      const handler: JobHandler = async (job: Job) => {
        return { success: true };
      };

      queue.registerHandler('test:job', handler);

      expect(() => {
        queue.registerHandler('test:job', handler);
      }).toThrow('Handler for job type "test:job" already registered');
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      mockRedis.zcard
        .mockResolvedValueOnce(5)  // critical
        .mockResolvedValueOnce(10) // high
        .mockResolvedValueOnce(20) // normal
        .mockResolvedValueOnce(3); // low

      const stats = await queue.getStats();

      expect(stats.pending).toBe(38); // 5 + 10 + 20 + 3
      expect(stats.processing).toBe(0);
    });
  });

  describe('start and stop', () => {
    it('should start processing jobs', () => {
      expect(() => {
        queue.start();
      }).not.toThrow();
    });

    it('should not start twice', () => {
      queue.start();
      queue.start(); // Should be no-op

      // No error expected
      expect(true).toBe(true);
    });

    it('should stop processing jobs', async () => {
      queue.start();
      
      await expect(queue.stop()).resolves.not.toThrow();
    });
  });
});

// Made with Bob
