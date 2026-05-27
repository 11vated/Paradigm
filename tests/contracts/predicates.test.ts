/**
 * Stratum predicate-body tests — Doctrine v2 Part VI.1/.2/.3.
 *
 * Phase 3 partial: Form, Motion, and Sound strata now have real
 * predicate bodies. These tests cover both the pass and fail paths
 * for every implemented predicate.
 */
import { describe, it, expect } from 'vitest';
import {
  formContract,
  type FormArtifact,
  motionContract,
  type MotionArtifact,
  soundContract,
  type SoundArtifact,
} from '../../src/lib/contracts';

describe('Doctrine VI.1 — Form predicates', () => {
  it('manifold passes when true, fails when false, unimplemented when absent', () => {
    const findResult = (a: FormArtifact, id: string) =>
      formContract.evaluate(a).results.find((r) => r.id === id)?.result;
    expect(findResult({ manifold: true }, 'form.manifold')).toEqual({ kind: 'pass' });
    expect(findResult({ manifold: false }, 'form.manifold')?.kind).toBe('fail');
    expect(findResult({}, 'form.manifold')?.kind).toBe('unimplemented');
  });

  it('triangleBudget evaluates against declared tier', () => {
    const within: FormArtifact = { triangleCount: 5000, triangleBudget: { tier: 'medium', max: 10000 } };
    const over: FormArtifact = { triangleCount: 20000, triangleBudget: { tier: 'medium', max: 10000 } };
    const find = (a: FormArtifact) =>
      formContract.evaluate(a).results.find((r) => r.id === 'form.triangleBudget')?.result;
    expect(find(within)).toEqual({ kind: 'pass' });
    expect(find(over)?.kind).toBe('fail');
  });

  it('uvCoverage requires ≥ 0.95 and within [0,1]', () => {
    const find = (a: FormArtifact) =>
      formContract.evaluate(a).results.find((r) => r.id === 'form.uvCoverage')?.result;
    expect(find({ uvCoverage: 0.96 })).toEqual({ kind: 'pass' });
    expect(find({ uvCoverage: 0.5 })?.kind).toBe('fail');
    expect(find({ uvCoverage: 1.1 })?.kind).toBe('fail');
  });

  it('materialSlots requires non-empty unique string array', () => {
    const find = (a: FormArtifact) =>
      formContract.evaluate(a).results.find((r) => r.id === 'form.materialSlots')?.result;
    expect(find({ materialSlots: ['body', 'eye'] })).toEqual({ kind: 'pass' });
    expect(find({ materialSlots: [] })?.kind).toBe('fail');
    expect(find({ materialSlots: ['a', 'a'] })?.kind).toBe('fail');
  });

  it('canonicalPivot requires bbox+pivot agreement', () => {
    const find = (a: FormArtifact) =>
      formContract.evaluate(a).results.find((r) => r.id === 'form.canonicalPivot')?.result;
    expect(find({ pivot: [0, 0, 0], bbox: [-1, -1, -1, 1, 1, 1] })).toEqual({ kind: 'pass' });
    expect(find({ pivot: [0, 0, 0] })?.kind).toBe('fail');
    expect(find({ pivot: [0, 0, 0], bbox: [1, 0, 0, -1, 0, 0] })?.kind).toBe('fail');
  });

  it('overall conformance report has correct totals', () => {
    const a: FormArtifact = {
      manifold: true,
      watertight: true,
      uvCoverage: 0.97,
      uvOverlap: false,
      materialSlots: ['body'],
      pivot: [0, 0, 0],
      bbox: [-1, -1, -1, 1, 1, 1],
    };
    const r = formContract.evaluate(a);
    expect(r.passes).toBe(6);
    expect(r.fails).toBe(0);
    expect(r.unimplemented).toBe(2); // triangleBudget + crossAdapterParity
    expect(r.conformance).toBeCloseTo(1);
  });
});

describe('Doctrine VI.2 — Motion predicates', () => {
  it('jointLegality flags whip-snap angular velocity', () => {
    const find = (a: MotionArtifact) =>
      motionContract.evaluate(a).results.find((r) => r.id === 'motion.jointLegality')?.result;
    expect(find({ maxAngularVelocity: 25 })).toEqual({ kind: 'pass' });
    expect(find({ maxAngularVelocity: 200 })?.kind).toBe('fail');
    expect(find({ maxAngularVelocity: -1 })?.kind).toBe('fail');
  });

  it('loopClosure requires seam delta within tolerance for cyclic clips', () => {
    const find = (a: MotionArtifact) =>
      motionContract.evaluate(a).results.find((r) => r.id === 'motion.loopClosure')?.result;
    expect(find({ cyclic: false })).toEqual({ kind: 'pass' });
    expect(
      find({
        cyclic: true,
        seamDelta: { translation: [0.001, 0.001, 0.001], rotation: [0.001, 0, 0] },
      }),
    ).toEqual({ kind: 'pass' });
    expect(
      find({
        cyclic: true,
        seamDelta: { translation: [0.1, 0, 0], rotation: [0, 0, 0] },
      })?.kind,
    ).toBe('fail');
  });

  it('beatAlignment snaps to BPM grid within 15ms', () => {
    const beatPeriod = 60 / 120; // 0.5s @ 120bpm
    const find = (a: MotionArtifact) =>
      motionContract.evaluate(a).results.find((r) => r.id === 'motion.beatAlignment')?.result;
    expect(find({ bpm: null })).toEqual({ kind: 'pass' });
    expect(find({ bpm: 120, beatOffsets: [0, beatPeriod, 2 * beatPeriod] })).toEqual({ kind: 'pass' });
    expect(find({ bpm: 120, beatOffsets: [0.1] })?.kind).toBe('fail');
  });
});

describe('Doctrine VI.3 — Sound predicates', () => {
  it('lufsTarget evaluates against declared broadcast target', () => {
    const find = (a: SoundArtifact) =>
      soundContract.evaluate(a).results.find((r) => r.id === 'sound.lufsTarget')?.result;
    expect(find({ lufs: -14, loudnessTarget: 'streaming' })).toEqual({ kind: 'pass' });
    expect(find({ lufs: -23, loudnessTarget: 'broadcast' })).toEqual({ kind: 'pass' });
    expect(find({ lufs: -8, loudnessTarget: 'streaming' })?.kind).toBe('fail');
  });

  it('truePeak caps at -1.0 dBTP', () => {
    const find = (a: SoundArtifact) =>
      soundContract.evaluate(a).results.find((r) => r.id === 'sound.truePeak')?.result;
    expect(find({ truePeakDbtp: -1.5 })).toEqual({ kind: 'pass' });
    expect(find({ truePeakDbtp: -1.0 })).toEqual({ kind: 'pass' });
    expect(find({ truePeakDbtp: 0.0 })?.kind).toBe('fail');
  });

  it('stemSeparability verifies stems + reconstruction delta', () => {
    const find = (a: SoundArtifact) =>
      soundContract.evaluate(a).results.find((r) => r.id === 'sound.stemSeparability')?.result;
    expect(find({ stems: ['vocals', 'drums', 'bass'], stemSumMasterDeltaDb: 0.2 })).toEqual({ kind: 'pass' });
    expect(find({ stems: ['vocals'], stemSumMasterDeltaDb: 2 })?.kind).toBe('fail');
    expect(find({ stems: ['vocals'] })?.kind).toBe('unimplemented');
  });

  it('phonologicalCoherence requires BCP-47 + IPA character set', () => {
    const find = (a: SoundArtifact) =>
      soundContract.evaluate(a).results.find((r) => r.id === 'sound.phonologicalCoherence')?.result;
    expect(find({ language: 'en-US', ipa: 'hɛˈloʊ' })).toEqual({ kind: 'pass' });
    expect(find({ language: 'not-a-tag', ipa: 'hello' })?.kind).toBe('fail');
    expect(find({ language: 'en-US', ipa: 'XYZ$$$' })?.kind).toBe('fail');
  });
});

describe('Conformance Index aggregation', () => {
  it('a fully-declared Form artifact passes all decidable predicates', () => {
    const a: FormArtifact = {
      manifold: true,
      watertight: true,
      triangleCount: 8000,
      triangleBudget: { tier: 'medium', max: 10000 },
      uvCoverage: 0.98,
      uvOverlap: false,
      materialSlots: ['body', 'eyes'],
      pivot: [0, 0, 0],
      bbox: [-1, -1, -1, 1, 1, 1],
    };
    const r = formContract.evaluate(a);
    expect(r.fails).toBe(0);
    expect(r.passes).toBe(7);
    expect(r.conformance).toBe(1);
  });
});
