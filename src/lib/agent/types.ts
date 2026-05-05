/**
 * Paradigm Absolute — GSPL Agent Type System
 *
 * Defines the typed interfaces for the agent-as-seed architecture.
 * The agent IS a GSPL seed in domain "agent" — breedable, evolvable,
 * composable, and sovereign.
 */

// ─── AGENT INTENT TAXONOMY ──────────────────────────────────────────────────

export type AgentIntent =
  // Kernel operations (deterministic, no model needed)
  | 'create_seed'
  | 'mutate_seed'
  | 'breed_seeds'
  | 'compose_seed'
  | 'grow_seed'
  | 'evolve_seed'
  | 'describe_domain'
  | 'describe_gene_type'
  | 'find_composition_path'
  | 'list_domains'
  | 'list_gene_types'
  | 'parse_gspl'
  | 'help'
  // Extended intents (may require model)
  | 'multi_step'         // chained kernel operations
  | 'design_seed'        // creative seed design with rich genes
  | 'explain_artifact'   // describe what a grown artifact looks like
  | 'compare_seeds'      // compute distances between seeds
  | 'suggest_composition'// recommend composition paths
  | 'write_gspl'         // generate GSPL program source
  | 'web_search'         // browse web for reference material
  | 'unknown';

// ─── COMPLEXITY TIERS ───────────────────────────────────────────────────────

export enum InferenceTier {
  /** No model needed — pure deterministic kernel operation */
  KERNEL = 0,
  /** Fast SLM (SmolLM2 1.7B) — simple generation, entity extraction */
  FAST = 1,
  /** Router + capable model (Phi-4-mini 3.8B) — standard reasoning */
  STANDARD = 2,
  /** Deep reasoner (Phi-4 14B) — multi-step plans, complex generation */
  DEEP = 3,
}

/** Map intents to their minimum required tier */
export const INTENT_TIER: Record<AgentIntent, InferenceTier> = {
  // Tier 0: pure kernel
  list_domains: InferenceTier.KERNEL,
  list_gene_types: InferenceTier.KERNEL,
  describe_domain: InferenceTier.KERNEL,
  describe_gene_type: InferenceTier.KERNEL,
  find_composition_path: InferenceTier.KERNEL,
  help: InferenceTier.KERNEL,
  // Tier 1: fast SLM
  create_seed: InferenceTier.FAST,
  mutate_seed: InferenceTier.FAST,
  breed_seeds: InferenceTier.FAST,
  grow_seed: InferenceTier.FAST,
  parse_gspl: InferenceTier.FAST,
  compare_seeds: InferenceTier.FAST,
  explain_artifact: InferenceTier.FAST,
  // Tier 2: standard reasoning
  compose_seed: InferenceTier.STANDARD,
  evolve_seed: InferenceTier.STANDARD,
  suggest_composition: InferenceTier.STANDARD,
  design_seed: InferenceTier.STANDARD,
  unknown: InferenceTier.STANDARD,
  // Tier 3: deep reasoning
  multi_step: InferenceTier.DEEP,
  write_gspl: InferenceTier.DEEP,
  web_search: InferenceTier.DEEP,
};

// ─── PARSED QUERY ───────────────────────────────────────────────────────────

export interface ParsedQuery {
  intent: AgentIntent;
  tier: InferenceTier;
  entities: {
    domain?: string;
    targetDomain?: string;
    geneType?: string;
    seedName?: string;
    seedId?: string;
    gsplSource?: string;
    mutationRate?: number;
    populationSize?: number;
    genes?: Record<string, any>;
    prompt?: string;
    steps?: string[];        // for multi_step: decomposed operation names
    searchQuery?: string;    // for web_search
  };
  confidence: number;
  raw: string;
}

// ─── REASONING PLAN ─────────────────────────────────────────────────────────

export interface PlanStep {
  id: number;
  operation: string;          // kernel operation name
  params: Record<string, any>;
  dependsOn: number[];        // IDs of steps this depends on
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

export interface ReasoningPlan {
  query: string;
  intent: AgentIntent;
  steps: PlanStep[];
  currentStep: number;
  status: 'planning' | 'executing' | 'reflecting' | 'completed' | 'failed';
}

// ─── AGENT RESPONSE ─────────────────────────────────────────────────────────

export interface AgentResponse {
  success: boolean;
  intent: AgentIntent;
  tier: InferenceTier;
  message: string;
  data?: any;
  suggestions?: string[];
  plan?: ReasoningPlan;       // included for multi_step responses
  timing?: {
    parseMs: number;
    planMs: number;
    executeMs: number;
    totalMs: number;
  };
}

// ─── TOOL SYSTEM ────────────────────────────────────────────────────────────

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
}

export interface AgentTool {
  name: string;
  description: string;
  category: 'kernel' | 'extended' | 'meta';
  tier: InferenceTier;           // minimum tier to use this tool
  parameters: Record<string, ToolParameter>;
  execute: (params: Record<string, any>, context: ToolContext) => Promise<ToolResult>;
}

export interface ToolContext {
  seeds: any[];                  // current session seeds
  plan?: ReasoningPlan;
  memory: MemoryEntry[];
  agentConfig: AgentConfig;
}

export interface ToolResult {
  success: boolean;
  data: any;
  message: string;
  seedsCreated?: any[];          // new seeds produced by this tool
  seedsModified?: string[];      // hashes of seeds that were modified
}

// ─── MEMORY ─────────────────────────────────────────────────────────────────

export interface MemoryEntry {
  turn: number;
  role: 'user' | 'agent';
  content: string;
  seedsReferenced: string[];     // seed hashes mentioned
  seedsCreated: string[];        // seed hashes produced
  intent: AgentIntent;
  timestamp: number;
}

// ─── AGENT SEED GENES ───────────────────────────────────────────────────────

/**
 * Gene schema for domain "agent".
 * These are the genes that an agent seed carries.
 * When grown, they produce an AgentConfig.
 */
export interface AgentGenes {
  // Identity
  persona: 'architect' | 'artist' | 'critic' | 'explorer' | 'composer' | 'analyst';
  name: string;

  // Reasoning
  temperature: number;           // [0, 1] — 0 = deterministic, 1 = creative
  reasoning_depth: number;       // [0, 1] — 0 = fast/shallow, 1 = deep/slow
  exploration_rate: number;      // [0, 1] — exploit vs explore
  confidence_threshold: number;  // [0, 1] — minimum confidence before acting

  // Knowledge
  domain_focus: number[];        // vector<26> — attention weights over domains
  gene_expertise: number[];      // vector<17> — proficiency with gene types

  // Behavioral
  verbosity: number;             // [0, 1]
  autonomy: number;              // [0, 1] — ask vs act independently
  creativity_bias: number;       // [0, 1] — conventional vs wild

  // Tool permissions
  tool_permissions: {
    web_browse: boolean;
    file_write: boolean;
    fork_agent: boolean;
    delegate: boolean;
  };

  // Capacity
  max_reasoning_steps: number;   // [0, 1] → actual = value * 20
  context_window: number;        // [0, 1] → actual = value * 50 turns
}

// ─── AGENT CONFIGURATION (grown from agent seed) ────────────────────────────

export interface AgentConfig {
  persona: string;
  name: string;
  temperature: number;
  reasoningDepth: number;
  explorationRate: number;
  confidenceThreshold: number;
  verbosity: number;
  autonomy: number;
  creativityBias: number;
  maxSteps: number;
  memoryWindow: number;
  domainWeights: number[];
  geneWeights: number[];
  tools: {
    web_browse: boolean;
    file_write: boolean;
    fork_agent: boolean;
    delegate: boolean;
  };
  systemPrompt: string;
}

// ─── INFERENCE CLIENT ───────────────────────────────────────────────────────

export interface InferenceRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens: number;
  temperature: number;
  stopSequences?: string[];
  jsonMode?: boolean;           // force JSON output
}

export interface InferenceResponse {
  text: string;
  tokensUsed: number;
  model: string;
  tier: InferenceTier;
  latencyMs: number;
  cached: boolean;
}

export interface InferenceClient {
  /** Check if a specific tier is available */
  isAvailable(tier: InferenceTier): boolean;
  /** Get the highest available tier */
  maxAvailableTier(): InferenceTier;
  /** Generate text at the specified tier (falls back to lower tiers) */
  generate(request: InferenceRequest, preferredTier: InferenceTier): Promise<InferenceResponse>;
  /** Health check */
  health(): Promise<{ available: boolean; tiers: Record<InferenceTier, boolean> }>;
}

// ─── KNOWLEDGE BASE ─────────────────────────────────────────────────────────

export interface KnowledgeEntry {
  category: 'domain' | 'gene_type' | 'functor' | 'syntax' | 'concept' | 'example';
  key: string;
  content: string;
  keywords: string[];
  embedding?: number[];          // optional vector embedding for similarity search
}
