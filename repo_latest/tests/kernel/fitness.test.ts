import { describe, it, expect } from 'vitest';
import { evaluateFitness } from '../../src/lib/kernel/fitness.js';

function makeSeed(domain: string, genes: Record<string, any> = {}): any {
  return {
    id: 'fitness-test',
    $domain: domain,
    $name: 'FitnessTest',
    $lineage: { generation: 0, operation: 'test' },
    $hash: 'testhash',
    $fitness: { overall: 0.5 },
    genes,
  };
}

describe('Fitness Evaluators', () => {
  describe('determinism', () => {
    it('produces identical results for identical input', () => {
      const seed = makeSeed('character', {
        strength: { type: 'scalar', value: 0.8 },
        agility: { type: 'scalar', value: 0.5 },
        archetype: { type: 'categorical', value: 'warrior' },
      });
      const r1 = evaluateFitness(seed);
      const r2 = evaluateFitness(seed);
      expect(r1.overall).toBe(r2.overall);
      expect(r1.dimensions).toEqual(r2.dimensions);
    });
  });

  describe('character evaluator', () => {
    it('scores balanced character higher than degenerate', () => {
      const good = makeSeed('character', {
        strength: { type: 'scalar', value: 0.7 },
        agility: { type: 'scalar', value: 0.4 },
        size: { type: 'scalar', value: 0.6 },
        archetype: { type: 'categorical', value: 'warrior' },
        palette: { type: 'vector', value: [0.8, 0.3, 0.2] },
        personality: { type: 'categorical', value: 'brave' },
        intelligence: { type: 'scalar', value: 0.5 },
      });
      const bad = makeSeed('character', {
        strength: { type: 'scalar', value: 1.0 },
        agility: { type: 'scalar', value: 1.0 },
        size: { type: 'scalar', value: 1.0 },
      });
      const goodReport = evaluateFitness(good);
      const badReport = evaluateFitness(bad);
      expect(goodReport.overall).toBeGreaterThan(badReport.overall);
    });

    it('penalizes all-maxed stats', () => {
      const seed = makeSeed('character', {
        strength: { type: 'scalar', value: 0.95 },
        agility: { type: 'scalar', value: 0.95 },
        size: { type: 'scalar', value: 0.95 },
      });
      const report = evaluateFitness(seed);
      expect(report.penalties.length).toBeGreaterThan(0);
    });
  });

  describe('music evaluator', () => {
    it('validates tempo range', () => {
      const good = makeSeed('music', {
        tempo: { type: 'scalar', value: 0.5 },
        key: { type: 'categorical', value: 'C' },
        scale: { type: 'categorical', value: 'major' },
        melody: { type: 'array', value: [60, 62, 64, 65, 67, 69, 71, 72] },
      });
      const report = evaluateFitness(good);
      expect(report.dimensions.tempo_valid).toBe(1.0);
      expect(report.dimensions.scale_valid).toBe(1.0);
    });
  });

  describe('narrative evaluator', () => {
    it('penalizes empty cast', () => {
      const seed = makeSeed('narrative', {
        structure: { type: 'categorical', value: 'heros_journey' },
        tone: { type: 'categorical', value: 'epic' },
      });
      const report = evaluateFitness(seed);
      expect(report.penalties).toContain('No characters defined');
    });
  });

  describe('generic evaluator', () => {
    it('works for any domain', () => {
      const seed = makeSeed('choreography', {
        style: { type: 'categorical', value: 'ballet' },
        tempo: { type: 'scalar', value: 0.6 },
      });
      const report = evaluateFitness(seed);
      expect(report.overall).toBeGreaterThan(0);
      expect(report.overall).toBeLessThanOrEqual(1);
      expect(report.dimensions.gene_richness).toBeDefined();
    });

    it('penalizes empty genes', () => {
      const seed = makeSeed('shader', {});
      const report = evaluateFitness(seed);
      expect(report.penalties).toContain('No genes defined');
      expect(report.overall).toBeLessThanOrEqual(0.5);
    });
  });

  describe('overall score range', () => {
    it('always returns 0-1 for any seed', () => {
      const domains = ['character', 'music', 'geometry3d', 'physics', 'narrative', 'fullgame', 'alife', 'food'];
      for (const d of domains) {
        const report = evaluateFitness(makeSeed(d, { x: { type: 'scalar', value: 0.5 } }));
        expect(report.overall).toBeGreaterThanOrEqual(0);
        expect(report.overall).toBeLessThanOrEqual(1);
      }
    });
  });
});
