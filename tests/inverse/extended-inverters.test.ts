/**
 * Extended inverters tests — NarrativeText, SeedGraph, PersonaVector.
 */
import { describe, it, expect } from 'vitest';
import {
  NarrativeTextInverter,
  SeedGraphInverter,
  PersonaVectorInverter,
  type LineageGraph,
  type PersonaVector,
} from '../../src/lib/intelligence/inverse';

describe('NarrativeTextInverter', () => {
  const inv = new NarrativeTextInverter();

  it('detects dark tone from prose lexicon', async () => {
    const r = await inv.invert("Shadow and blood crept through the rotted halls. Silence. Dread. Cold ash on every step.");
    const tone = r.genes.find((g) => g.path === 'narrative.tone')!;
    expect(tone.value).toBe('dark');
    expect(tone.confidence).toBeGreaterThan(0.5);
  });

  it('detects first-person POV', async () => {
    const r = await inv.invert("I walked through the city. My boots were wet. I remembered the way home, slowly, alone.");
    const pov = r.genes.find((g) => g.path === 'narrative.pov')!;
    expect(pov.value).toBe('first');
  });

  it('faster pacing for shorter sentences', async () => {
    const fast = await inv.invert("She ran. He fell. The bell rang. Someone screamed. Nothing moved.");
    const slow = await inv.invert("The long, considered, almost philosophical observation of the slow afternoon light moving across the dusty floorboards offered the kind of melancholy that only autumn can deliver, and even that, perhaps, only in a certain mood.");
    const fp = fast.genes.find((g) => g.path === 'narrative.pacing')!.value as number;
    const sp = slow.genes.find((g) => g.path === 'narrative.pacing')!.value as number;
    expect(fp).toBeGreaterThan(sp);
  });

  it('refuses empty strings', () => {
    expect(inv.accepts('')).toBe(false);
    expect(inv.accepts('  ')).toBe(false);
    expect(inv.accepts('text')).toBe(true);
  });
});

describe('SeedGraphInverter', () => {
  const inv = new SeedGraphInverter();

  it('computes depth + fan-in correctly', async () => {
    const g: LineageGraph = {
      root: 'd',
      nodes: [
        { id: 'a', parents: [] },
        { id: 'b', parents: [] },
        { id: 'c', parents: ['a', 'b'], op: 'compose', weights: [0.5, 0.5] },
        { id: 'd', parents: ['c'], op: 'mutate' },
      ],
    };
    const r = await inv.invert(g);
    expect(r.genes.find((x) => x.path === 'composition.depth')!.value).toBe(2);
    expect(r.genes.find((x) => x.path === 'composition.fanIn')!.value).toBe(1);
    expect(r.genes.find((x) => x.path === 'composition.lineageBreadth')!.value).toBe(3);
  });

  it('extracts weight mean + variance', async () => {
    const g: LineageGraph = {
      root: 'r',
      nodes: [
        { id: 'a', parents: [] },
        { id: 'b', parents: [] },
        { id: 'r', parents: ['a', 'b'], op: 'compose', weights: [0.3, 0.7] },
      ],
    };
    const r = await inv.invert(g);
    const mean = r.genes.find((x) => x.path === 'composition.weightMean')!.value as number;
    expect(mean).toBeCloseTo(0.5, 1);
  });

  it('records residual when weights missing', async () => {
    const g: LineageGraph = { root: 'a', nodes: [{ id: 'a', parents: [] }] };
    const r = await inv.invert(g);
    expect(r.residuals.find((x) => x.feature === 'composition.weights')).toBeTruthy();
  });
});

describe('PersonaVectorInverter', () => {
  const inv = new PersonaVectorInverter();

  it('maps Big Five 1:1 with high confidence', async () => {
    const v: PersonaVector = {
      bigFive: { openness: 0.9, conscientiousness: 0.6, extraversion: 0.7, agreeableness: 0.5, neuroticism: 0.3 },
    };
    const r = await inv.invert(v);
    expect(r.genes.find((g) => g.path === 'persona.bigFive.openness')!.value).toBe(0.9);
    expect(r.genes.every((g) => g.path.startsWith('persona.bigFive.') ? g.confidence >= 0.9 : true)).toBe(true);
  });

  it('picks archetype from Big Five rules', async () => {
    const sage: PersonaVector = {
      bigFive: { openness: 0.85, conscientiousness: 0.75, extraversion: 0.4, agreeableness: 0.5, neuroticism: 0.3 },
    };
    const r = await inv.invert(sage);
    const arch = r.genes.find((g) => g.path === 'persona.archetype')!;
    expect(arch.value).toBe('Sage');
  });

  it('boosts confidence when archetypeHint matches rules', async () => {
    const v: PersonaVector = {
      bigFive: { openness: 0.85, conscientiousness: 0.75, extraversion: 0.4, agreeableness: 0.5, neuroticism: 0.3 },
      archetypeHints: ['Sage'],
    };
    const r = await inv.invert(v);
    const arch = r.genes.find((g) => g.path === 'persona.archetype')!;
    expect(arch.confidence).toBeGreaterThan(0.8);
  });

  it('emits residuals when attachment unspecified', async () => {
    const v: PersonaVector = {
      bigFive: { openness: 0.5, conscientiousness: 0.5, extraversion: 0.5, agreeableness: 0.5, neuroticism: 0.5 },
    };
    const r = await inv.invert(v);
    expect(r.residuals.find((x) => x.feature === 'persona.attachment')).toBeTruthy();
  });
});
