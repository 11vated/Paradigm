import type { Xoshiro256StarStar } from '../rng';
import type { GenerationQuality } from '../generation-quality';

export type EngineVersion = 'v1' | 'v2' | 'v3' | 'enhanced' | 'gpu' | 'worker';

export interface Seed {
  $name?: string;
  $domain?: string;
  $hash?: string;
  $lineage?: { generation?: number; operation?: string; parents?: string[] };
  genes?: Record<string, { type?: string; value?: any }>;
  /** Set by pipeline generateStage to inform generators of the target quality level */
  _quality?: 'full' | 'reduced' | 'metadata-only';
  [key: string]: any;
}

export interface GeneratorOutput {
  filePath?: string;
  format?: string;
  [key: string]: any;
}

export interface Artifact {
  type: string;
  name: string;
  domain: string;
  seed_hash: string;
  generation: number;
  generation_quality?: GenerationQuality;
  render_hints: Record<string, any>;
  [key: string]: any;
}

export interface PipelineContext {
  domain: string;
  rng: Xoshiro256StarStar;
  quality: GenerationQuality;
  outputDir: string;
  outputPath: string;
  startTime: number;
  seed: Seed;
}

export interface Stage<I, O> {
  name: string;
  exec(input: I, ctx: PipelineContext): Promise<O>;
}

export type GeneReader = (seed: Seed) => Record<string, unknown>;

export type GeneratorFn = (seed: Seed, outputPath: string) => Promise<GeneratorOutput>;

export type PostProcessFn = (output: GeneratorOutput, seed: Seed) => Record<string, unknown>;

export interface DomainConfig {
  domain: string;
  version: EngineVersion;
  generator: GeneratorFn;
  postProcess?: PostProcessFn;
  geneReader?: GeneReader;
  outputExtension: string;
  // Extended metadata fields (optional)
  label?: string;
  description?: string;
  outputMimeTypes?: string[];
  viewportType?: string;
  tier?: number;
  defaultGenes?: Record<string, { gene_type: string; value: unknown }>;
}

export interface PipelineReport {
  domain: string;
  version: EngineVersion;
  durationMs: number;
  quality: GenerationQuality;
  stages: string[];
  outputPath?: string;
}
