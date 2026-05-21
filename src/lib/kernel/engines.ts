/**
 * Domain Engine Router — dispatches seed → generator
 * Delegates to PipelineRunner for all configured domains (27).
 * Also supports 103+ domains via engine-dispatcher (Phase 2).
 */

import type { GeneratorOutput } from './types';
import type { Seed, Artifact } from './pipeline/types';
import { createPipeline, getDomainConfig } from './pipeline';
import { createWebGPUGeneratorSystem, type WebGPUGeneratorSystem } from './generators/webgpu-system';
import { getGenerationQuality, type GenerationQuality } from './generation-quality';
import { dispatch as dispatchSeed, DOMAIN_MAP } from './engine-dispatcher';

let gpuSystem: WebGPUGeneratorSystem | null = null;

async function getGPUSystem(): Promise<WebGPUGeneratorSystem> {
  if (!gpuSystem) {
    gpuSystem = await createWebGPUGeneratorSystem({ preferGPU: true, fallbackToCPU: true });
  }
  return gpuSystem;
}

export type { Seed, Artifact, GeneratorOutput };

const ALL_DOMAINS = [
  'character', 'sprite', 'music', 'visual2d', 'procedural',
  'fullgame', 'animation', 'geometry3d', 'narrative', 'ui', 'physics',
  'audio', 'ecosystem', 'game', 'alife', 'shader', 'particle',
  'typography', 'architecture', 'vehicle', 'furniture', 'fashion',
  'robotics', 'circuit', 'food', 'choreography', 'agent',
];

async function growViaPipeline(seed: Seed): Promise<Artifact> {
  const domain = seed.$domain;
  const config = domain ? getDomainConfig(domain) : undefined;
  if (!config) {
    throw new Error(`No pipeline config for domain: ${domain}`);
  }
  const pipeline = createPipeline(config);
  const { artifact } = await pipeline.run(seed);
  return artifact;
}

// ─── ENGINE REGISTRY ──────────────────────────────────────────────────────────
export const ENGINES: Record<string, (seed: Seed) => Promise<Artifact>> = {};
for (const domain of ALL_DOMAINS) {
  ENGINES[domain] = growViaPipeline;
}

function growGeneric(seed: Seed): Artifact & { filePath?: string } {
  const geneSummary: Record<string, any> = {};
  for (const [name, gene] of Object.entries(seed.genes ?? {})) {
    geneSummary[name] = { type: gene.type, value_preview: String(gene.value ?? '').slice(0, 50) };
  }
  const artifact: Artifact & { filePath?: string } = {
    type: seed.$domain ?? 'unknown', name: seed.$name ?? 'Artifact', domain: seed.$domain ?? 'unknown',
    seed_hash: seed.$hash ?? '', generation: seed.$lineage?.generation ?? 0,
    generation_quality: 'metadata-only' as GenerationQuality,
    gene_summary: geneSummary,
    render_hints: { mode: 'generic', description_only: true },
  };
  try {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const dir = path.join('data', 'artifacts', String(artifact.domain ?? 'unknown'));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const hash = String(artifact.seed_hash || 'no-hash').slice(0, 16);
    const fp = path.join(dir, `${hash}.metadata.json`);
    fs.writeFileSync(fp, JSON.stringify(artifact, null, 2), 'utf-8');
    artifact.filePath = fp;
  } catch { /* fallback path unavailable - skip */ }
  return artifact;
}

export function growSeedSync(seed: Seed): Artifact {
  const domain = seed.$domain ?? 'character';
  const artifact = growGeneric(seed);
  artifact.type = domain;
  artifact.name = seed.$name ?? `${domain.charAt(0).toUpperCase() + domain.slice(1)} Artifact`;
  artifact.domain = domain;
  artifact.generation_quality = 'metadata-only' as GenerationQuality;
  artifact.render_hints = { mode: domain, description_only: true };

  if (domain === 'agent') {
    (artifact as any).config = { fallback: true };
    artifact.render_hints = { mode: 'chat_interface', color_scheme: 'dark', animated: false, hasFile: false };
  }

  return artifact;
}

export async function growSeed(seed: Seed): Promise<Artifact> {
  const domain = seed.$domain ?? 'character';
  try {
    const outputDir = `data/artifacts/${domain}`;
    const fs = await import('fs');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const dispatchResult = await dispatchSeed(seed, outputDir);
    const generatorOutput = (dispatchResult && typeof dispatchResult === 'object' && 'result' in dispatchResult)
      ? (dispatchResult as any).result
      : dispatchResult;
    const engineHints = (generatorOutput && typeof generatorOutput === 'object' && 'render_hints' in generatorOutput)
      ? (generatorOutput as any).render_hints ?? {}
      : {};
    return {
      ...generatorOutput,
      type: domain,
      name: seed.$name ?? 'Artifact',
      domain,
      seed_hash: seed.$hash ?? '',
      generation: seed.$lineage?.generation ?? 0,
      generation_quality: getGenerationQuality(),
      render_hints: {
        mode: engineHints.mode || domain,
        ...engineHints,
        hasFile: !!generatorOutput,
      },
    };
  } catch {
    try {
      const artifact = await growViaPipeline(seed);
      return { ...artifact, generation_quality: 'reduced' as GenerationQuality };
    } catch {
      return growGeneric(seed);
    }
  }
}

export function getAllDomains(): string[] {
  return [...ALL_DOMAINS].sort();
}

export async function getGenerator(domain: string) {
  return DOMAIN_MAP[domain] ?? null;
}

export { WebGPUGeneratorSystem } from './generators/webgpu-system';

// Re-export GSPL
export { GsplLexer, TokenType } from './gspl-lexer';
export { GsplParser, ASTNodeType } from './gspl-parser';
export { GsplInterpreter, executeGspl } from './gspl-interpreter';

// Re-export Phase 4: Binary Format & Sovereignty
export { encodeGseed, decodeGseed, createGseed, signGseed, verifyGseedSignature, writeGseedFile, readGseedFile, exportGseedToFile, SectionType, OutputType } from './binary-format';
export type { GseedPackage, GseedMetadata, GseedFlags, RoyaltyConfig, RoyaltySplit } from './binary-format';
export { buildC2PAManifest, verifyC2PAManifest } from './c2pa-manifest';
export type { C2PAClaim } from './c2pa-manifest';
export { createDefaultRoyaltyConfig, validateRoyaltyConfig, ROYALTY_ABI } from './royalty-system';
