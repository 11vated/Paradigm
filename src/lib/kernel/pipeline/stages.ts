import type { Stage, Seed, GeneratorOutput, Artifact, PipelineContext, DomainConfig } from './types';
import type { GenerationQuality } from '../generation-quality';

function geneVal(seed: Seed, name: string, fallback: unknown = null): unknown {
  return seed.genes?.[name]?.value ?? fallback;
}

function geneNumber(seed: Seed, name: string, fallback: number): number {
  const value = geneVal(seed, name, fallback);
  return typeof value === 'number' ? value : fallback;
}

function geneArray(seed: Seed, name: string, fallback: number[]): number[] {
  const value = geneVal(seed, name, fallback);
  return Array.isArray(value) ? value : fallback;
}

function readQuality(seed: Seed): GenerationQuality {
  const q = seed._quality;
  if (q === 'full' || q === 'reduced' || q === 'metadata-only') return q;
  return 'full';
}

export const validateStage: Stage<Seed, Seed> = {
  name: 'validate',
  async exec(seed: Seed, ctx: PipelineContext): Promise<Seed> {
    if (!seed.$domain) {
      throw new Error(`Pipeline validation: seed missing $domain (hash: ${seed.$hash})`);
    }
    if (!seed.$hash) {
      throw new Error(`Pipeline validation: seed missing $hash for domain ${seed.$domain}`);
    }
    return seed;
  }
};

export const transformStage: Stage<Seed, Record<string, unknown>> = {
  name: 'transform',
  async exec(seed: Seed, ctx: PipelineContext): Promise<Record<string, unknown>> {
    return {
      name: seed.$name ?? 'Artifact',
      domain: seed.$domain,
      hash: seed.$hash,
      generation: seed.$lineage?.generation ?? 0,
      genes: { ...seed.genes },
      params: readAllGenes(seed)
    };
  }
};

function readAllGenes(seed: Seed): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, gene] of Object.entries(seed.genes ?? {})) {
    result[key] = gene?.value;
  }
  return result;
}

export const generateStage: Stage<Seed, GeneratorOutput> = {
  name: 'generate',
  async exec(seed: Seed, ctx: PipelineContext): Promise<GeneratorOutput> {
    const config = (ctx as any).config as DomainConfig;

    // At metadata-only quality, skip generator — return stub output
    if (ctx.quality === 'metadata-only') {
      return {
        filePath: ctx.outputPath,
        format: config.outputExtension.toUpperCase(),
        _skipped: true,
      };
    }

    if (config.generator) {
      const enrichedSeed: Seed = { ...seed, _quality: ctx.quality as any };
      return config.generator(enrichedSeed, ctx.outputPath);
    }
    return {
      filePath: ctx.outputPath,
      format: config.outputExtension.toUpperCase(),
    };
  }
};

export function createPostProcessStage(config: DomainConfig): Stage<GeneratorOutput, Artifact> {
  return {
    name: 'postProcess',
    async exec(output: GeneratorOutput, ctx: PipelineContext): Promise<Artifact> {
      const quality = ctx.quality;
      const base: Artifact = {
        type: ctx.domain,
        name: ctx.seed.$name ?? 'Artifact',
        domain: ctx.domain,
        seed_hash: ctx.seed.$hash ?? '',
        generation: ctx.seed.$lineage?.generation ?? 0,
        generation_quality: quality,
        render_hints: {},
        ...output,
      };

      const domainHints = quality === 'metadata-only'
        ? { render_hints: { mode: ctx.domain, description_only: true } }
        : typeof config.postProcess === 'function'
          ? config.postProcess(output, ctx.seed)
          : { render_hints: { mode: ctx.domain, hasFile: true } };
      Object.assign(base, domainHints);

      if (!base.render_hints || Object.keys(base.render_hints).length === 0) {
        base.render_hints = { mode: ctx.domain };
      }
      if (quality !== 'metadata-only' && output.filePath && !(output as any)._skipped) {
        base.render_hints.hasFile = true;
      }

      return base;
    }
  };
}

export const errorFallbackStage: Stage<any, Artifact> = {
  name: 'errorFallback',
  async exec(err: any, ctx: PipelineContext): Promise<Artifact> {
    const message = err?.message ?? String(err);
    const stack   = err?.stack?.slice(0, 400) ?? '';
    // Always log to stderr so errors are never silent
    console.error(`[pipeline:errorFallback] domain=${ctx.domain} error=${message}`);
    return {
      type: ctx.domain,
      name: ctx.seed.$name ?? 'Artifact',
      domain: ctx.domain,
      seed_hash: ctx.seed.$hash ?? '',
      generation: ctx.seed.$lineage?.generation ?? 0,
      generation_quality: 'metadata-only',
      error: 'generation_failed',
      error_detail: message,
      error_stack: stack,
      render_hints: { mode: 'generic', error: true },
    };
  }
};

export { geneVal, geneNumber, geneArray, readQuality };
