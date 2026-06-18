/**
 * Job Handlers Tests
 * 
 * Tests for background job handlers including seed generation, evolution,
 * composition, batch processing, rendering, and analysis
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  seedGenerationHandler,
  seedEvolutionHandler,
  seedCompositionHandler,
  batchGenerationHandler,
  seedRenderingHandler,
  seedAnalysisHandler,
  type SeedGenerationJobData,
  type SeedEvolutionJobData,
  type SeedCompositionJobData,
  type BatchGenerationJobData,
  type SeedRenderingJobData,
  type SeedAnalysisJobData,
} from '../../src/server/queue/handlers.js';
import type { Job } from '../../src/server/queue/job-queue.js';

// Mock the kernel functions
vi.mock('@/lib/kernel/index', () => ({
  growSeed: vi.fn(async (seed: any) => ({
    ...seed,
    artifact: 'generated-artifact',
    timestamp: Date.now(),
  })),
}));

vi.mock('@/lib/kernel/composition', () => ({
  composeSeed: vi.fn(async (seed1: any, seed2: any) => ({
    ...seed1,
    ...seed2,
    composed: true,
  })),
}));

describe('Job Handlers', () => {
  let progressUpdates: number[];
  let updateProgress: (progress: number) => Promise<void>;

  beforeEach(() => {
    progressUpdates = [];
    updateProgress = vi.fn(async (progress: number) => {
      progressUpdates.push(progress);
    });
    vi.clearAllMocks();
  });

  describe('seedGenerationHandler', () => {
    it('generates seed artifact successfully', async () => {
      const jobData: SeedGenerationJobData = {
        seed: { id: 'test-seed', genes: {} },
        domain: 'character',
        userId: 'user-123',
      };

      const job: Job<SeedGenerationJobData> = {
        id: 'job-1',
        type: 'seed:generate',
        data: jobData,
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

      const result = await seedGenerationHandler(job, updateProgress);

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.artifact).toBeTruthy();
      expect(result.domain).toBe('character');
      expect(progressUpdates).toContain(10);
      expect(progressUpdates).toContain(90);
      expect(progressUpdates).toContain(100);
    });

    it('updates progress during generation', async () => {
      const jobData: SeedGenerationJobData = {
        seed: { id: 'test-seed' },
        domain: 'music',
      };

      const job: Job<SeedGenerationJobData> = {
        id: 'job-2',
        type: 'seed:generate',
        data: jobData,
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

      await seedGenerationHandler(job, updateProgress);

      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it('throws error on generation failure', async () => {
      const { growSeed } = await import('../../src/lib/kernel/index.js');
      vi.mocked(growSeed).mockRejectedValueOnce(new Error('Generation failed'));

      const jobData: SeedGenerationJobData = {
        seed: { id: 'bad-seed' },
        domain: 'character',
      };

      const job: Job<SeedGenerationJobData> = {
        id: 'job-3',
        type: 'seed:generate',
        data: jobData,
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

      await expect(seedGenerationHandler(job, updateProgress)).rejects.toThrow('Seed generation failed');
    });
  });

  describe('seedEvolutionHandler', () => {
    it('evolves seed through multiple generations', async () => {
      const jobData: SeedEvolutionJobData = {
        seed: { id: 'evolve-seed', genes: {} },
        generations: 10,
        populationSize: 20,
        fitnessFunction: 'quality',
        userId: 'user-123',
      };

      const job: Job<SeedEvolutionJobData> = {
        id: 'job-4',
        type: 'seed:evolve',
        data: jobData,
        options: {
          priority: 'high',
          maxRetries: 3,
          timeout: 600000,
          delay: 0,
          metadata: {},
        },
        status: 'processing',
        progress: 0,
        attempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await seedEvolutionHandler(job, updateProgress);

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.bestSeed).toBeTruthy();
      expect(result.artifact).toBeTruthy();
      expect(result.generations).toBe(10);
      expect(progressUpdates).toContain(5);
      expect(progressUpdates).toContain(10);
      expect(progressUpdates).toContain(95);
      expect(progressUpdates).toContain(100);
    });

    it('updates progress for each generation', async () => {
      const jobData: SeedEvolutionJobData = {
        seed: { id: 'evolve-seed' },
        generations: 5,
        populationSize: 10,
        fitnessFunction: 'quality',
      };

      const job: Job<SeedEvolutionJobData> = {
        id: 'job-5',
        type: 'seed:evolve',
        data: jobData,
        options: {
          priority: 'normal',
          maxRetries: 3,
          timeout: 600000,
          delay: 0,
          metadata: {},
        },
        status: 'processing',
        progress: 0,
        attempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await seedEvolutionHandler(job, updateProgress);

      // Should have progress updates for each generation
      expect(progressUpdates.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('seedCompositionHandler', () => {
    it('composes multiple seeds successfully', async () => {
      const jobData: SeedCompositionJobData = {
        seeds: [
          { id: 'seed-1', genes: {} },
          { id: 'seed-2', genes: {} },
        ],
        compositionType: 'blend',
        userId: 'user-123',
      };

      const job: Job<SeedCompositionJobData> = {
        id: 'job-6',
        type: 'seed:compose',
        data: jobData,
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

      const result = await seedCompositionHandler(job, updateProgress);

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.composedSeed).toBeTruthy();
      expect(result.artifact).toBeTruthy();
      expect(result.compositionType).toBe('blend');
      expect(progressUpdates).toContain(10);
      expect(progressUpdates).toContain(60);
      expect(progressUpdates).toContain(100);
    });

    it('throws error when less than 2 seeds provided', async () => {
      const jobData: SeedCompositionJobData = {
        seeds: [{ id: 'seed-1' }],
        compositionType: 'blend',
      };

      const job: Job<SeedCompositionJobData> = {
        id: 'job-7',
        type: 'seed:compose',
        data: jobData,
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

      await expect(seedCompositionHandler(job, updateProgress)).rejects.toThrow(
        'Composition requires at least 2 seeds'
      );
    });
  });

  describe('batchGenerationHandler', () => {
    it('generates multiple seeds in batch', async () => {
      const jobData: BatchGenerationJobData = {
        seeds: [
          { id: 'seed-1' },
          { id: 'seed-2' },
          { id: 'seed-3' },
        ],
        userId: 'user-123',
      };

      const job: Job<BatchGenerationJobData> = {
        id: 'job-8',
        type: 'seed:batch',
        data: jobData,
        options: {
          priority: 'low',
          maxRetries: 3,
          timeout: 900000,
          delay: 0,
          metadata: {},
        },
        status: 'processing',
        progress: 0,
        attempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await batchGenerationHandler(job, updateProgress);

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(progressUpdates).toContain(5);
      expect(progressUpdates).toContain(100);
    });

    it('handles partial failures in batch', async () => {
      const { growSeed } = await import('../../src/lib/kernel/index.js');
      
      // Mock to fail on second seed
      vi.mocked(growSeed)
        .mockResolvedValueOnce({ artifact: 'success-1' } as any)
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce({ artifact: 'success-3' } as any);

      const jobData: BatchGenerationJobData = {
        seeds: [
          { id: 'seed-1' },
          { id: 'seed-2' },
          { id: 'seed-3' },
        ],
      };

      const job: Job<BatchGenerationJobData> = {
        id: 'job-9',
        type: 'seed:batch',
        data: jobData,
        options: {
          priority: 'normal',
          maxRetries: 3,
          timeout: 900000,
          delay: 0,
          metadata: {},
        },
        status: 'processing',
        progress: 0,
        attempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await batchGenerationHandler(job, updateProgress);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBeTruthy();
    });

    it('updates progress for each seed', async () => {
      const jobData: BatchGenerationJobData = {
        seeds: [
          { id: 'seed-1' },
          { id: 'seed-2' },
        ],
      };

      const job: Job<BatchGenerationJobData> = {
        id: 'job-10',
        type: 'seed:batch',
        data: jobData,
        options: {
          priority: 'normal',
          maxRetries: 3,
          timeout: 900000,
          delay: 0,
          metadata: {},
        },
        status: 'processing',
        progress: 0,
        attempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await batchGenerationHandler(job, updateProgress);

      // Should have progress updates for each seed
      expect(progressUpdates.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('seedRenderingHandler', () => {
    it('renders seed to multiple formats', async () => {
      const jobData: SeedRenderingJobData = {
        seed: { id: 'render-seed' },
        formats: ['png', 'svg', 'gltf'],
        resolution: { width: 1920, height: 1080 },
        userId: 'user-123',
      };

      const job: Job<SeedRenderingJobData> = {
        id: 'job-11',
        type: 'seed:render',
        data: jobData,
        options: {
          priority: 'normal',
          maxRetries: 3,
          timeout: 600000,
          delay: 0,
          metadata: {},
        },
        status: 'processing',
        progress: 0,
        attempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = await seedRenderingHandler(job, updateProgress);

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.artifact).toBeTruthy();
      expect(result.renderedFormats).toBeTruthy();
      expect(Object.keys(result.renderedFormats)).toHaveLength(3);
      expect(result.formats).toEqual(['png', 'svg', 'gltf']);
      expect(progressUpdates).toContain(10);
      expect(progressUpdates).toContain(30);
      expect(progressUpdates).toContain(100);
    });

    it('updates progress for each format', async () => {
      const jobData: SeedRenderingJobData = {
        seed: { id: 'render-seed' },
        formats: ['png', 'svg'],
        resolution: { width: 1024, height: 768 },
      };

      const job: Job<SeedRenderingJobData> = {
        id: 'job-12',
        type: 'seed:render',
        data: jobData,
        options: {
          priority: 'normal',
          maxRetries: 3,
          timeout: 600000,
          delay: 0,
          metadata: {},
        },
        status: 'processing',
        progress: 0,
        attempts: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await seedRenderingHandler(job, updateProgress);

      expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('seedAnalysisHandler', () => {
    it('analyzes seed with multiple analysis types', async () => {
      const jobData: SeedAnalysisJobData = {
        seed: { id: 'analyze-seed', genes: { a: 1, b: 2, c: 3 } },
        analysisTypes: ['quality', 'complexity', 'uniqueness'],
        userId: 'user-123',
      };

      const job: Job<SeedAnalysisJobData> = {
        id: 'job-13',
        type: 'seed:analyze',
        data: jobData,
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

      const result = await seedAnalysisHandler(job, updateProgress);

      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(result.seed).toBeTruthy();
      expect(result.analysis).toBeTruthy();
      expect(result.analysis.quality).toBeTruthy();
      expect(result.analysis.complexity).toBeTruthy();
      expect(result.analysis.uniqueness).toBeTruthy();
      expect(result.analysisTypes).toEqual(['quality', 'complexity', 'uniqueness']);
      expect(progressUpdates).toContain(10);
      expect(progressUpdates).toContain(100);
    });

    it('performs quality analysis', async () => {
      const jobData: SeedAnalysisJobData = {
        seed: { id: 'analyze-seed' },
        analysisTypes: ['quality'],
      };

      const job: Job<SeedAnalysisJobData> = {
        id: 'job-14',
        type: 'seed:analyze',
        data: jobData,
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

      const result = await seedAnalysisHandler(job, updateProgress);

      expect(result.analysis.quality).toBeTruthy();
      expect(result.analysis.quality.score).toBeGreaterThan(0);
      expect(result.analysis.quality.score).toBeLessThanOrEqual(1);
    });

    it('performs complexity analysis', async () => {
      const jobData: SeedAnalysisJobData = {
        seed: { id: 'analyze-seed', a: 1, b: 2, c: 3 },
        analysisTypes: ['complexity'],
      };

      const job: Job<SeedAnalysisJobData> = {
        id: 'job-15',
        type: 'seed:analyze',
        data: jobData,
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

      const result = await seedAnalysisHandler(job, updateProgress);

      expect(result.analysis.complexity).toBeTruthy();
      expect(result.analysis.complexity.score).toBeGreaterThan(0);
      expect(result.analysis.complexity.geneCount).toBeGreaterThan(0);
    });

    it('performs uniqueness analysis', async () => {
      const jobData: SeedAnalysisJobData = {
        seed: { id: 'analyze-seed' },
        analysisTypes: ['uniqueness'],
      };

      const job: Job<SeedAnalysisJobData> = {
        id: 'job-16',
        type: 'seed:analyze',
        data: jobData,
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

      const result = await seedAnalysisHandler(job, updateProgress);

      expect(result.analysis.uniqueness).toBeTruthy();
      expect(result.analysis.uniqueness.score).toBeGreaterThan(0);
      expect(Array.isArray(result.analysis.uniqueness.similarSeeds)).toBe(true);
    });

    it('updates progress for each analysis type', async () => {
      const jobData: SeedAnalysisJobData = {
        seed: { id: 'analyze-seed' },
        analysisTypes: ['quality', 'complexity'],
      };

      const job: Job<SeedAnalysisJobData> = {
        id: 'job-17',
        type: 'seed:analyze',
        data: jobData,
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

      await seedAnalysisHandler(job, updateProgress);

      expect(progressUpdates.length).toBeGreaterThanOrEqual(2);
    });
  });
});

// Made with Bob
