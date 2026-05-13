export type GenerationQuality = 'full' | 'reduced' | 'metadata-only';

export interface GenerationReport {
  quality: GenerationQuality;
  engine: string;
  domain: string;
  durationMs: number;
  warnings: string[];
  outputFormats: string[];
}

let globalQuality: GenerationQuality = 'full';

export function setGenerationQuality(q: GenerationQuality) {
  globalQuality = q;
}

export function getGenerationQuality(): GenerationQuality {
  return globalQuality;
}

export function formatGenerationQuality(quality: GenerationQuality): string {
  switch (quality) {
    case 'full': return 'Full fidelity — GPU/Renderer available';
    case 'reduced': return 'Reduced fidelity — headless generation (no WebGL)';
    case 'metadata-only': return 'Metadata only — generator unavailable';
  }
}

export function createGenerationReport(
  domain: string,
  engine: string,
  durationMs: number,
  quality: GenerationQuality,
  warnings: string[] = [],
  outputFormats: string[] = [],
): GenerationReport {
  return { quality, engine, domain, durationMs, warnings, outputFormats };
}
