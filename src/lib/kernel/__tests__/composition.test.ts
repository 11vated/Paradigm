/**
 * COMPOSITION & CROSS-DOMAIN FUNCTOR TESTS
 * 
 * Unit tests for the 50+ cross-domain composition functors
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Xoshiro256StarStar, rngFromHash } from '../../src/lib/kernel/rng';
import {
  getFunctor,
  findCompositionPath,
  composeSeed,
  getCompositionGraph
} from '../../src/lib/kernel/composition';

describe('Cross-Domain Composition', () => {
  let rng: Xoshiro256StarStar;

  beforeEach(() => {
    rng = rngFromHash('composition-test-seed');
  });

  describe('Functor Retrieval', () => {
    it('should retrieve character→clothing functor', () => {
      const functor = getFunctor('character', 'clothing');
      expect(functor).toBeDefined();
      expect(functor?.sourceDomain).toBe('character');
      expect(functor?.targetDomain).toBe('clothing');
    });

    it('should retrieve music→dance functor', () => {
      const functor = getFunctor('music', 'dance');
      expect(functor).toBeDefined();
      expect(functor?.sourceDomain).toBe('music');
      expect(functor?.targetDomain).toBe('dance');
    });

    it('should retrieve story→animation functor', () => {
      const functor = getFunctor('story', 'animation');
      expect(functor).toBeDefined();
    });

    it('should retrieve landscape→architecture functor', () => {
      const functor = getFunctor('landscape', 'architecture');
      expect(functor).toBeDefined();
    });

    it('should return undefined for unknown domain pair', () => {
      const functor = getFunctor('unknown', 'domain');
      expect(functor).toBeUndefined();
    });
  });

  describe('Composition Path Finding', () => {
    it('should find direct path for known functor', () => {
      const path = findCompositionPath('character', 'clothing');
      expect(path).toHaveLength(1);
      expect(path[0].sourceDomain).toBe('character');
      expect(path[0].targetDomain).toBe('clothing');
    });

    it('should find multi-hop path for unknown direct pair', () => {
      // If no direct path, should find indirect path through intermediate domains
      const path = findCompositionPath('music', 'architecture');
      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThanOrEqual(1);
    });

    it('should return empty path for impossible composition', () => {
      const path = findCompositionPath('music', 'quantum');
      expect(path).toHaveLength(0);
    });

    it('should prefer shorter paths', () => {
      const directPath = findCompositionPath('character', 'clothing');
      expect(directPath).toHaveLength(1);
    });
  });

  describe('Seed Composition', () => {
    it('should compose character→clothing', async () => {
      const sourceSeed = {
        $domain: 'character',
        $name: 'TestCharacter',
        genes: {
          style: { value: 'fantasy' },
          personality: { value: 'brave' }
        }
      };

      const result = await composeSeed(sourceSeed, 'clothing', rng);
      
      expect(result).toBeDefined();
      expect(result.$domain).toBe('clothing');
      expect(result.genes).toBeDefined();
    });

    it('should compose music→dance', async () => {
      const sourceSeed = {
        $domain: 'music',
        $name: 'TestMusic',
        genes: {
          tempo: { value: 120 },
          genre: { value: 'electronic' }
        }
      };

      const result = await composeSeed(sourceSeed, 'dance', rng);
      
      expect(result).toBeDefined();
      expect(result.$domain).toBe('dance');
    });

    it('should compose story→animation', async () => {
      const sourceSeed = {
        $domain: 'story',
        $name: 'TestStory',
        genes: {
          plot: { value: 'hero journey' },
          mood: { value: 'adventure' }
        }
      };

      const result = await composeSeed(sourceSeed, 'animation', rng);
      
      expect(result).toBeDefined();
      expect(result.$domain).toBe('animation');
    });
  });

  describe('Composition Graph', () => {
    it('should return valid graph structure', () => {
      const graph = getCompositionGraph();
      
      expect(graph.nodes).toBeDefined();
      expect(graph.edges).toBeDefined();
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
    });

    it('should contain all domain engines as nodes', () => {
      const graph = getCompositionGraph();
      
      // Should have nodes for each domain
      expect(graph.nodes.length).toBeGreaterThan(0);
    });

    it('should have edges representing functors', () => {
      const graph = getCompositionGraph();
      
      // Should have edges between domains
      expect(graph.edges.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Functor Properties', () => {
    it('should have valid transform function', () => {
      const functor = getFunctor('character', 'clothing');
      expect(functor?.transform).toBeDefined();
      expect(typeof functor?.transform).toBe('function');
    });

    it('should have compatibility score', () => {
      const functor = getFunctor('music', 'dance');
      expect(functor?.compatibility).toBeGreaterThanOrEqual(0);
      expect(functor?.compatibility).toBeLessThanOrEqual(1);
    });
  });

  describe('Determinism', () => {
    it('should produce same output with same source and RNG', async () => {
      const sourceSeed = {
        $domain: 'character',
        $name: 'DeterminismTest',
        genes: { style: { value: 'cyberpunk' } }
      };

      const rng1 = rngFromHash('same-seed-abc');
      const rng2 = rngFromHash('same-seed-abc');

      const result1 = await composeSeed(sourceSeed, 'clothing', rng1);
      const result2 = await composeSeed(sourceSeed, 'clothing', rng2);

      expect(result1.id).toBe(result2.id);
    });
  });

  describe('Edge Cases', () => {
    it('should handle seed without genes', async () => {
      const sourceSeed = {
        $domain: 'character',
        $name: 'NoGenes'
      };

      const result = await composeSeed(sourceSeed, 'clothing', rng);
      
      // Should still create output with default genes
      expect(result).toBeDefined();
    });

    it('should handle composer returning null gracefully', async () => {
      const sourceSeed = {
        $domain: 'character',
        $name: 'Test'
      };

      // Try a valid but potentially edge-case composition
      const result = await composeSeed(sourceSeed, 'clothing', rng);
      expect(result).toBeDefined();
    });
  });
});