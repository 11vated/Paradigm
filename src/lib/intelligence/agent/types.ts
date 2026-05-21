/**
 * Sovereign Agent — Type Contracts
 *
 * Canonical types for the 6-stage GSPL Agent pipeline. Derived from
 * `Documents/Paradigm-Analysis/02_Sovereign_Agent_Canon_Synthesis.md`
 * and the source canon in `PAradigm-reference/intelligence/`.
 *
 * Determinism boundary: Stage 3 output (ConstructionPlan) is the last
 * LLM-touched artifact. Stages 4–6 are pure functions on the plan.
 */

import type { Seed } from '../../kernel/engines';

// ─── Stage 1: Parsed Intent ────────────────────────────────────────────────

export type TopLevelIntent =
  | 'CREATE'        // Make something new from scratch
  | 'EVOLVE'        // Mutate / iterate on an existing seed
  | 'COMPOSE'       // Cross-domain blend
  | 'BREED'         // Genetic crossover between two seeds
  | 'EXPLAIN'       // Describe / analyze an existing seed
  | 'CRITIQUE'      // Quality assessment
  | 'TRANSPOSE'     // Cross-dimensional projection (e.g. melody → palette)
  | 'EMBODY'        // Materialize: 3D mesh, audio file, playable game
  | 'NAVIGATE'      // Explore lineage / canon / memory
  | 'GOVERN';       // Tag / sign / publish / vote

export interface Adjective {
  word: string;
  /** 12-D VAD-extended semantic vector (see adjective-normalization.md) */
  vector: number[];
  intensity: number;     // 0–1, scaled by adverbs like "very", "slightly"
  polarity: 1 | -1;       // negation flips this
  weight: number;         // attention-driven importance in the utterance
}

export interface NamedEntity {
  kind: 'character' | 'world' | 'object' | 'place' | 'concept' | 'reference';
  text: string;
  /** If this entity is in the user's canon memory, the seed hash */
  canonRef?: string;
}

export interface ParsedIntent {
  raw: string;
  top: TopLevelIntent;
  sub?: string;                  // sub-intent like 'CREATE.character', 'EVOLVE.mutate'
  domains: string[];             // ['music', 'character', 'narrative', ...]
  adjectives: Adjective[];
  entities: NamedEntity[];
  references: string[];          // seed hashes pulled from canon memory
  budget: {
    quality?: number;            // 0–1, target oracle score
    timeMs?: number;             // soft compute budget
    novelty?: number;            // 0–1, how far from canon
  };
  /** Conversational context — any clarifications already resolved */
  context: Record<string, unknown>;
}

// ─── Stage 2: Resolved Plan Inputs ─────────────────────────────────────────

export interface ResolvedGeneSpec {
  /** Domain.genePath, e.g. "voice.pitch" or "body.bigFive.openness" */
  path: string;
  value: number | string | number[] | string[];
  /** Which sub-agent or rule produced this */
  source: string;
  /** 0–1, how confident we are in this value */
  confidence: number;
  /** Optional reasoning trace */
  rationale?: string;
}

export interface ResolvedIntent {
  intent: ParsedIntent;
  /** Template selected from the Template Bridge */
  templateId: string;
  /** Gene-level resolved values */
  geneSpecs: ResolvedGeneSpec[];
  /** Sub-agent vote tallies for transparency */
  subAgentVotes: Record<string, number>;
}

// ─── Stage 3: Construction Plan (DETERMINISM BOUNDARY) ─────────────────────

export type ConstructionStep =
  | { op: 'set'; path: string; value: number | string | number[] | string[] }
  | { op: 'mutate'; path: string; delta: number; mode: 'add' | 'mul' | 'set' }
  | { op: 'inherit'; from: string; paths: string[] }
  | { op: 'crossover'; parents: [string, string]; mask: string[] }
  | { op: 'compose'; sources: string[]; strategy: 'weighted' | 'sequential' | 'overlay' }
  | { op: 'resonate'; with: string; channel: 'harmonic' | 'semantic' | 'structural' };

export interface ConstructionPlan {
  /** Deterministic hash of the plan — used as the build key */
  planHash: string;
  /** Domain this plan targets */
  domain: string;
  /** Base seed hash (or 'genesis' if creating from scratch) */
  base: string;
  /** Ordered, deterministic build steps */
  steps: ConstructionStep[];
  /** Metadata: provenance, intent reference, sub-agent attributions */
  meta: {
    intentHash: string;
    builtAt: number;        // from kernel/clock, NOT Date.now
    builtBy: string;        // 'agent@<version>'
    subAgents: string[];
    llm: { provider: string; model: string };
  };
}

// ─── Stage 4: Assembled Seed (pure output) ─────────────────────────────────

export interface AssembledOutput {
  seed: Seed;
  /** Lineage edge created when this was assembled */
  lineageEdge: {
    from: string[];
    to: string;
    operation: string;
    planHash: string;
  };
}

// ─── Stage 5: Validated Seed (pure output) ─────────────────────────────────

export interface OracleReport {
  overall: number;           // 0–1
  axes: Record<string, number>; // e.g. { coherence, novelty, fidelity, expressivity }
  notes: string[];
  conformsTo: string;        // contract id, e.g. 'music-v3@1.4'
}

export interface ValidatedSeed {
  seed: Seed;
  oracle: OracleReport;
  signature?: {
    sigHex: string;
    pubKeyHex: string;
    signedAt: number;
  };
  /** Did this seed pass the quality contract for its domain? */
  passed: boolean;
}

// ─── Sub-Agent contract ────────────────────────────────────────────────────

export interface SubAgentInput {
  intent: ParsedIntent;
  /** Partial gene specs produced so far in Stage 2 */
  partial: ResolvedGeneSpec[];
  /** Memory access for this sub-agent (scoped) */
  memory: SubAgentMemoryView;
}

export interface SubAgentMemoryView {
  /** Working layer — current conversation */
  recall(key: string): unknown | undefined;
  /** Semantic layer — workspace conventions */
  lookup(domain: string, key: string): unknown | undefined;
  /** World layer — Reality Library lookups */
  worldFact(library: string, key: string): unknown | undefined;
}

export interface SubAgentOutput {
  produced: ResolvedGeneSpec[];
  /** Critique notes — only the CritiqueAgent typically fills this */
  critiques?: string[];
  /** This sub-agent abstained on this intent */
  abstained?: boolean;
}

export interface SubAgent {
  readonly id: string;
  readonly domain: string;
  /** Does this sub-agent want to weigh in on the current intent? */
  shouldRun(intent: ParsedIntent): boolean;
  /** Produce gene specs */
  run(input: SubAgentInput): Promise<SubAgentOutput>;
}

// ─── Orchestrator config ───────────────────────────────────────────────────

export interface OrchestratorConfig {
  /** SeedLLM instance (provider-agnostic) */
  llm: import('../llm/base').SeedLLM;
  /** Sub-agents available; CritiqueAgent always runs unless explicitly excluded */
  subAgents: SubAgent[];
  /** Memory orchestrator */
  memory: import('../memory/types').MemoryOrchestrator;
  /** Optional self-improvement hooks */
  hooks?: {
    afterParse?: (intent: ParsedIntent) => void;
    afterPlan?: (plan: ConstructionPlan) => void;
    afterValidate?: (out: ValidatedSeed) => void;
  };
  /** Soft compute budget per request, in ms */
  defaultBudgetMs?: number;
}
