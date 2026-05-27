/**
 * Stratum predicate tests for Mind / Story / World / Field / Culture / Time.
 *
 * Doctrine v2 Part VI.4–VI.9. With this file all nine strata have
 * exercising tests. Each test covers both the pass and at least one
 * fail path of every implemented predicate.
 */
import { describe, it, expect } from 'vitest';
import {
  mindContract, type MindArtifact,
  storyContract, type StoryArtifact,
  worldContract, type WorldArtifact,
  fieldContract, type FieldArtifact,
  cultureContract, type CultureArtifact,
  timeContract, type TimeArtifact,
} from '../../src/lib/contracts';

const findResult =
  <A>(c: { evaluate: (a: A) => { results: { id: string; result: any }[] } }) =>
  (a: A, id: string) =>
    c.evaluate(a).results.find((r) => r.id === id)?.result;

describe('Doctrine VI.4 — Mind predicates', () => {
  const find = findResult<MindArtifact>(mindContract);
  it('statesReachable detects orphans', () => {
    expect(find({ stateCount: 5, reachableCount: 5 }, 'mind.statesReachable')).toEqual({ kind: 'pass' });
    expect(find({ stateCount: 5, reachableCount: 3 }, 'mind.statesReachable')?.kind).toBe('fail');
    expect(find({ stateCount: 3, reachableCount: 5 }, 'mind.statesReachable')?.kind).toBe('fail');
  });
  it('goalStackBounded caps at hard cap + engine ceiling', () => {
    expect(find({ maxGoalDepth: 50, goalStackCeiling: 100 }, 'mind.goalStackBounded')).toEqual({ kind: 'pass' });
    expect(find({ maxGoalDepth: 200, goalStackCeiling: 100 }, 'mind.goalStackBounded')?.kind).toBe('fail');
    expect(find({ maxGoalDepth: 2000 }, 'mind.goalStackBounded')?.kind).toBe('fail');
  });
  it('terminationProvable accepts proof OR bounded steps', () => {
    expect(find({ terminationProof: 'proof-1' }, 'mind.terminationProvable')).toEqual({ kind: 'pass' });
    expect(find({ boundedSteps: 1000 }, 'mind.terminationProvable')).toEqual({ kind: 'pass' });
    expect(find({ terminationProof: null }, 'mind.terminationProvable')?.kind).toBe('fail');
  });
});

describe('Doctrine VI.5 — Story predicates', () => {
  const find = findResult<StoryArtifact>(storyContract);
  it('beatStructureDeclared validates canonical beat counts', () => {
    expect(find({ beatStructure: 'save-the-cat', beatCount: 15 }, 'story.beatStructureDeclared')).toEqual({ kind: 'pass' });
    expect(find({ beatStructure: 'heros-journey', beatCount: 17 }, 'story.beatStructureDeclared')).toEqual({ kind: 'pass' });
    expect(find({ beatStructure: 'save-the-cat', beatCount: 10 }, 'story.beatStructureDeclared')?.kind).toBe('fail');
  });
  it('causalityAcyclic enforces DAG edge bound', () => {
    expect(find({ causalityAcyclic: true, causalityNodeCount: 5, causalityEdgeCount: 7 }, 'story.causalityAcyclic')).toEqual({ kind: 'pass' });
    expect(find({ causalityAcyclic: false }, 'story.causalityAcyclic')?.kind).toBe('fail');
    expect(find({ causalityAcyclic: true, causalityNodeCount: 3, causalityEdgeCount: 100 }, 'story.causalityAcyclic')?.kind).toBe('fail');
  });
  it('voiceConsistency requires hashes + verdict', () => {
    expect(find({ characterMindHashes: { 'Alice': 'abc' }, voiceFingerprintsMatch: true }, 'story.voiceConsistency')).toEqual({ kind: 'pass' });
    expect(find({ characterMindHashes: { 'Alice': 'abc' }, voiceFingerprintsMatch: false }, 'story.voiceConsistency')?.kind).toBe('fail');
    expect(find({ characterMindHashes: {} }, 'story.voiceConsistency')?.kind).toBe('fail');
  });
});

describe('Doctrine VI.6 — World predicates', () => {
  const find = findResult<WorldArtifact>(worldContract);
  it('navmeshContinuous flags multi-island contradictions', () => {
    expect(find({ navmeshContinuous: true, navmeshIslandCount: 1 }, 'world.navmeshContinuous')).toEqual({ kind: 'pass' });
    expect(find({ navmeshContinuous: true, navmeshIslandCount: 5 }, 'world.navmeshContinuous')?.kind).toBe('fail');
    expect(find({ navmeshContinuous: false }, 'world.navmeshContinuous')?.kind).toBe('fail');
  });
  it('biomeConsistency checks temperature bounds', () => {
    expect(find({ biomes: ['desert', 'temperate'], biomeMeanTempC: { desert: 30, temperate: 15 } }, 'world.biomeConsistency')).toEqual({ kind: 'pass' });
    expect(find({ biomes: ['arctic'], biomeMeanTempC: { arctic: 50 } }, 'world.biomeConsistency')?.kind).toBe('fail');
  });
});

describe('Doctrine VI.7 — Field predicates', () => {
  const find = findResult<FieldArtifact>(fieldContract);
  it('rulesTyped checks arity coverage', () => {
    expect(find({ ruleCount: 3, ruleArities: [2, 2, 3] }, 'field.rulesTyped')).toEqual({ kind: 'pass' });
    expect(find({ ruleCount: 3, ruleArities: [2, 2] }, 'field.rulesTyped')?.kind).toBe('fail');
    expect(find({ ruleCount: 1, ruleArities: [-1] }, 'field.rulesTyped')?.kind).toBe('fail');
  });
  it('decidabilityDeclared rejects non-canonical', () => {
    expect(find({ decidability: 'decidable' }, 'field.decidabilityDeclared')).toEqual({ kind: 'pass' });
    expect(find({ decidability: 'whatever' as any }, 'field.decidabilityDeclared')?.kind).toBe('fail');
  });
  it('conservation evaluates drift bounds', () => {
    expect(find({ conservedQuantities: ['energy'], conservationDriftPerStep: { energy: 1e-12 } }, 'field.conservation')).toEqual({ kind: 'pass' });
    expect(find({ conservedQuantities: ['energy'], conservationDriftPerStep: { energy: 1e-3 } }, 'field.conservation')?.kind).toBe('fail');
  });
});

describe('Doctrine VI.8 — Culture predicates', () => {
  const find = findResult<CultureArtifact>(cultureContract);
  it('languageDeclared accepts BCP-47', () => {
    expect(find({ language: 'en-US' }, 'culture.languageDeclared')).toEqual({ kind: 'pass' });
    expect(find({ language: 'pt-BR' }, 'culture.languageDeclared')).toEqual({ kind: 'pass' });
    expect(find({ language: 'NOT-A-TAG' }, 'culture.languageDeclared')?.kind).toBe('fail');
  });
  it('tabooConsistency flags overlap with canonical practice', () => {
    expect(find({ taboos: ['theft', 'lying'], canonicalPractices: ['craft', 'song'] }, 'culture.tabooConsistency')).toEqual({ kind: 'pass' });
    expect(find({ taboos: ['theft'], canonicalPractices: ['theft', 'song'] }, 'culture.tabooConsistency')?.kind).toBe('fail');
  });
});

describe('Doctrine VI.9 — Time predicates', () => {
  const find = findResult<TimeArtifact>(timeContract);
  it('chronologyAcyclic flags impossible edge counts', () => {
    expect(find({ chronologyAcyclic: true, eventCount: 5, chronologyEdgeCount: 6 }, 'time.chronologyAcyclic')).toEqual({ kind: 'pass' });
    expect(find({ chronologyAcyclic: true, eventCount: 3, chronologyEdgeCount: 100 }, 'time.chronologyAcyclic')?.kind).toBe('fail');
    expect(find({ chronologyAcyclic: false }, 'time.chronologyAcyclic')?.kind).toBe('fail');
  });
  it('causalityRespected requires zero violations', () => {
    expect(find({ causalityRespected: true, causalityViolationCount: 0 }, 'time.causalityRespected')).toEqual({ kind: 'pass' });
    expect(find({ causalityViolationCount: 3 }, 'time.causalityRespected')?.kind).toBe('fail');
    expect(find({ causalityRespected: false }, 'time.causalityRespected')?.kind).toBe('fail');
  });
  it('scaleDeclared enforces canonical set', () => {
    expect(find({ timeScale: 'in-game' }, 'time.scaleDeclared')).toEqual({ kind: 'pass' });
    expect(find({ timeScale: 'mythic' }, 'time.scaleDeclared')).toEqual({ kind: 'pass' });
    expect(find({ timeScale: 'bogus' as any }, 'time.scaleDeclared')?.kind).toBe('fail');
  });
});
