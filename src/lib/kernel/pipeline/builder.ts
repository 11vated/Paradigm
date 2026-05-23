import { rngFromHash } from '../rng';
import { getGenerationQuality } from '../generation-quality';
import type { Stage, Seed, GeneratorOutput, Artifact, PipelineContext, DomainConfig, PipelineReport, EngineVersion } from './types';
import { validateStage, generateStage, createPostProcessStage, errorFallbackStage } from './stages';
import { kernelNow, kernelNowIso } from '../clock';

export class PipelineRunner {
  private stages: Stage<any, any>[] = [];
  private config: DomainConfig;

  constructor(config: DomainConfig) {
    this.config = config;
    this.stages.push(validateStage);
    this.stages.push(generateStage);
    this.stages.push(createPostProcessStage(config));
  }

  async run(seed: Seed): Promise<{ artifact: Artifact; report: PipelineReport }> {
    const domain = seed.$domain || this.config.domain;
    const outputDir = `data/artifacts/${domain}`;
    const fileName = `${seed.$hash ?? 'unknown'}.${this.config.outputExtension}`;
    const outputPath = `${outputDir}/${fileName}`;
    const startTime = kernelNow();

    const rng = rngFromHash(seed.$hash || `pipeline-${domain}-${kernelNow()}`);
    const quality = getGenerationQuality();

    const ctx: PipelineContext & { config: DomainConfig } = {
      domain,
      rng,
      quality,
      outputDir,
      outputPath,
      startTime,
      seed,
      config: this.config,
    };

    // Create the output directory BEFORE stages run so generators can write immediately
    try {
      const fs = await import('fs');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    } catch { /* ignore in serverless/browser */ }

    const executedStages: string[] = [];
    let current: any = seed;

    try {
      for (const stage of this.stages) {
        executedStages.push(stage.name);
        current = await stage.exec(current, ctx);
      }

      // Ensure output directory exists (skip for metadata-only)
      const skipped = (current as any)?._skipped === true;
      if (!skipped) {
        try {
          const fs = await import('fs');
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
        } catch { /* ignore fs errors in serverless */ }
      }

      const artifact = current as Artifact;
      const durationMs = kernelNow() - startTime;

      return {
        artifact,
        report: {
          domain,
          version: this.config.version,
          durationMs,
          quality,
          stages: executedStages,
          outputPath: artifact.render_hints?.hasFile ? outputPath : undefined,
        }
      };
    } catch (err) {
      executedStages.push('errorFallback');
      const fallback = await errorFallbackStage.exec(err, ctx);
      return {
        artifact: fallback,
        report: {
          domain,
          version: this.config.version,
          durationMs: kernelNow() - startTime,
          quality: 'metadata-only',
          stages: executedStages,
        }
      };
    }
  }

  getVersion(): EngineVersion {
    return this.config.version;
  }
}

export function createPipeline(config: DomainConfig): PipelineRunner {
  return new PipelineRunner(config);
}

export { type PipelineContext, type DomainConfig, type PipelineReport };
