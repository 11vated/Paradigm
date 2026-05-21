/**
 * Reality-OS substrate tests
 *
 * Pin the canonical behavior of:
 *   - 7-dimensional signatures (composition, projection, similarity)
 *   - resonance scoring (harmonic, semantic, structural, fractal)
 *   - archetype lattice (classify, pair, oppose, arc)
 *   - field-theory primitives (intention, possibility, constraint)
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_DIMENSIONS,
  makeSignature,
  signatureSimilarity,
  signatureDistance,
  unionSignatures,
  intersectSignatures,
  dominantDimension,
  visualizationManifest,
  signatureFor,
  findTransform,
  GENE_SIGNATURES,
} from '../../src/lib/intelligence/reality/dimensions';
import {
  harmonicResonance,
  fractalSelfSimilarity,
  transcendentalResonance,
  semanticResonance,
  structuralResonance,
  resonance,
  PHI,
} from '../../src/lib/intelligence/reality/resonance';
import {
  ARCHETYPE_LATTICE,
  classifyByVector,
  pairFor,
  opposeFor,
  arcOf,
} from '../../src/lib/intelligence/reality/archetypes';
import {
  intentionField,
  possibilityField,
  constraintField,
  compoundField,
  counterfactuals,
} from '../../src/lib/intelligence/reality/fields';

describe('dimensional encoding', () => {
  it('exposes all 7 canonical dimensions', () => {
    expect(ALL_DIMENSIONS).toHaveLength(7);
    expect(ALL_DIMENSIONS).toContain('SPATIAL');
    expect(ALL_DIMENSIONS).toContain('TEMPORAL');
    expect(ALL_DIMENSIONS).toContain('POSSIBLE');
  });

  it('signature for music is SPECTRAL+TEMPORAL dominant', () => {
    const sig = signatureFor('music');
    expect(dominantDimension(sig)).toMatch(/SPECTRAL|TEMPORAL/);
    expect(sig.weights.SPECTRAL).toBeGreaterThan(0.8);
  });

  it('union of two signatures takes element-wise max', () => {
    const a = makeSignature({ SPATIAL: 0.3, MODAL: 0.8 });
    const b = makeSignature({ SPATIAL: 0.7, SPECTRAL: 0.5 });
    const u = unionSignatures(a, b);
    expect(u.weights.SPATIAL).toBe(0.7);
    expect(u.weights.MODAL).toBe(0.8);
    expect(u.weights.SPECTRAL).toBe(0.5);
  });

  it('intersection takes element-wise min', () => {
    const a = makeSignature({ SPATIAL: 0.3, MODAL: 0.8 });
    const b = makeSignature({ SPATIAL: 0.7, MODAL: 0.4 });
    const x = intersectSignatures(a, b);
    expect(x.weights.SPATIAL).toBe(0.3);
    expect(x.weights.MODAL).toBe(0.4);
  });

  it('signatureSimilarity is symmetric and identity = 1', () => {
    const a = makeSignature({ SPATIAL: 0.8, MODAL: 0.4 });
    expect(signatureSimilarity(a, a)).toBeCloseTo(1, 5);
    const b = makeSignature({ SPATIAL: 0.4, MODAL: 0.8 });
    expect(signatureSimilarity(a, b)).toBeCloseTo(signatureSimilarity(b, a), 5);
  });

  it('signatureDistance is 0 for identical inputs', () => {
    const sig = makeSignature({ SPATIAL: 0.5 });
    expect(signatureDistance(sig, sig)).toBe(0);
  });

  it('visualization manifest names a renderer per occupied dimension', () => {
    const manifest = visualizationManifest(signatureFor('friend'));
    expect(manifest.primary).toBe('MODAL');
    expect(manifest.renderers.length).toBeGreaterThan(2);
    expect(manifest.renderers[0].weight).toBeGreaterThanOrEqual(manifest.renderers[1].weight);
  });

  it('cross-dimensional transforms are registered for canonical pairs', () => {
    expect(findTransform('MODAL', 'SPECTRAL')).toBeDefined();
    expect(findTransform('SPECTRAL', 'SPATIAL')).toBeDefined();
    expect(findTransform('MODAL', 'TEMPORAL')).toBeDefined();
  });
});

describe('resonance engine', () => {
  it('perfect-fifth detects 3:2 ratio', () => {
    const h = harmonicResonance(440, 660); // A → E (3:2)
    expect(h.bestMatch).toBe('perfect-fifth');
    expect(h.score).toBeGreaterThan(0.9);
  });

  it('octave detects 2:1', () => {
    const h = harmonicResonance(220, 440);
    expect(h.bestMatch).toBe('octave');
  });

  it('golden ratio matches PHI', () => {
    const h = harmonicResonance(1, PHI);
    expect(h.bestMatch).toBe('golden');
    expect(h.score).toBeGreaterThan(0.95);
  });

  it('transcendental resonance detects π', () => {
    const t = transcendentalResonance(Math.PI);
    expect(t.bestMatch).toBe('pi');
    expect(t.score).toBeGreaterThan(0.95);
  });

  it('fractal self-similarity is high for self-similar sequences', () => {
    // perfectly self-similar: [1,2,1,2,1,2,1,2]
    const sim = fractalSelfSimilarity([1, 2, 1, 2, 1, 2, 1, 2]);
    expect(sim).toBeGreaterThan(0.5);
  });

  it('semantic resonance is high for parallel 12-D vectors', () => {
    const a = new Array(12).fill(0) as number[];
    a[0] = 0.8;
    const b = [...a];
    expect(semanticResonance(a as any, b as any)).toBeGreaterThan(0.99);
  });

  it('structural resonance returns 1 for identical graphs', () => {
    const g = { nodes: ['a', 'b'], edges: [['a', 'b']] as Array<[string, string]> };
    expect(structuralResonance(g, g)).toBeCloseTo(1, 3);
  });

  it('composite resonance averages across components', () => {
    const r = resonance({
      harmonic: { a: 440, b: 660 },
      dimensional: { a: GENE_SIGNATURES.music, b: GENE_SIGNATURES.voice },
    });
    expect(r.total).toBeGreaterThan(0.3);
    expect(r.components.harmonic).toBeDefined();
    expect(r.components.dimensional).toBeDefined();
  });
});

describe('archetype lattice', () => {
  it('has 15 archetypes', () => {
    expect(Object.keys(ARCHETYPE_LATTICE)).toHaveLength(15);
  });

  it('hero pairs with mentor + opposes shadow', () => {
    expect(pairFor('hero')).toContain('mentor');
    expect(opposeFor('hero')).toContain('shadow');
  });

  it('hero canonically transforms into mentor', () => {
    expect(arcOf('hero')).toContain('mentor');
  });

  it('classifyByVector returns highest-cosine archetype', () => {
    const heroVector = ARCHETYPE_LATTICE.hero.vad12;
    const { archetype, confidence } = classifyByVector(heroVector);
    expect(archetype).toBe('hero');
    expect(confidence).toBeGreaterThan(0.95);
  });
});

describe('field theory', () => {
  it('intention field pulls toward goal', () => {
    const goal = new Array(12).fill(0);
    goal[0] = 1;
    const f = intentionField(goal as any);
    const score = f.evaluate(goal as any);
    expect(score).toBeGreaterThan(0.95);
  });

  it('possibility field weighted-averages multiple centers', () => {
    const c1 = new Array(12).fill(0); c1[0] = 1;
    const c2 = new Array(12).fill(0); c2[1] = 1;
    const f = possibilityField([
      { point: c1 as any, weight: 1 },
      { point: c2 as any, weight: 1 },
    ]);
    const midpoint = new Array(12).fill(0);
    midpoint[0] = 0.5; midpoint[1] = 0.5;
    expect(f.evaluate(midpoint as any)).toBeGreaterThan(0);
  });

  it('constraint field repels from forbidden region', () => {
    const center = new Array(12).fill(0); center[0] = 1;
    const f = constraintField(center as any, 0.5, 1);
    expect(f.evaluate(center as any)).toBeLessThan(0);  // inside → negative
    const far = new Array(12).fill(0); far[0] = -1;
    expect(f.evaluate(far as any)).toBe(0);             // outside → 0
  });

  it('compound field sums children', () => {
    const goal = new Array(12).fill(0); goal[0] = 1;
    const f = compoundField([intentionField(goal as any, 0.5), intentionField(goal as any, 0.5)]);
    expect(f.evaluate(goal as any)).toBeGreaterThan(0.9);
  });

  it('counterfactuals returns k variants stepped along gradient', () => {
    const point = new Array(12).fill(0);
    const goal = new Array(12).fill(0); goal[3] = 1;
    const f = intentionField(goal as any);
    const variants = counterfactuals(point as any, f, 2);
    expect(variants).toHaveLength(2);
    expect(variants[0]).not.toEqual(point);
  });
});

describe('determinism', () => {
  it('resonance produces identical output across runs', () => {
    const inp = {
      harmonic: { a: 440, b: 660 },
      fractal: [1, 2, 3, 2, 1, 2, 3, 2],
    };
    const r1 = resonance(inp);
    const r2 = resonance(inp);
    expect(r1.total).toBe(r2.total);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });

  it('classifyByVector is deterministic', () => {
    const v = new Array(12).fill(0.5);
    expect(classifyByVector(v)).toEqual(classifyByVector(v));
  });
});
