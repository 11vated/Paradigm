/**
 * Oracle Feedback Loop — integration test
 *
 * Pins the self-critique loop behavior:
 *   - converges on score ≥ threshold within budget
 *   - records every iteration (planHash + oracle + notes)
 *   - "best" is the highest-scoring observed variant
 *   - deterministic given fixed Oracle
 *   - iteration notes synthesized from Oracle.axes + Critique
 */

import { describe, it, expect } from 'vitest';
import { runFeedbackLoop } from '../../src/lib/intelligence/feedback';
import type {
  ResolvedIntent,
  OracleReport,
  Adjective,
} from '../../src/lib/intelligence/agent/types';
import type { Oracle } from '../../src/lib/intelligence/agent/stages/stage-5-validate';

function v12(...vals: number[]): number[] {
  const out = new Array(12).fill(0);
  for (let i = 0; i < Math.min(vals.length, 12); i++) out[i] = vals[i];
  return out;
}

function buildResolved(): ResolvedIntent {
  const adjectives: Adjective[] = [
    {
      word: 'warm',
      vad12: v12(0.6, 0, 0, 0.9) as Adjective['vad12'],
      polarity: 1,
      intensity: 0.8,
      weight: 1,
    },
    {
      word: 'melancholy',
      vad12: v12(-0.5, -0.2, -0.1) as Adjective['vad12'],
      polarity: -1,
      intensity: 0.7,
      weight: 1,
    },
  ];
  return {
    intent: {
      raw: 'create a warm, melancholy friend',
      top: 'CREATE',
      sub: 'friend',
      domains: ['friend'],
      adjectives,
      entities: [],
      references: [],
      budget: { quality: 0.85 },
      context: {},
    },
    templateId: 'friend',
    geneSpecs: [
      { path: 'bond.warmth', value: 0.9, source: 'PersonalityAgent', confidence: 0.9 },
      { path: 'body.bigFive.neuroticism', value: 0.6, source: 'PersonalityAgent', confidence: 0.8 },
      { path: 'persona.archetype', value: 'caregiver', source: 'PersonalityAgent', confidence: 0.85 },
    ],
    subAgentVotes: { PersonalityAgent: 3, VisionAgent: 0, CritiqueAgent: 0 },
  };
}

/** Mock Oracle that climbs each iteration. */
function makeClimbingOracle(start = 0.5, step = 0.15): Oracle {
  let call = 0;
  return {
    async evaluate(): Promise<OracleReport> {
      const overall = Math.min(1, start + call * step);
      call++;
      return {
        overall,
        axes: {
          coherence: overall,
          novelty: overall * 0.9,
          fidelity: overall,
          expressivity: overall * 0.8,
        },
        notes: overall < 0.7 ? ['Try a more distinctive warmth value'] : [],
        conformsTo: 'friend@1.0',
      };
    },
  };
}

function makeFixedOracle(overall: number): Oracle {
  return {
    async evaluate(): Promise<OracleReport> {
      return {
        overall,
        axes: { coherence: overall, novelty: overall, fidelity: overall, expressivity: overall },
        notes: [],
        conformsTo: 'friend@1.0',
      };
    },
  };
}

describe('runFeedbackLoop', () => {
  it('returns highest-scoring variant as best', async () => {
    const r = await runFeedbackLoop(buildResolved(), {
      oracle: makeClimbingOracle(0.4, 0.15),
      maxIterations: 4,
      scoreThreshold: 0.85,
    });
    expect(r.iterations.length).toBeGreaterThan(0);
    const max = Math.max(...r.iterations.map((i) => i.oracle.overall));
    expect(r.best.oracle.overall).toBe(max);
  });

  it('stops on threshold-met when Oracle climbs above it', async () => {
    const r = await runFeedbackLoop(buildResolved(), {
      oracle: makeClimbingOracle(0.7, 0.2),
      scoreThreshold: 0.85,
      maxIterations: 5,
    });
    expect(r.stoppedReason).toBe('threshold-met');
    expect(r.best.oracle.overall).toBeGreaterThanOrEqual(0.85);
  });

  it('stops on diminishing-returns when Oracle plateaus', async () => {
    const r = await runFeedbackLoop(buildResolved(), {
      oracle: makeFixedOracle(0.6),
      scoreThreshold: 0.95,
      maxIterations: 5,
      minImprovement: 0.05,
    });
    expect(r.stoppedReason).toBe('diminishing-returns');
  });

  it('stops on max-iterations when no other condition fires', async () => {
    const r = await runFeedbackLoop(buildResolved(), {
      oracle: makeClimbingOracle(0.3, 0.05),
      scoreThreshold: 0.95,
      maxIterations: 3,
      minImprovement: 0.0,
    });
    expect(r.stoppedReason).toBe('max-iterations');
    expect(r.iterations).toHaveLength(3);
  });

  it('records every iteration with planHash, oracle, and notes', async () => {
    const r = await runFeedbackLoop(buildResolved(), {
      oracle: makeClimbingOracle(0.5, 0.1),
      scoreThreshold: 0.95,
      maxIterations: 3,
      minImprovement: 0.0,
    });
    for (const rec of r.iterations) {
      expect(rec.planHash).toMatch(/^[0-9a-f]+$/);
      expect(rec.oracle.overall).toBeGreaterThan(0);
      expect(rec.oracle.axes.coherence).toBeDefined();
      expect(rec.notes).toBeInstanceOf(Array);
    }
  });

  it('synthesizes weak-axis notes when scores drop below 0.5', async () => {
    const oracle: Oracle = {
      async evaluate() {
        return {
          overall: 0.55,
          axes: { coherence: 0.9, novelty: 0.2, fidelity: 0.7, expressivity: 0.4 },
          notes: [],
          conformsTo: 'friend@1.0',
        };
      },
    };
    const r = await runFeedbackLoop(buildResolved(), {
      oracle,
      scoreThreshold: 0.95,
      maxIterations: 2,
      minImprovement: 0.0,
    });
    const notesAcrossAllIters = r.iterations.flatMap((i) => i.notes).join(' ');
    expect(notesAcrossAllIters).toMatch(/novelty/);
    expect(notesAcrossAllIters).toMatch(/expressivity/);
  });

  it('is deterministic given identical inputs', async () => {
    const oracle = makeFixedOracle(0.7);
    const r1 = await runFeedbackLoop(buildResolved(), {
      oracle,
      maxIterations: 2,
      scoreThreshold: 0.95,
      minImprovement: 0.0,
    });
    const r2 = await runFeedbackLoop(buildResolved(), {
      oracle,
      maxIterations: 2,
      scoreThreshold: 0.95,
      minImprovement: 0.0,
    });
    expect(r1.iterations.map((i) => i.planHash)).toEqual(
      r2.iterations.map((i) => i.planHash),
    );
    expect(r1.iterations.map((i) => i.oracle.overall)).toEqual(
      r2.iterations.map((i) => i.oracle.overall),
    );
  });
});
