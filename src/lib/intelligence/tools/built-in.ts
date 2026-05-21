/**
 * Built-in tools — all sovereign-local, all air-gap-safe.
 *
 * These tools are registered by default by `createStandardHarness()`.
 * Network and filesystem tools live in separate modules and are
 * opt-in.
 */

import { kernelNow } from '../../kernel/clock';
import { rngFromHash } from '../../kernel/rng';
import type { ResolvedGeneSpec } from '../agent/types';
import type { Tool, ToolContext, ToolResult, WorldLookupArgs, OracleScoreArgs, ResonanceScoreArgs } from './types';
import {
  resonance,
  harmonicResonance,
  classifyByVector,
  pairFor,
  opposeFor,
  signatureFor,
} from '../reality';
import type { MemoryOrchestrator } from '../memory/types';

// ── world_lookup ────────────────────────────────────────────────
export function makeWorldLookupTool(memory: MemoryOrchestrator): Tool<unknown> {
  return {
    descriptor: {
      id: 'world_lookup',
      category: 'memory',
      description: 'Query the Reality Library (Layer 4) for a fact about how reality works.',
      permission: 'allowed',
      timeoutMs: 500,
    },
    async execute(args, _ctx): Promise<ToolResult<unknown>> {
      const a = args as WorldLookupArgs;
      const results = await memory.search({ library: a.library, key: a.key, text: a.text, limit: 5 });
      return { ok: true, value: results, source: 'memory:world' };
    },
  };
}

// ── archetype_lookup ────────────────────────────────────────────
export const archetypeLookupTool: Tool<unknown> = {
  descriptor: {
    id: 'archetype_lookup',
    category: 'reality',
    description: 'Look up the canonical pair, opposite, or transformation of a 15-lattice archetype.',
    permission: 'allowed',
    timeoutMs: 100,
  },
  async execute(args, _ctx): Promise<ToolResult<unknown>> {
    const a = args as { name: string; query: 'pair' | 'oppose' | 'transform' | 'classify' };
    if (a.query === 'classify') {
      const vec = (args as { vector?: number[] }).vector;
      if (!vec || vec.length !== 12) return { ok: false, error: { code: 'bad-args', message: 'classify requires vector:number[12]' } };
      return { ok: true, value: classifyByVector(vec as never), source: 'reality:archetypes' };
    }
    if (a.query === 'pair') return { ok: true, value: pairFor(a.name as never), source: 'reality:archetypes' };
    if (a.query === 'oppose') return { ok: true, value: opposeFor(a.name as never), source: 'reality:archetypes' };
    return { ok: false, error: { code: 'unknown-query', message: `query='${a.query}' not supported` } };
  },
};

// ── resonance_score ─────────────────────────────────────────────
export const resonanceScoreTool: Tool<unknown> = {
  descriptor: {
    id: 'resonance_score',
    category: 'reality',
    description: 'Score harmonic / semantic / structural / dimensional resonance between two inputs.',
    permission: 'allowed',
    timeoutMs: 200,
  },
  async execute(args): Promise<ToolResult<unknown>> {
    const a = args as ResonanceScoreArgs;
    const input: Parameters<typeof resonance>[0] = {};
    if (a.a?.harmonic !== undefined && a.b?.harmonic !== undefined) {
      input.harmonic = { a: a.a.harmonic, b: a.b.harmonic };
    }
    const report = resonance(input);
    return { ok: true, value: report, source: 'reality:resonance' };
  },
};

// ── harmonic_score ──────────────────────────────────────────────
export const harmonicScoreTool: Tool<unknown> = {
  descriptor: {
    id: 'harmonic_score',
    category: 'reality',
    description: 'Compute the just-intonation harmonic resonance between two frequencies / values.',
    permission: 'allowed',
    timeoutMs: 50,
  },
  async execute(args): Promise<ToolResult<unknown>> {
    const a = args as { a: number; b: number };
    if (typeof a.a !== 'number' || typeof a.b !== 'number') {
      return { ok: false, error: { code: 'bad-args', message: 'a and b must be numbers' } };
    }
    return { ok: true, value: harmonicResonance(a.a, a.b), source: 'reality:harmonic' };
  },
};

// ── gene_diff ───────────────────────────────────────────────────
export const geneDiffTool: Tool<unknown> = {
  descriptor: {
    id: 'gene_diff',
    category: 'composition',
    description: 'Diff two ResolvedGeneSpec arrays. Returns added / removed / changed paths.',
    permission: 'allowed',
    timeoutMs: 200,
  },
  async execute(args): Promise<ToolResult<unknown>> {
    const a = args as { a: ResolvedGeneSpec[]; b: ResolvedGeneSpec[] };
    const aMap = new Map(a.a.map((s) => [s.path, s.value]));
    const bMap = new Map(a.b.map((s) => [s.path, s.value]));
    const added: string[] = [];
    const removed: string[] = [];
    const changed: { path: string; from: unknown; to: unknown }[] = [];
    for (const [k, v] of bMap) {
      if (!aMap.has(k)) added.push(k);
      else if (JSON.stringify(aMap.get(k)) !== JSON.stringify(v)) changed.push({ path: k, from: aMap.get(k), to: v });
    }
    for (const k of aMap.keys()) if (!bMap.has(k)) removed.push(k);
    return { ok: true, value: { added, removed, changed }, source: 'composition:diff' };
  },
};

// ── name_generator (deterministic, seed-based) ─────────────────
export const nameGeneratorTool: Tool<unknown> = {
  descriptor: {
    id: 'name_generator',
    category: 'composition',
    description: 'Generate a deterministic name from a seed phrase + archetype hint.',
    permission: 'allowed',
    timeoutMs: 50,
  },
  async execute(args): Promise<ToolResult<unknown>> {
    const a = args as { phrase: string; archetype?: string; count?: number };
    const rng = rngFromHash(a.phrase + '|' + (a.archetype ?? ''));
    const onsets = ['Th', 'Ka', 'Mi', 'Ra', 'Ze', 'Aa', 'Va', 'Lu', 'No', 'Sy', 'Ir', 'Or'];
    const nuclei = ['a', 'e', 'i', 'o', 'u', 'ae', 'ia', 'ou', 'ei', 'yr'];
    const codas = ['n', 'th', 'r', 's', 'l', 'm', 'ne', 'ra', 'th', 'a'];
    const count = Math.max(1, Math.min(8, a.count ?? 3));
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const o = onsets[rng.nextInt(0, onsets.length - 1)];
      const n = nuclei[rng.nextInt(0, nuclei.length - 1)];
      const c = codas[rng.nextInt(0, codas.length - 1)];
      names.push(o + n + c);
    }
    return { ok: true, value: names, source: 'composition:names' };
  },
};

// ── palette_gen (deterministic) ─────────────────────────────────
export const paletteGenTool: Tool<unknown> = {
  descriptor: {
    id: 'palette_gen',
    category: 'reality',
    description: 'Generate a deterministic 5-color palette anchored on a hue + harmony rule.',
    permission: 'allowed',
    timeoutMs: 50,
  },
  async execute(args): Promise<ToolResult<unknown>> {
    const a = args as { hue?: number; saturation?: number; lightness?: number; harmony?: 'analogous' | 'complementary' | 'triadic' | 'tetradic' };
    const hue = ((a.hue ?? 200) + 360) % 360;
    const sat = a.saturation ?? 0.6;
    const lit = a.lightness ?? 0.55;
    const harmony = a.harmony ?? 'analogous';
    const offsets: number[] =
      harmony === 'analogous'    ? [-30, -15, 0, 15, 30] :
      harmony === 'complementary' ? [0, 20, 180, 200, 215] :
      harmony === 'triadic'       ? [0, 120, 240, 60, 300] :
                                    [0, 90, 180, 270, 45];
    const palette = offsets.map((o, i) => ({
      hsl: [(hue + o + 360) % 360, sat, lit + (i - 2) * 0.04],
      role: ['base', 'accent', 'complement', 'highlight', 'shadow'][i],
    }));
    return { ok: true, value: { hue, saturation: sat, lightness: lit, harmony, palette }, source: 'reality:palette' };
  },
};

// ── signature_for (dimensional signature of a gene type) ────────
export const signatureForTool: Tool<unknown> = {
  descriptor: {
    id: 'signature_for',
    category: 'reality',
    description: 'Return the canonical dimensional signature for a gene type.',
    permission: 'allowed',
    timeoutMs: 10,
  },
  async execute(args): Promise<ToolResult<unknown>> {
    const a = args as { geneType: string };
    return { ok: true, value: signatureFor(a.geneType), source: 'reality:dimensions' };
  },
};

// ── now (kernel clock) ─────────────────────────────────────────
export const kernelNowTool: Tool<unknown> = {
  descriptor: {
    id: 'kernel_now',
    category: 'kernel',
    description: 'Sanctioned wall-clock read from kernel/clock.ts.',
    permission: 'allowed',
    timeoutMs: 5,
  },
  async execute(): Promise<ToolResult<unknown>> {
    return { ok: true, value: kernelNow(), source: 'kernel:clock' };
  },
};

export const BUILTIN_TOOLS: ReadonlyArray<Tool<unknown>> = [
  archetypeLookupTool,
  resonanceScoreTool,
  harmonicScoreTool,
  geneDiffTool,
  nameGeneratorTool,
  paletteGenTool,
  signatureForTool,
  kernelNowTool,
];
