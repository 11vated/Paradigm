/**
 * Multiverse Director — scaffold tests.
 * Proves: archetype classification is deterministic; plans are valid
 * DAGs; topo-sort respects dependencies; same prompt → same plan forever.
 */
import { describe, it as test, expect } from 'vitest';
import {
  classifyArchetype,
  planUniverse,
  validatePlan,
  topoSortPlan,
  growUniverse,
  directorCapability,
} from '../../src/lib/engines/director';

describe('multiverse director', () => {
  test('classifyArchetype is deterministic & keyword-driven', () => {
    expect(classifyArchetype('a brave starship captain')).toBe('sci-fi-hard');
    expect(classifyArchetype('a brave starship captain')).toBe('sci-fi-hard');
    expect(classifyArchetype('a wizard with a sword')).toBe('fantasy-high');
    expect(classifyArchetype('a tavern in a small village')).toBe('fantasy-low');
    expect(classifyArchetype('an eldritch void beyond knowing')).toBe('cosmic-horror');
    expect(classifyArchetype('an office in a modern city')).toBe('modern');
    expect(classifyArchetype('something pure and formless')).toBe('abstract');
  });

  test('planUniverse rejects empty prompts', () => {
    expect(() => planUniverse('')).toThrow();
  });

  test('planUniverse: same prompt → same plan (deterministic)', () => {
    const p1 = planUniverse('a dragon guarding a vault');
    const p2 = planUniverse('a dragon guarding a vault');
    expect(p1.rootSeedHash).toBe(p2.rootSeedHash);
    expect(p1.nodes.length).toBe(p2.nodes.length);
    for (let i = 0; i < p1.nodes.length; i++) {
      expect(p1.nodes[i].id).toBe(p2.nodes[i].id);
      expect(p1.nodes[i].seedHash).toBe(p2.nodes[i].seedHash);
      expect(p1.nodes[i].dependsOn).toEqual(p2.nodes[i].dependsOn);
    }
  });

  test('planUniverse: different prompts → different root seeds', () => {
    const a = planUniverse('a dragon');
    const b = planUniverse('a starship');
    expect(a.rootSeedHash).not.toBe(b.rootSeedHash);
  });

  test('every produced plan validates', () => {
    for (const prompt of [
      'a brave starship captain',
      'a dragon hoard',
      'a tavern brawl',
      'a quantum void',
      'an office worker',
      'a samurai duel',
      'a typographic study',
    ]) {
      const plan = planUniverse(prompt);
      const v = validatePlan(plan);
      expect(v.ok).toBe(true);
    }
  });

  test('topoSort respects dependencies', () => {
    const plan = planUniverse('a brave starship captain');
    const sorted = topoSortPlan(plan);
    const seen = new Set<string>();
    for (const n of sorted) {
      for (const dep of n.dependsOn) expect(seen.has(dep)).toBe(true);
      seen.add(n.id);
    }
    expect(sorted.length).toBe(plan.nodes.length);
  });

  test('growUniverse: every node has a typed Seed with matching $hash', () => {
    const { plan, order } = growUniverse('a wizard with a sword');
    expect(order.length).toBe(plan.nodes.length);
    for (const { node, seed } of order) {
      expect(seed.$hash).toBe(node.seedHash);
      expect(seed.$domain).toBe(node.engine);
      expect(seed.$kind).toBe(node.kind);
    }
  });

  test('directorCapability is frozen and lists all 9 engines', () => {
    expect(Object.isFrozen(directorCapability)).toBe(true);
    expect(directorCapability.composes.length).toBe(9);
    expect(directorCapability.archetypes.length).toBeGreaterThan(0);
  });
});
