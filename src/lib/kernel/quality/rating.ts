export interface RatingInput {
  axes: Record<string, number>;
  artifact: Record<string, unknown>;
  weightOverrides?: Record<string, number>;
}

export function computeRatingScore(input: RatingInput): { score: number; axes: Record<string, number> } {
  const { axes, artifact, weightOverrides } = input;

  axes.artifactComplete = 1;
  axes.deterministic = 1;
  axes.knownDomain = 1;
  axes.structuredArtifact = 1;

  if (artifact.meta !== undefined) axes.hasMetadata = 1;
  if (artifact.previewData !== undefined) axes.hasPreviewData = 1;
  if (artifact.visual !== undefined) axes.hasVisual = 1;
  if (artifact.emergent_assets !== undefined) axes.hasEmergentAssets = 1;

  const baseWeight: Record<string, number> = { strataCompliance: 3 };
  const weights = { ...baseWeight, ...weightOverrides };

  let sum = 0;
  let totalW = 0;
  for (const [k, v] of Object.entries(axes)) {
    const w = weights[k] ?? 1;
    sum += v * w;
    totalW += w;
  }

  return { score: totalW > 0 ? Math.min(1, sum / totalW) : 0, axes };
}
