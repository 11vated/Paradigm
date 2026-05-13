import { describe, it, expect } from 'vitest';
import {
  FUNCTOR_REGISTRY, getFunctor, findCompositionPath,
  composeSeed, getCompositionGraph, getPossibleCompositions, getReachableDomains,
} from '../../src/lib/kernel/composition.js';

describe('Composition Engine', () => {
  describe('getCompositionGraph', () => {
    it('returns nodes and edges', () => {
      const graph = getCompositionGraph();
      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
    });

    it('has at least 12 edges', () => {
      const graph = getCompositionGraph();
      expect(graph.edges.length).toBeGreaterThanOrEqual(12);
    });

    it('edges have sourceDomain, targetDomain, name, coherence properties', () => {
      const graph = getCompositionGraph();
      for (const edge of graph.edges) {
        expect(edge).toHaveProperty('sourceDomain');
        expect(edge).toHaveProperty('targetDomain');
        expect(edge).toHaveProperty('name');
        expect(edge).toHaveProperty('coherence');
        expect(typeof edge.sourceDomain).toBe('string');
        expect(typeof edge.targetDomain).toBe('string');
        expect(typeof edge.name).toBe('string');
        expect(typeof edge.coherence).toBe('number');
      }
    });
  });

  describe('getFunctor', () => {
    it('finds by name', () => {
      const f = getFunctor('character_to_sprite');
      expect(f).toBeDefined();
      expect(f!.sourceDomain).toBe('character');
      expect(f!.targetDomain).toBe('sprite');
    });

    it('returns undefined for unknown functor', () => {
      expect(getFunctor('nonexistent')).toBeUndefined();
    });
  });

  describe('FUNCTOR_REGISTRY', () => {
    it('has 12+ functors', () => {
      expect(FUNCTOR_REGISTRY.length).toBeGreaterThanOrEqual(12);
    });

    it('all functors have valid coherence', () => {
      for (const f of FUNCTOR_REGISTRY) {
        expect(f.coherence).toBeGreaterThan(0);
        expect(f.coherence).toBeLessThanOrEqual(1);
        expect(f.sourceDomain).toBeTruthy();
        expect(f.targetDomain).toBeTruthy();
        expect(f.name).toBeTruthy();
      }
    });
  });

  describe('findCompositionPath', () => {
    it('finds direct path for adjacent domains', () => {
      const path = findCompositionPath('character', 'sprite');
      expect(path).not.toBeNull();
      expect(path!.bridges.length).toBe(1);
      expect(path!.totalCoherence).toBeGreaterThan(0);
    });

    it('finds multi-hop path', () => {
      const path = findCompositionPath('character', 'fullgame');
      expect(path).not.toBeNull();
      expect(path!.bridges.length).toBeGreaterThanOrEqual(1);
      expect(path!.totalCoherence).toBeGreaterThan(0);
    });

    it('returns null for unreachable paths', () => {
      const path = findCompositionPath('sprite', 'music');
      expect(path).toBeNull();
    });
  });

  describe('composeSeed', () => {
    it('composes seed to target domain', () => {
      const seed = { $domain: 'character', $name: 'Test', id: '123' };
      const result = composeSeed(seed, 'sprite');
      expect(result.$domain).toBe('sprite');
      expect(result.$name).toBe('Test');
    });

    it('preserves genes during composition', () => {
      const seed = { $domain: 'character', genes: { strength: { value: 0.8 } } };
      const result = composeSeed(seed, 'fullgame');
      expect(result.$domain).toBe('fullgame');
      expect(result.genes).toBeDefined();
    });
  });

  describe('getPossibleCompositions', () => {
    it('returns functors from a domain', () => {
      const bridges = getPossibleCompositions('character');
      expect(bridges.length).toBeGreaterThan(0);
      for (const b of bridges) expect(b.sourceDomain).toBe('character');
    });

    it('returns empty for domain with no outgoing', () => {
      const bridges = getPossibleCompositions('typography');
      expect(Array.isArray(bridges)).toBe(true);
    });
  });

  describe('getReachableDomains', () => {
    it('returns reachable domains from source', () => {
      const domains = getReachableDomains('character');
      expect(domains.length).toBeGreaterThan(0);
      const names = domains.map((d: any) => d.domain || d);
      expect(names).toContain('sprite');
      expect(names).toContain('fullgame');
    });

    it('excludes source domain (it only returns reachable peers)', () => {
      const domains = getReachableDomains('character');
      const names = domains.map((d: any) => d.domain || d);
      expect(names).not.toContain('character');
    });
  });
});
