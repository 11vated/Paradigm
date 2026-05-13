import { describe, it, expect } from 'vitest';
import {
  computeGeneGradient, applyGradientSuggestion, gradientGuidedMutate,
} from '../../src/lib/kernel/gene-gradients';
import { Xoshiro256StarStar } from '../../src/lib/kernel/rng';

const BASE_QUALITY = { geometry: 0.5, texture: 0.5, animation: 0.5, coherence: 0.5, style: 0.5, novelty: 0.5 };
const IMPROVED_QUALITY = { geometry: 0.8, texture: 0.8, animation: 0.8, coherence: 0.8, style: 0.8, novelty: 0.8 };

describe('Gene Gradients', () => {
  it('computes positive gradient for scalar', () => {
    const grad = computeGeneGradient({
      geneName: 'strength',
      geneValue: 0.5,
      geneType: 'scalar',
      qualityBefore: BASE_QUALITY,
      qualityAfter: IMPROVED_QUALITY,
    });
    expect(grad.suggestedDirection).toBe('increase');
    expect(grad.confidence).toBeGreaterThan(0);
    expect(typeof grad.dOutput_dGene).toBe('number');
  });

  it('computes negative gradient for scalar', () => {
    const grad = computeGeneGradient({
      geneName: 'strength', geneValue: 0.5, geneType: 'scalar',
      qualityBefore: IMPROVED_QUALITY,
      qualityAfter: BASE_QUALITY,
    });
    expect(grad.suggestedDirection).toBe('decrease');
  });

  it('applies gradient suggestion to scalar', () => {
    const grad = { dOutput_dGene: 0.5, confidence: 0.8, suggestedDirection: 'increase' as const };
    const result = applyGradientSuggestion(0.5, grad, 0.1);
    expect(result).toBeGreaterThan(0.5);
    expect(result).toBeLessThan(1);
  });

  it('applies gradient to vector', () => {
    const grad = {
      dOutput_dGene: [0.1, 0.2, -0.1],
      confidence: 0.9,
      suggestedDirection: 'increase' as const,
    };
    const result = applyGradientSuggestion([0.5, 0.5, 0.5], grad, 0.1);
    expect(result[0]).toBeGreaterThan(0.5);
    expect(result[1]).toBeGreaterThan(0.5);
    expect(result[2]).toBeLessThan(0.5);
  });

  it('gradient-guided mutation preserves gene structure', () => {
    const rng = new Xoshiro256StarStar('test-guided-mut');
    const genes = {
      strength: { type: 'scalar', value: 0.5 },
      name: { type: 'categorical', value: 'warrior' },
    };
    const gradients = {
      strength: { dOutput_dGene: 0.3, confidence: 0.7, suggestedDirection: 'increase' as const },
    };

    const result = gradientGuidedMutate(genes, gradients, 0.1, rng);
    expect(result.strength).toBeDefined();
    expect(result.name).toBeDefined();
    expect(result.strength.value).toBeGreaterThan(0.5);
    expect(result.name.value).toBe('warrior');
  });

  it('categorical type returns low-confidence gradient', () => {
    const grad = computeGeneGradient({
      geneName: 'archetype', geneValue: 'warrior', geneType: 'categorical',
      qualityBefore: BASE_QUALITY,
      qualityAfter: IMPROVED_QUALITY,
    });
    expect(grad.confidence).toBe(0);
    expect(grad.suggestedDirection).toBe('increase');
  });

  it('low confidence returns unchanged value', () => {
    const result = applyGradientSuggestion(0.5, {
      dOutput_dGene: 0, confidence: 0, suggestedDirection: 'none' as const,
    }, 0.1);
    expect(result).toBe(0.5);
  });
});
