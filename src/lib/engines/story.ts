/**
 * Engine: story — narrative, scene, screenplay, theatrical production.
 *
 * Phase 0 cut: dispatches by kind to three existing narrative generators:
 *  - narrative  → multi-chapter prose narrative (EPUB / HTML / JSON)
 *  - film       → screenplay-format script + production metadata
 *  - theater    → theatrical script + production-type metadata
 *
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part III. Engine layer adds no entropy.
 */
import * as fs from 'node:fs';
import type { Seed } from '../kernel/engines';
import type { Engine, EngineCapability } from './types';
import { generateNarrative } from '../kernel/generators/narrative';
import { generateFilm } from '../kernel/generators/film';
import { generateTheater } from '../kernel/generators/theater';

export type StoryKind = 'narrative' | 'film' | 'theater';

export interface StoryRequest {
  kind: StoryKind;
  seed: Seed;
  outputPath: string;
}

export interface StoryArtifact {
  kind: StoryKind;
  primaryPath: string;
  auxPaths: string[];
  metrics: Record<string, number | string>;
  raw: unknown;
}

export const capability: EngineCapability = Object.freeze({
  id: 'story',
  name: 'Story Engine',
  version: '0.1.0',
  outputs: ['epub', 'html', 'json', 'txt', 'fountain'],
  composesWith: ['form', 'mind', 'sound', 'world'],
});

export async function generateStory(req: StoryRequest): Promise<StoryArtifact> {
  ensureDir(req.outputPath);
  switch (req.kind) {
    case 'narrative': {
      const out = await generateNarrative(req.seed, req.outputPath);
      return {
        kind: 'narrative',
        primaryPath: out.epubPath,
        auxPaths: [out.htmlPath, out.jsonPath],
        metrics: { chapters: out.chapters, wordCount: out.wordCount },
        raw: out,
      };
    }
    case 'film': {
      const out = await generateFilm(req.seed, req.outputPath);
      return {
        kind: 'film',
        primaryPath: out.scriptPath,
        auxPaths: [out.filePath],
        metrics: { genre: out.genre },
        raw: out,
      };
    }
    case 'theater': {
      const out = await generateTheater(req.seed, req.outputPath);
      return {
        kind: 'theater',
        primaryPath: out.scriptPath,
        auxPaths: [out.filePath],
        metrics: { productionType: out.productionType },
        raw: out,
      };
    }
    default: {
      const _exhaustive: never = req.kind;
      throw new Error(`story: unsupported kind ${String(_exhaustive)}`);
    }
  }
}

function ensureDir(p: string): void {
  try { fs.mkdirSync(p, { recursive: true }); } catch { /* p may be a file path */ }
}

export const engine: Engine = Object.freeze({
  capability,
  generate: generateStory as unknown as (req: unknown) => Promise<unknown>,
  validate(output: unknown) {
    const o = output as { primaryPath?: string } | null;
    if (!o || typeof o.primaryPath !== 'string' || o.primaryPath.length === 0) {
      return { ok: false as const, reason: 'story artifact missing primaryPath' };
    }
    return { ok: true as const };
  },
});
