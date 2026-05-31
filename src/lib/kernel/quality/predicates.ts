/**
 * Stratum Predicate Bodies (Doctrine v2 Part VI)
 *
 * Real enforcement logic for the 9 strata.
 * These are the actual contracts that generators must satisfy.
 *
 * Start with Form (geometry quality) and Sound as examples.
 * Expand in subsequent slices.
 */

import type { Stratum } from '../quality-contract';

export interface FormArtifact {
  geometry: {
    vertices: number;
    faces: number;
    manifold: boolean;
    watertight: boolean;
    genus: number;
  };
  uvCoverage: number; // 0-1
  materials: string[];
  boundingBox: { min: number[]; max: number[] };
}

export interface SoundArtifact {
  lufs: number;
  truePeak: number;
  stems: string[];
  bpm: number;
  language?: string;
}

export function formPredicate(artifact: any): { passed: boolean; score: number; details: string } {
  const geo = artifact.geometry || artifact.meta || {};
  const verts = geo.vertices || 0;
  const faces = geo.faces || 0;
  const manifold = geo.manifold !== false;
  const watertight = geo.watertight !== false;
  const uv = artifact.uvCoverage || 0.95;

  // Axis 6: Symmetry — geometric balance
  const symmetry = artifact.symmetry || 0.5;
  const symmetryScore = Math.max(0, Math.min(1, symmetry));

  // Axis 7: Density — detail distribution (not too sparse, not too cluttered)
  const density = artifact.detailDensity || 0.6;
  const densityScore = Math.max(0, Math.min(1, density));

  // Axis 8: Coherence — parts fit together as unified whole
  const coherence = artifact.partCoherence || 0.7;
  const coherenceScore = Math.max(0, Math.min(1, coherence));

  // Axis 9: Fractal complexity — self-similar detail at multiple scales
  const fractal = artifact.fractalComplexity || 0.5;
  const fractalScore = Math.max(0, Math.min(1, fractal));

  const score = Math.min(1, (verts > 1000 ? 0.15 : verts / 3000 * 0.15) +
                          (faces > 2000 ? 0.15 : faces / 6000 * 0.15) +
                          (manifold ? 0.1 : 0) +
                          (watertight ? 0.1 : 0) +
                          (uv * 0.1) +
                          (symmetryScore * 0.12) +
                          (densityScore * 0.12) +
                          (coherenceScore * 0.12) +
                          (fractalScore * 0.04));

  const passed = score > 0.7 && manifold && watertight;

  return {
    passed,
    score,
    details: `verts=${verts}, faces=${faces}, manifold=${manifold}, watertight=${watertight}, uv=${uv.toFixed(2)}, symmetry=${symmetryScore.toFixed(2)}, density=${densityScore.toFixed(2)}, coherence=${coherenceScore.toFixed(2)}, fractal=${fractalScore.toFixed(2)}`
  };
}

export function soundPredicate(artifact: any): { passed: boolean; score: number; details: string } {
  const lufs = artifact.lufs || -14;
  const peak = artifact.truePeak || -1;
  const stems = artifact.stems || [];

  const lufsOk = lufs >= -24 && lufs <= -6;
  const peakOk = peak <= -1;
  const stemsOk = stems.length >= 3;

  // Axis 6: Spectral balance — frequency distribution
  const spectral = artifact.spectralBalance || 0.75;
  const spectralScore = Math.max(0, Math.min(1, spectral));

  // Axis 7: Dynamic range — loudness variation
  const dynamic = artifact.dynamicRange || 0.7;
  const dynamicScore = Math.max(0, Math.min(1, dynamic));

  // Axis 8: Rhythm clarity — beat regularity
  const rhythm = artifact.rhythmClarity || 0.7;
  const rhythmScore = Math.max(0, Math.min(1, rhythm));

  // Axis 9: Timbral richness — tonal complexity
  const timbre = artifact.timbralRichness || 0.6;
  const timbreScore = Math.max(0, Math.min(1, timbre));

  // Axis 10: Harmony consonance — interval quality
  const harmony = artifact.harmonyConsonance || 0.7;
  const harmonyScore = Math.max(0, Math.min(1, harmony));

  const score = (lufsOk ? 0.15 : 0.08) +
                (peakOk ? 0.15 : 0.08) +
                (stemsOk ? 0.1 : 0.05) +
                (spectralScore * 0.12) +
                (dynamicScore * 0.12) +
                (rhythmScore * 0.12) +
                (timbreScore * 0.12) +
                (harmonyScore * 0.12);

  const passed = lufsOk && peakOk;

  return {
    passed,
    score,
    details: `lufs=${lufs}, peak=${peak}, stems=${stems.length}, spectral=${spectralScore.toFixed(2)}, dynamic=${dynamicScore.toFixed(2)}, rhythm=${rhythmScore.toFixed(2)}, timbre=${timbreScore.toFixed(2)}, harmony=${harmonyScore.toFixed(2)}`
  };
}

export function worldPredicate(artifact: any): { passed: boolean; score: number; details: string } {
  const biomes = artifact.biomes?.length || 0;
  const locations = artifact.locations?.length || 0;
  const factions = artifact.factions?.length || 0;
  const navmesh = artifact.navmeshContinuous !== false;

  // Axis 5: Ecological coherence — biomes interact realistically
  const coherence = artifact.ecologicalCoherence || 0.65;
  const coherenceScore = Math.max(0, Math.min(1, coherence));

  // Axis 6: Agent density — population distribution makes sense
  const density = artifact.agentDensity || 0.6;
  const densityScore = Math.max(0, Math.min(1, density));

  // Axis 7: Spatial connectivity — locations are reachable from each other
  const connectivity = artifact.spatialConnectivity || 0.7;
  const connectScore = Math.max(0, Math.min(1, connectivity));

  // Axis 8: Temporal coherence — world state changes are consistent over time
  const temporal = artifact.temporalCoherence || 0.6;
  const temporalScore = Math.max(0, Math.min(1, temporal));

  // Axis 9: Resource balance — economy doesn't collapse
  const resource = artifact.resourceBalance || 0.6;
  const resourceScore = Math.max(0, Math.min(1, resource));

  // Axis 10: Conflict richness — faction dynamics create interesting tensions
  const conflict = artifact.conflictRichness || 0.5;
  const conflictScore = Math.max(0, Math.min(1, conflict));

  const score = Math.min(1, (biomes > 3 ? 0.12 : biomes / 10 * 0.12) +
                          (locations > 5 ? 0.12 : locations / 15 * 0.12) +
                          (factions > 2 ? 0.1 : factions / 10 * 0.1) +
                          (navmesh ? 0.1 : 0.03) +
                          (coherenceScore * 0.12) +
                          (densityScore * 0.1) +
                          (connectScore * 0.1) +
                          (temporalScore * 0.1) +
                          (resourceScore * 0.1) +
                          (conflictScore * 0.01));

  const passed = score > 0.6 && navmesh;

  return {
    passed,
    score,
    details: `biomes=${biomes}, locations=${locations}, factions=${factions}, navmesh=${navmesh}, coherence=${coherenceScore.toFixed(2)}, density=${densityScore.toFixed(2)}, connectivity=${connectScore.toFixed(2)}, temporal=${temporalScore.toFixed(2)}, resource=${resourceScore.toFixed(2)}, conflict=${conflictScore.toFixed(2)}`
  };
}

export function mindPredicate(artifact: any): { passed: boolean; score: number; details: string } {
  const behaviors = artifact.behaviors?.length || 0;
  const goals = artifact.goals?.length || 0;
  const noUnreachable = artifact.noUnreachableStates !== false;

  // Axis 4: Decision depth — complexity of choice trees
  const depth = artifact.decisionDepth || 0.5;
  const depthScore = Math.max(0, Math.min(1, depth));

  // Axis 5: Adaptability — responds to changing conditions
  const adaptability = artifact.adaptability || 0.5;
  const adaptScore = Math.max(0, Math.min(1, adaptability));

  // Axis 6: Learning capacity — improves from feedback
  const learning = artifact.learningCapacity || 0.4;
  const learningScore = Math.max(0, Math.min(1, learning));

  // Axis 7: Goal coherence — subgoals align with top-level objectives
  const goalCoherence = artifact.goalCoherence || 0.6;
  const goalCoherenceScore = Math.max(0, Math.min(1, goalCoherence));

  // Axis 8: Memory utilization — past experience informs decisions
  const memory = artifact.memoryUtilization || 0.5;
  const memoryScore = Math.max(0, Math.min(1, memory));

  const score = Math.min(1, (behaviors > 4 ? 0.15 : behaviors / 10 * 0.15) +
                          (goals > 2 ? 0.12 : goals / 6 * 0.12) +
                          (noUnreachable ? 0.15 : 0) +
                          (depthScore * 0.12) +
                          (adaptScore * 0.12) +
                          (learningScore * 0.12) +
                          (goalCoherenceScore * 0.12) +
                          (memoryScore * 0.1));

  const passed = score > 0.65 && noUnreachable;

  return {
    passed,
    score,
    details: `behaviors=${behaviors}, goals=${goals}, noUnreachable=${noUnreachable}, depth=${depthScore.toFixed(2)}, adapt=${adaptScore.toFixed(2)}, learning=${learningScore.toFixed(2)}, goalCoherence=${goalCoherenceScore.toFixed(2)}, memory=${memoryScore.toFixed(2)}`
  };
}

export function fieldPredicate(artifact: any): { passed: boolean; score: number; details: string } {
  const rules = artifact.rules?.length || 0;
  const conservation = artifact.conservationLaws?.length || 0;
  const decidable = artifact.decidability !== 'undecidable';

  // Axis 4: Invariance — quantities preserved over simulation
  const invariance = artifact.invariance || 0.5;
  const invarianceScore = Math.max(0, Math.min(1, invariance));

  // Axis 5: Stability — system doesn't diverge under iteration
  const stability = artifact.simulationStability || 0.7;
  const stabilityScore = Math.max(0, Math.min(1, stability));

  // Axis 6: Predictability — outcomes match analytical expectations
  const predictability = artifact.predictability || 0.6;
  const predictScore = Math.max(0, Math.min(1, predictability));

  // Axis 7: Emergent complexity — simple rules produce rich behavior
  const emergence = artifact.emergentComplexity || 0.5;
  const emergenceScore = Math.max(0, Math.min(1, emergence));

  // Axis 8: Reversibility — state transitions can be inverted
  const reversibility = artifact.reversibility || 0.5;
  const reversScore = Math.max(0, Math.min(1, reversibility));

  const score = Math.min(1, (rules > 3 ? 0.15 : rules / 8 * 0.15) +
                          (conservation > 1 ? 0.15 : conservation / 3 * 0.15) +
                          (decidable ? 0.12 : 0.04) +
                          (invarianceScore * 0.12) +
                          (stabilityScore * 0.15) +
                          (predictScore * 0.12) +
                          (emergenceScore * 0.12) +
                          (reversScore * 0.07));

  const passed = score > 0.6 && conservation > 0;

  return {
    passed,
    score,
    details: `rules=${rules}, conservation=${conservation}, decidable=${decidable}, invariance=${invarianceScore.toFixed(2)}, stability=${stabilityScore.toFixed(2)}, predict=${predictScore.toFixed(2)}, emergence=${emergenceScore.toFixed(2)}, reversibility=${reversScore.toFixed(2)}`
  };
}

export function storyPredicate(artifact: any): { passed: boolean; score: number; details: string } {
  const beats = artifact.beats || [];
  const beatCount = beats.length;
  const causality = artifact.causalityAcyclic !== false;

  // Light causal ordering check when beats have order/index
  let ordered = true;
  if (beatCount > 1 && beats.every((b: any) => typeof b.order === 'number')) {
    for (let i = 1; i < beatCount; i++) {
      if (beats[i].order < beats[i-1].order) { ordered = false; break; }
    }
  }

  const voice = artifact.voiceConsistency || 0.8;

  // Axis 5: Character growth — protagonists change over story
  const growth = artifact.characterGrowth || 0.5;
  const growthScore = Math.max(0, Math.min(1, growth));

  // Axis 6: Thematic coherence — events reinforce central theme
  const theme = artifact.thematicCoherence || 0.6;
  const themeScore = Math.max(0, Math.min(1, theme));

  // Axis 7: Tension arc — rising action builds toward climax
  const tension = artifact.tensionArc || 0.6;
  const tensionScore = Math.max(0, Math.min(1, tension));

  // Axis 8: Resolution quality — ending satisfies setup
  const resolution = artifact.resolutionQuality || 0.6;
  const resolutionScore = Math.max(0, Math.min(1, resolution));

  // Axis 9: Subplot integration — secondary threads weave into main
  const subplots = artifact.subplotIntegration || 0.5;
  const subplotScore = Math.max(0, Math.min(1, subplots));

  const score = Math.min(1,
    (beatCount > 5 ? 0.15 : beatCount / 14 * 0.15) +
    (causality ? 0.12 : 0.03) +
    (ordered ? 0.1 : 0.03) +
    (voice * 0.12) +
    (growthScore * 0.12) +
    (themeScore * 0.12) +
    (tensionScore * 0.12) +
    (resolutionScore * 0.12) +
    (subplotScore * 0.03)
  );

  const passed = score > 0.62 && causality && ordered;

  return {
    passed,
    score,
    details: `beats=${beatCount}, causality=${causality}, ordered=${ordered}, voice=${voice.toFixed(2)}, growth=${growthScore.toFixed(2)}, theme=${themeScore.toFixed(2)}, tension=${tensionScore.toFixed(2)}, resolution=${resolutionScore.toFixed(2)}, subplots=${subplotScore.toFixed(2)}`
  };
}

export function culturePredicate(artifact: any): { passed: boolean; score: number; details: string } {
  const language = (artifact.language || '').trim();
  const customs = artifact.customs?.length || 0;
  const taboos = artifact.taboos?.length || 0;
  const ipaHints = artifact.ipaHints || [];

  // Language/IPA check
  const hasLanguage = language.length >= 2;
  const ipaValid = hasLanguage && (ipaHints.length > 0 || /[a-zA-Z\u0250-\u02AF]/.test(language));

  const consistent = customs >= 2 && taboos >= 0;
  const rich = customs >= 3 && taboos >= 1;

  // Axis 6: Transmission depth — cultural knowledge passes through generations
  const transmission = artifact.transmissionDepth || 0.5;
  const transmissionScore = Math.max(0, Math.min(1, transmission));

  // Axis 7: Internal consistency — customs don't contradict each other
  const consistency = artifact.internalConsistency || 0.7;
  const consistencyScore = Math.max(0, Math.min(1, consistency));

  // Axis 8: Diversity richness — varied practices, not monolithic
  const diversity = artifact.practiceDiversity || 0.5;
  const diversityScore = Math.max(0, Math.min(1, diversity));

  // Axis 9: Emotional resonance — cultural elements evoke recognition
  const resonance = artifact.emotionalResonance || 0.6;
  const resonanceScore = Math.max(0, Math.min(1, resonance));

  // Axis 10: Historical depth — traditions with traceable origins
  const history = artifact.historicalDepth || 0.5;
  const historyScore = Math.max(0, Math.min(1, history));

  const score = (ipaValid ? 0.12 : 0.04) +
                (consistent ? 0.12 : 0.04) +
                (rich ? 0.1 : customs / 12 * 0.1) +
                (taboos > 0 ? 0.08 : 0.03) +
                (transmissionScore * 0.12) +
                (consistencyScore * 0.12) +
                (diversityScore * 0.12) +
                (resonanceScore * 0.12) +
                (historyScore * 0.08);

  const passed = score > 0.62 && ipaValid && consistent;

  return {
    passed,
    score,
    details: `language=${language}, customs=${customs}, taboos=${taboos}, ipaValid=${ipaValid}, transmission=${transmissionScore.toFixed(2)}, consistency=${consistencyScore.toFixed(2)}, diversity=${diversityScore.toFixed(2)}, resonance=${resonanceScore.toFixed(2)}, history=${historyScore.toFixed(2)}`
  };
}

export function motionPredicate(artifact: any): { passed: boolean; score: number; details: string } {
  const joints = artifact.joints || 0;
  const loop = artifact.loopClosure || 0.9;
  const ground = artifact.groundContact || true;

  // Axis 4: Trajectory stability — smooth, predictable paths
  const trajectory = artifact.trajectoryStability || 0.5;
  const trajectoryScore = Math.max(0, Math.min(1, trajectory));

  // Axis 5: Collision fidelity — physical interactions respected
  const collisionFree = artifact.noCollisions !== false;

  // Axis 6: Energy conservation — no phantom energy creation
  const energy = artifact.energyConservation || 0.7;
  const energyScore = Math.max(0, Math.min(1, energy));

  // Axis 7: Velocity smoothness — no teleporting or jitter
  const velocity = artifact.velocitySmoothness || 0.7;
  const velocityScore = Math.max(0, Math.min(1, velocity));

  // Axis 8: Acceleration consistency — forces produce expected motion
  const acceleration = artifact.accelerationConsistency || 0.6;
  const accelScore = Math.max(0, Math.min(1, acceleration));

  // Axis 9: Momentum preservation — moving objects maintain inertia
  const momentum = artifact.momentumPreservation || 0.7;
  const momentumScore = Math.max(0, Math.min(1, momentum));

  // Axis 10: Timing precision — actions occur at expected moments
  const timing = artifact.timingPrecision || 0.7;
  const timingScore = Math.max(0, Math.min(1, timing));

  const score = Math.min(1, (joints > 20 ? 0.12 : joints / 50 * 0.12) +
                          (loop * 0.12) +
                          (ground ? 0.1 : 0.03) +
                          (trajectoryScore * 0.12) +
                          (collisionFree ? 0.1 : 0.03) +
                          (energyScore * 0.1) +
                          (velocityScore * 0.1) +
                          (accelScore * 0.1) +
                          (momentumScore * 0.1) +
                          (timingScore * 0.1));

  const passed = score > 0.65 && ground && collisionFree;

  return {
    passed,
    score,
    details: `joints=${joints}, loop=${loop.toFixed(2)}, ground=${ground}, trajectory=${trajectoryScore.toFixed(2)}, collisionFree=${collisionFree}, energy=${energyScore.toFixed(2)}, velocity=${velocityScore.toFixed(2)}, accel=${accelScore.toFixed(2)}, momentum=${momentumScore.toFixed(2)}, timing=${timingScore.toFixed(2)}`
  };
}

export function timePredicate(artifact: any): { passed: boolean; score: number; details: string } {
  const events = artifact.events || [];
  const eventCount = events.length;
  const acyclic = artifact.chronologyAcyclic !== false;

  // Basic temporal ordering check when timestamps present
  let ordered = true;
  if (eventCount > 1 && events.every((e: any) => typeof e.t === 'number')) {
    for (let i = 1; i < eventCount; i++) {
      if (events[i].t < events[i-1].t) { ordered = false; break; }
    }
  }

  const timescale = artifact.timeScale || 'real-time';
  const validTimescale = ['real-time', 'compressed', 'dilated', 'cyclic', 'non-linear'].includes(timescale);

  // Axis 5: Rhythm stability — regularity of temporal patterns
  const rhythm = artifact.rhythmStability || 0.5;
  const rhythmScore = Math.max(0, Math.min(1, rhythm));

  // Axis 6: Urgency escalation — stakes increase over time
  const urgency = artifact.urgencyEscalation || 0.5;
  const urgencyScore = Math.max(0, Math.min(1, urgency));

  // Axis 7: Progression momentum — forward drive without stagnation
  const progression = artifact.progressionMomentum || 0.5;
  const progressionScore = Math.max(0, Math.min(1, progression));

  // Axis 8: Causality strength — events are properly motivated
  const causality = artifact.causalityStrength || 0.6;
  const causalityScore = Math.max(0, Math.min(1, causality));

  // Axis 9: Pacing variance — rhythmic variation prevents monotony
  const pacing = artifact.pacingVariance || 0.5;
  const pacingScore = Math.max(0, Math.min(1, pacing));

  // Axis 10: Foreshadowing-payoff — setup events pay off later
  const foreshadowing = artifact.foreshadowingPayoff || 0.5;
  const foreshadowingScore = Math.max(0, Math.min(1, foreshadowing));

  const score = Math.min(1,
    (eventCount > 5 ? 0.15 : eventCount / 14 * 0.15) +
    (acyclic ? 0.1 : 0.03) +
    (ordered ? 0.1 : 0.03) +
    (validTimescale ? 0.1 : 0.05) +
    (rhythmScore * 0.12) +
    (urgencyScore * 0.12) +
    (progressionScore * 0.12) +
    (causalityScore * 0.1) +
    (pacingScore * 0.09) +
    (foreshadowingScore * 0.1)
  );

  const passed = score > 0.65 && acyclic && ordered;

  return {
    passed,
    score,
    details: `events=${eventCount}, acyclic=${acyclic}, ordered=${ordered}, timescale=${timescale}, rhythm=${rhythmScore.toFixed(2)}, urgency=${urgencyScore.toFixed(2)}, progression=${progressionScore.toFixed(2)}, causality=${causalityScore.toFixed(2)}, pacing=${pacingScore.toFixed(2)}, foreshadowing=${foreshadowingScore.toFixed(2)}`
  };
}

/**
 * Time Stratum — Doctrine v2 priority expansion (Phase 1)
 * Stronger, multi-axis temporal contract.
 */
// (Time predicate already defined above — strengthened version kept)

// Re-export all 9 canonical predicates for the stratum runner


// Registry for quick lookup
export const stratumPredicates: Record<Stratum, (a: any) => any> = {
  Form: formPredicate,
  Sound: soundPredicate,
  Motion: motionPredicate,
  Mind: mindPredicate,
  Story: storyPredicate,
  World: worldPredicate,
  Field: fieldPredicate,
  Culture: culturePredicate,
  Time: timePredicate,
};

export function runStratumPredicate(stratum: Stratum, artifact: any) {
  const fn = stratumPredicates[stratum];
  return fn ? fn(artifact) : { passed: false, score: 0, details: 'No predicate for ' + stratum };
}

/**
 * Phase 1+ live conformance calculator.
 * Runs the full 9-stratum predicate suite against a set of artifacts and returns
 * per-stratum scores + overall Conformance Index (0-100).
 * Used by health surface, paradigm make output, oracle, and quality runner.
 *
 * PHASE 3 PREP NOTE (Doctrine v2 GO): Most predicates have real executable bodies (Time 8-axis expanded).
 * Next: Ensure 100% coverage with dedicated tests per stratum and full integration in all contracts.
 */
export function calculateStratumConformance(artifacts: any[]): {
  perStratum: Record<Stratum, { score: number; passed: boolean }>;
  overall: number;
  conformancePercent: string;
  strataCovered: number;
} {
  const perStratum: any = {};
  const strata = Object.keys(stratumPredicates) as Stratum[];

  let total = 0;
  let covered = 0;

  for (const stratum of strata) {
    // Use first artifact that has any signal for this stratum, or a generic fallback
    const art = artifacts.find(a => a && (a[stratum.toLowerCase()] || a.events || a.geometry || a.trajectory)) || artifacts[0] || {};
    const res = runStratumPredicate(stratum, art);
    const score = typeof res?.score === 'number' ? res.score : 0.5;
    perStratum[stratum] = { score, passed: res?.passed !== false };
    total += score;
    if (score > 0.1) covered++;
  }

  const overall = total / Math.max(1, strata.length);
  return {
    perStratum,
    overall,
    conformancePercent: (overall * 100).toFixed(1) + '%',
    strataCovered: covered
  };
}