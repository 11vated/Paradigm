/**
 * Director — matter archetypes (WS34).
 */
import { describe, it as test, expect } from 'vitest';
import { classifyArchetype, planUniverse } from '../../src/lib/engines/director';

describe('director matter archetypes', () => {
  test('drug prompt → matter-drug', () => {
    expect(classifyArchetype('design a small-molecule inhibitor for kinase')).toBe('matter-drug');
    expect(classifyArchetype('synthesize a new antibiotic')).toBe('matter-drug');
  });
  test('material prompt → matter-material', () => {
    expect(classifyArchetype('design a graphene composite for spacecraft heat shielding')).toBe('matter-material');
    expect(classifyArchetype('discover a new superconductor alloy')).toBe('matter-material');
  });
  test('protein prompt → matter-protein', () => {
    expect(classifyArchetype('predict the folding of a designed enzyme')).toBe('matter-protein');
    expect(classifyArchetype('engineer an antibody for an epitope')).toBe('matter-protein');
  });
  test('matter archetypes plan to the matter engine', () => {
    for (const prompt of ['design a kinase inhibitor', 'graphene metamaterial design', 'engineer a folded protein']) {
      const plan = planUniverse(prompt);
      expect(plan.nodes.length).toBeGreaterThanOrEqual(1);
      const engines = new Set(plan.nodes.map((n) => n.engine));
      expect(engines.has('matter')).toBe(true);
    }
  });
  test('determinism: same prompt → same plan', () => {
    const a = planUniverse('design a new antibiotic');
    const b = planUniverse('design a new antibiotic');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
