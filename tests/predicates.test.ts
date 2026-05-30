import { describe, it, expect } from 'vitest';
import {
  storyPredicate,
  timePredicate,
  culturePredicate,
  formPredicate,
  soundPredicate,
  motionPredicate,
  worldPredicate,
  fieldPredicate,
  mindPredicate,
} from '../src/lib/kernel/quality/predicates';

describe('Stratum Predicates (refined)', () => {
  describe('storyPredicate', () => {
    it('passes with good beats + causality + ordering', () => {
      const result = storyPredicate({
        beats: [{ order: 1 }, { order: 2 }, { order: 3 }, { order: 4 }, { order: 5 }, { order: 6 }],
        causalityAcyclic: true,
        voiceConsistency: 0.9,
      });
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
    });

    it('fails without causality or ordering', () => {
      const result = storyPredicate({
        beats: [{ order: 3 }, { order: 1 }],
        causalityAcyclic: false,
      });
      expect(result.passed).toBe(false);
    });

    it('detects out-of-order beats (ordering false)', () => {
      const result = storyPredicate({
        beats: [{ order: 1 }, { order: 3 }, { order: 2 }],
        causalityAcyclic: true,
      });
      expect(result.passed).toBe(false);
      expect(result.details).toContain('ordered=false');
    });
  });

  describe('timePredicate', () => {
    it('passes with events + acyclic + valid timescale', () => {
      const result = timePredicate({
        events: [{ t: 0 }, { t: 10 }, { t: 20 }, { t: 30 }, { t: 40 }, { t: 50 }],
        chronologyAcyclic: true,
        timeScale: 'real-time',
      });
      expect(result.passed).toBe(true);
    });

    it('detects out-of-order timestamps (temporal ordering false)', () => {
      const result = timePredicate({
        events: [{ t: 100 }, { t: 10 }, { t: 50 }],
        chronologyAcyclic: true,
      });
      expect(result.passed).toBe(false);
      expect(result.details).toContain('ordered=false');
    });
  });

  describe('culturePredicate', () => {
    it('passes with language + sufficient customs + taboos', () => {
      const result = culturePredicate({
        language: 'en-IPA',
        ipaHints: ['/a/', '/b/'],
        customs: ['greeting', 'farewell', 'feast'],
        taboos: ['taboo1'],
      });
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.65);
    });

    it('fails or low-scores on weak language (no IPA + short)', () => {
      const result = culturePredicate({
        language: 'x',
        customs: ['only-one'],
        taboos: [],
      });
      expect(result.score).toBeLessThan(0.5);
      expect(result.details).toContain('ipaValid=false');
    });
  });
});

describe('Stratum Predicates — Phase 3 expanded axes', () => {
  describe('formPredicate (symmetry axis)', () => {
    it('scores higher with good symmetry + manifold + watertight', () => {
      const result = formPredicate({
        geometry: { vertices: 2400, faces: 4800, manifold: true, watertight: true },
        uvCoverage: 0.96,
        symmetry: 0.92,
      });
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.75);
      expect(result.details).toContain('symmetry=0.92');
    });
  });

  describe('soundPredicate (spectral + dynamic axes)', () => {
    it('incorporates spectralBalance and dynamicRange into score', () => {
      const result = soundPredicate({
        lufs: -14,
        truePeak: -1.2,
        stems: ['drums', 'bass', 'melody', 'vox'],
        spectralBalance: 0.88,
        dynamicRange: 0.81,
      });
      expect(result.score).toBeGreaterThan(0.7);
      expect(result.details).toContain('spectral=0.88');
      expect(result.details).toContain('dynamic=0.81');
    });
  });

  describe('motionPredicate (trajectory + collision + energy)', () => {
    it('passes with strong trajectory, no collisions, good energy', () => {
      const result = motionPredicate({
        joints: 32,
        loopClosure: 0.94,
        groundContact: true,
        trajectoryStability: 0.89,
        noCollisions: true,
        energyConservation: 0.83,
      });
      expect(result.passed).toBe(true);
      expect(result.details).toContain('trajectory=0.89');
      expect(result.details).toContain('collisionFree=true');
    });

    it('fails when collisions present even with good joints', () => {
      const result = motionPredicate({
        joints: 40,
        loopClosure: 0.9,
        groundContact: true,
        trajectoryStability: 0.8,
        noCollisions: false,
      });
      expect(result.passed).toBe(false);
    });
  });

  describe('worldPredicate (coherence + density)', () => {
    it('scores with ecologicalCoherence and agentDensity', () => {
      const result = worldPredicate({
        biomes: ['forest', 'desert', 'ocean', 'mountain'],
        locations: Array(8).fill(0),
        factions: ['a', 'b', 'c'],
        navmeshContinuous: true,
        ecologicalCoherence: 0.79,
        agentDensity: 0.71,
      });
      expect(result.score).toBeGreaterThan(0.65);
      expect(result.details).toContain('coherence=0.79');
    });
  });

  describe('fieldPredicate (invariance axis)', () => {
    it('reflects invarianceScore in details and score', () => {
      const result = fieldPredicate({
        rules: 9,
        conservationLaws: ['energy', 'momentum'],
        decidability: 'decidable',
        invariance: 0.91,
      });
      expect(result.details).toContain('invariance=0.91');
      expect(result.score).toBeGreaterThan(0.6);
    });
  });

  describe('mindPredicate (decision depth)', () => {
    it('incorporates decisionDepth into scoring', () => {
      const result = mindPredicate({
        behaviors: Array(12).fill('b'),
        goals: Array(7).fill('g'),
        noUnreachableStates: true,
        decisionDepth: 0.88,
      });
      expect(result.details).toContain('depth=0.88');
      expect(result.passed).toBe(true);
      expect(result.score).toBeGreaterThan(0.7);
    });
  });
});