/**
 * Engine: mind — agents, behavior, decision, dialogue, cognition.
 *
 * Phase 0 cut: dispatches by kind to two existing mind-tier generators:
 *  - agent        → agent config + behavior tree + sample conversations
 *  - neuroscience → cognitive study config + experimental data
 *
 * Subsequent phases extend to dialogue trees, theory-of-mind models,
 * planner archetypes, the 8 sub-agents from the Sovereign Agent canon,
 * and the 12-dimension adjective normalizer.
 *
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part III + `02_Sovereign_Agent_Canon_Synthesis.md` Part IV (Reality-OS).
 */
import * as fs from 'node:fs';
import type { Seed } from '../kernel/engines';
import type { Engine, EngineCapability } from './types';
import { generateAgent } from '../kernel/generators/agent';
import { generateNeuroscience } from '../kernel/generators/neuroscience';

export type MindKind = 'agent' | 'neuroscience';

export interface MindRequest {
  kind: MindKind;
  seed: Seed;
  outputPath: string;
}

export interface MindArtifact {
  kind: MindKind;
  primaryPath: string;
  auxPaths: string[];
  metrics: Record<string, number | string>;
  raw: unknown;
}

export const capability: EngineCapability = Object.freeze({
  id: 'mind',
  name: 'Mind Engine',
  version: '0.1.0',
  outputs: ['json', 'yaml', 'jsonl'],
  composesWith: ['story', 'play', 'world', 'sound', 'form'],
});

export async function generateMind(req: MindRequest): Promise<MindArtifact> {
  ensureDir(req.outputPath);
  switch (req.kind) {
    case 'agent': {
      const out = await generateAgent(req.seed, req.outputPath);
      return {
        kind: 'agent',
        primaryPath: out.configPath,
        auxPaths: [out.jsonPath, out.logPath],
        metrics: { role: out.config.role, name: out.config.name },
        raw: out,
      };
    }
    case 'neuroscience': {
      const out = await generateNeuroscience(req.seed, req.outputPath);
      return {
        kind: 'neuroscience',
        primaryPath: out.dataPath,
        auxPaths: [out.filePath],
        metrics: { studyType: out.studyType },
        raw: out,
      };
    }
    default: {
      const _exhaustive: never = req.kind;
      throw new Error(`mind: unsupported kind ${String(_exhaustive)}`);
    }
  }
}

function ensureDir(p: string): void {
  try { fs.mkdirSync(p, { recursive: true }); } catch { /* p may be a file path */ }
}

export const engine: Engine = Object.freeze({
  capability,
  generate: generateMind as unknown as (req: unknown) => Promise<unknown>,
  validate(output: unknown) {
    const o = output as { primaryPath?: string } | null;
    if (!o || typeof o.primaryPath !== 'string' || o.primaryPath.length === 0) {
      return { ok: false as const, reason: 'mind artifact missing primaryPath' };
    }
    return { ok: true as const };
  },
});
