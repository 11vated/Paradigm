import { describe, it, expect } from 'vitest';
import {
  formPredicate,
  motionPredicate,
  soundPredicate,
  mindPredicate,
  storyPredicate,
  worldPredicate,
  fieldPredicate,
  culturePredicate,
  timePredicate,
} from '../../src/lib/kernel/quality/predicates';

function run(fn: (a: any) => any, artifact: any) {
  return fn(artifact);
}

describe('Form stratum predicate', () => {
  it('passes a high-quality mesh', () => {
    const r = run(formPredicate, {
      geometry: { vertices: 50000, faces: 25000, manifold: true, watertight: true, genus: 0 },
      uvCoverage: 0.95,
      symmetry: 0.8,
      detailDensity: 0.7,
      partCoherence: 0.8,
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0.7);
  });

  it('fails a degenerate mesh', () => {
    const r = run(formPredicate, {
      geometry: { vertices: 10, faces: 5, manifold: false, watertight: false, genus: 0 },
      uvCoverage: 0.1,
    });
    expect(r.passed).toBe(false);
    expect(r.score).toBeLessThan(0.7);
  });
});

describe('Motion stratum predicate', () => {
  it('passes a well-articulated rig', () => {
    const r = run(motionPredicate, {
      joints: 30, loopClosure: 0.95, groundContact: true,
      noCollisions: true, energyConservation: 0.8, velocitySmoothness: 0.8,
      accelerationConsistency: 0.8, momentumPreservation: 0.8, timingPrecision: 0.8,
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0.65);
  });

  it('passes a minimally viable rig', () => {
    const r = run(motionPredicate, {
      joints: 8, loopClosure: 0.85, groundContact: true,
      noCollisions: true, velocitySmoothness: 0.6, timingPrecision: 0.6,
    });
    expect(r.passed).toBe(true);
  });
});

describe('Sound stratum predicate', () => {
  it('passes broadcast-standard audio', () => {
    const r = run(soundPredicate, {
      lufs: -14, truePeak: -2, stems: ['vocal', 'guitar', 'drums', 'bass'],
      bpm: 120, spectralBalance: 0.8, dynamicRange: 0.7, rhythmClarity: 0.8,
      timbralRichness: 0.7, harmonyConsonance: 0.8,
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0.7);
  });

  it('fails clipped audio', () => {
    const r = run(soundPredicate, {
      lufs: -3, truePeak: 0.5, stems: ['vocal'],
    });
    expect(r.passed).toBe(false);
  });
});

describe('Mind stratum predicate', () => {
  it('passes an agent with rich behavior set', () => {
    const r = run(mindPredicate, {
      behaviors: ['chase', 'attack', 'flee', 'hide', 'patrol'],
      goals: ['survive', 'reproduce', 'explore'],
      noUnreachableStates: true,
      decisionDepth: 0.7, adaptability: 0.6, learningCapacity: 0.5,
      goalCoherence: 0.7, memoryUtilization: 0.6,
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0.65);
  });

  it('fails a behavior-less agent', () => {
    const r = run(mindPredicate, {
      behaviors: [], goals: [], noUnreachableStates: true,
    });
    expect(r.passed).toBe(false);
  });
});

describe('Story stratum predicate', () => {
  it('passes a well-structured narrative', () => {
    const r = run(storyPredicate, {
      beats: [{ order: 1 }, { order: 2 }, { order: 3 }, { order: 4 }, { order: 5 }, { order: 6 }],
      causalityAcyclic: true,
      voiceConsistency: 0.9,
      characterGrowth: 0.7, thematicCoherence: 0.7, tensionArc: 0.7,
      resolutionQuality: 0.7, subplotIntegration: 0.6,
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0.62);
  });

  it('fails a causally broken story', () => {
    const r = run(storyPredicate, {
      beats: [{ order: 2 }, { order: 1 }],
      causalityAcyclic: false,
    });
    expect(r.passed).toBe(false);
  });
});

describe('World stratum predicate', () => {
  it('passes a rich world', () => {
    const r = run(worldPredicate, {
      biomes: ['forest', 'desert', 'tundra', 'ocean'],
      locations: ['village', 'cave', 'temple', 'fortress', 'harbor', 'mine'],
      factions: ['kingdom', 'rebels', 'guild'],
      navmeshContinuous: true,
      ecologicalCoherence: 0.7, agentDensity: 0.6, spatialConnectivity: 0.7,
      temporalCoherence: 0.6, resourceBalance: 0.6, conflictRichness: 0.6,
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0.6);
  });

  it('fails a disconnected world', () => {
    const r = run(worldPredicate, {
      biomes: [], locations: [], factions: [], navmeshContinuous: false,
    });
    expect(r.passed).toBe(false);
  });
});

describe('Field stratum predicate', () => {
  it('passes a physical system with conservation laws', () => {
    const r = run(fieldPredicate, {
      rules: ['gravity', 'collision', 'friction', 'drag'],
      conservationLaws: ['energy', 'momentum'],
      decidability: 'decidable',
      invariance: 0.7, simulationStability: 0.8, predictability: 0.7,
      emergentComplexity: 0.6, reversibility: 0.6,
    });
    expect(r.passed).toBe(true);
  });

  it('fails a no-conservation system', () => {
    const r = run(fieldPredicate, {
      rules: ['gravity'], conservationLaws: [], decidability: 'decidable',
    });
    expect(r.passed).toBe(false);
  });
});

describe('Culture stratum predicate', () => {
  it('passes a rich culture', () => {
    const r = run(culturePredicate, {
      language: 'Nevar',
      customs: ['greeting', 'mourning', 'feast', 'coming-of-age'],
      taboos: ['naming-dead', 'eating-fish'],
      ipaHints: ['nɛ.vaɾ'],
      transmissionDepth: 0.6, internalConsistency: 0.8,
      practiceDiversity: 0.6, emotionalResonance: 0.7, historicalDepth: 0.6,
    });
    expect(r.passed).toBe(true);
  });

  it('fails a language-less culture', () => {
    const r = run(culturePredicate, {
      language: '', customs: ['greeting'], taboos: [],
      ipaHints: [],
    });
    expect(r.passed).toBe(false);
  });
});

describe('Time stratum predicate', () => {
  it('passes with a clear chronology', () => {
    const r = run(timePredicate, {
      events: [{ t: 1 }, { t: 2 }, { t: 3 }, { t: 4 }, { t: 5 }, { t: 6 }],
      chronologyAcyclic: true,
      timeScale: 'real-time',
      rhythmStability: 0.6, urgencyEscalation: 0.6, progressionMomentum: 0.6,
      causalityStrength: 0.7, pacingVariance: 0.6, foreshadowingPayoff: 0.6,
    });
    expect(r.passed).toBe(true);
    expect(r.score).toBeGreaterThan(0.65);
  });

  it('fails time-travel paradox', () => {
    const r = run(timePredicate, {
      events: [{ t: 1 }, { t: 2 }, { t: 1 }],
      chronologyAcyclic: false,
    });
    expect(r.passed).toBe(false);
  });
});
