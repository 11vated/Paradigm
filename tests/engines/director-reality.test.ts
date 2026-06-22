/**
 * Director — reality archetypes (WS31).
 */
import { describe, it as test, expect } from 'vitest';
import { classifyArchetype, planUniverse, validatePlan, topoSortPlan } from '../../src/lib/engines/director';

describe('director reality archetypes', () => {
  test('quantum prompt → reality-quantum', () => {
    expect(classifyArchetype('render a quantum wavefunction of hydrogen')).toBe('reality-quantum');
    expect(classifyArchetype('qubit superposition state')).toBe('reality-quantum');
  });

  test('cosmological prompt → reality-cosmic', () => {
    expect(classifyArchetype('gravitational lensing of a galaxy cluster')).toBe('reality-cosmic');
    expect(classifyArchetype('redshift survey across cosmological scales')).toBe('reality-cosmic');
  });

  test('EM prompt → reality-em', () => {
    expect(classifyArchetype('magnetar X-ray emission')).toBe('reality-em');
    expect(classifyArchetype('radio jet of an active galactic nucleus')).toBe('reality-em');
  });

  test('reality-quantum plan starts with field engine', () => {
    const plan = planUniverse('render electron wavefunction');
    expect(plan.nodes[0].engine).toBe('field');
    expect(plan.nodes[0].kind).toBe('quantum');
    expect(validatePlan(plan).ok).toBe(true);
  });

  test('reality-em plan: matter depends on field', () => {
    const plan = planUniverse('plasma microwave emission');
    expect(plan.nodes).toHaveLength(2);
    expect(plan.nodes[0].engine).toBe('field');
    expect(plan.nodes[1].engine).toBe('matter');
    expect(plan.nodes[1].dependsOn).toContain(plan.nodes[0].id);
    expect(validatePlan(plan).ok).toBe(true);
  });

  test('topo sort: field before world in reality-cosmic', () => {
    const plan = planUniverse('cosmological dark matter distribution');
    const order = topoSortPlan(plan);
    const fieldIdx = order.findIndex(n => n.engine === 'field');
    const worldIdx = order.findIndex(n => n.engine === 'world');
    expect(fieldIdx).toBeLessThan(worldIdx);
  });

  test('determinism', () => {
    const a = planUniverse('magnetar B-field profile');
    const b = planUniverse('magnetar B-field profile');
    expect(a.nodes.map(n => n.id)).toEqual(b.nodes.map(n => n.id));
    expect(a.rootSeedHash).toBe(b.rootSeedHash);
  });
});
