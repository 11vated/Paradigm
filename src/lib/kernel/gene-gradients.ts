import { Xoshiro256StarStar } from './rng';

// ─── GRADIENT STRUCTURE ────────────────────────────────────────────────────

export interface GeneGradient {
  /** Gradient of the output quality w.r.t. each dimension of the input gene */
  dOutput_dGene: number | number[];
  /** Estimated confidence in this gradient [0, 1] */
  confidence: number;
  /** Which step would move quality in the opposite direction */
  suggestedDirection: 'increase' | 'decrease' | 'none';
}

export interface QualityDelta {
  geometry: number;
  texture: number;
  animation: number;
  coherence: number;
  style: number;
  novelty: number;
}

// ─── PER-TYPE GRADIENT APPROXIMATIONS ──────────────────────────────────────

function gradientScalar(
  value: number,
  rate: number,
  currentQuality: number,
  baselineQuality: number,
): GeneGradient {
  const diff = currentQuality - baselineQuality;
  const grad = rate > 0 ? diff / (rate * Math.abs(value || 1)) : 0;
  return {
    dOutput_dGene: Math.max(-1, Math.min(1, grad)),
    confidence: Math.min(1, Math.abs(diff) * 5),
    suggestedDirection: diff > 0.01 ? 'increase' : diff < -0.01 ? 'decrease' : 'none',
  };
}

function gradientVector(
  value: number[],
  currentQuality: number,
  baselineQuality: number,
): GeneGradient {
  const diff = currentQuality - baselineQuality;
  const perDim = value.map(v => {
    const base = Math.abs(v || 1);
    return base > 0 ? Math.max(-1, Math.min(1, diff / base)) : 0;
  });
  return {
    dOutput_dGene: perDim,
    confidence: Math.min(1, Math.abs(diff) * 3),
    suggestedDirection: diff > 0.01 ? 'increase' : diff < -0.01 ? 'decrease' : 'none',
  };
}

// ─── GRADIENT COMPUTATION ──────────────────────────────────────────────────

export interface GradientInput {
  geneName: string;
  geneValue: any;
  geneType: string;
  qualityBefore: QualityDelta;
  qualityAfter: QualityDelta;
}

/**
 * Compute the approximate gradient of quality w.r.t. a gene value.
 * Uses finite differences: small perturbation → measure quality change.
 * For scalar/vector/continuous types, returns meaningful gradients.
 * For categorical/discrete types, returns direction hints only.
 */
export function computeGeneGradient(input: GradientInput): GeneGradient {
  const { geneValue, geneType, qualityBefore, qualityAfter } = input;

  const qBefore = scalarQuality(qualityBefore);
  const qAfter = scalarQuality(qualityAfter);
  const diff = qAfter - qBefore;

  switch (geneType) {
    case 'scalar': {
      const val = typeof geneValue === 'number' ? geneValue : 0;
      return gradientScalar(val, 0.1, qAfter, qBefore);
    }
    case 'vector':
    case 'dimensional':
    case 'field': {
      const arr = Array.isArray(geneValue) ? geneValue : [0];
      return gradientVector(arr, qAfter, qBefore);
    }
    case 'boolean': {
      return {
        dOutput_dGene: diff !== 0 ? 1 : 0,
        confidence: Math.abs(diff),
        suggestedDirection: diff > 0 ? 'increase' : diff < 0 ? 'decrease' : 'none',
      };
    }
    case 'categorical':
    case 'expression':
    case 'symbolic':
    case 'gematria': {
      return {
        dOutput_dGene: 0,
        confidence: 0,
        suggestedDirection: diff > 0 ? 'increase' : 'none',
      };
    }
    default: {
      return {
        dOutput_dGene: Array.isArray(geneValue)
          ? geneValue.map(() => diff)
          : diff,
        confidence: Math.abs(diff) * 0.1,
        suggestedDirection: diff > 0.01 ? 'increase' : diff < -0.01 ? 'decrease' : 'none',
      };
    }
  }
}

/**
 * Suggest a new gene value based on gradient direction.
 */
export function applyGradientSuggestion(
  currentValue: any,
  gradient: GeneGradient,
  stepSize: number = 0.1,
): any {
  if (gradient.confidence < 0.01) return currentValue;

  if (typeof currentValue === 'number') {
    const dir = gradient.suggestedDirection === 'increase' ? 1
      : gradient.suggestedDirection === 'decrease' ? -1 : 0;
    return currentValue + dir * stepSize * gradient.confidence;
  }

  if (Array.isArray(currentValue)) {
    return currentValue.map((v: number, i: number) => {
      const g = Array.isArray(gradient.dOutput_dGene)
        ? gradient.dOutput_dGene[i] || 0
        : gradient.dOutput_dGene;
      return v + g * stepSize;
    });
  }

  return currentValue;
}

// ─── GRADIENT-BASED MUTATION ───────────────────────────────────────────────

/**
 * Mutate a seed using gradient information: genes with higher impact
 * on quality are mutated more aggressively.
 */
export function gradientGuidedMutate(
  genes: Record<string, any>,
  gradients: Record<string, GeneGradient>,
  baseRate: number,
  rng: Xoshiro256StarStar,
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [name, gene] of Object.entries(genes)) {
    const rawValue = gene?.value !== undefined ? gene.value : gene;
    const grad = gradients[name];

    if (grad && grad.confidence > 0.3) {
      // Gradient-informed: follow the gradient with noise
      const step = baseRate * grad.confidence * (0.5 + rng.nextF64() * 0.5);
      result[name] = {
        ...(gene?.value !== undefined ? gene : {}),
        value: applyGradientSuggestion(rawValue, grad, step),
      };
    } else if (grad && grad.confidence < -0.3) {
      // Strong negative gradient: opposite direction
      const reverseGrad = { ...grad, suggestedDirection: grad.suggestedDirection === 'increase' ? 'decrease' as const : 'increase' as const };
      const step = baseRate * (1 - grad.confidence);
      result[name] = {
        ...(gene?.value !== undefined ? gene : {}),
        value: applyGradientSuggestion(rawValue, reverseGrad, step),
      };
    } else {
      // No gradient: standard random mutation
      const r = rng.nextF64();
      if (r < baseRate) {
        const delta = baseRate * (rng.nextF64() - 0.5);
        if (typeof rawValue === 'number') {
          result[name] = { ...(gene?.value !== undefined ? gene : {}), value: rawValue + delta };
        } else {
          result[name] = gene;
        }
      } else {
        result[name] = gene;
      }
    }
  }

  return result;
}

// ─── QUALITY AGGREGATION ───────────────────────────────────────────────────

function scalarQuality(q: QualityDelta): number {
  return (q.geometry + q.texture + q.animation + q.coherence + q.style + q.novelty) / 6;
}
