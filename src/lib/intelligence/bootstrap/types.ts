/** Self-bootstrapping loop — types. */

/** One example in the fine-tune dataset. */
export interface BootstrapExample {
  /** Stable id; sha256 hash of (rawUtterance + planHash). */
  id: string;
  rawUtterance: string;
  /** Parsed intent at capture time (top + sub + domains). */
  intent: { top: string; sub?: string; domains: string[] };
  /** The deterministic ConstructionPlan hash. */
  planHash: string;
  /** The seed.$hash produced after Stage 4. */
  seedHash: string;
  /** Oracle overall score in [0, 1]. Higher = better example. */
  oracleScore: number;
  /** Optional per-axis scores. */
  oracleAxes?: Record<string, number>;
  /** Provenance — which LLM produced the plan. */
  llm?: { provider: string; model: string };
  /** Deterministic capture timestamp. */
  capturedAt: number;
  /** Was this captured during a feedback-loop iteration (>0) or first try (0)? */
  iteration: number;
  /** User explicitly approved this output (vs. captured passively). */
  userApproved?: boolean;
}

export interface BootstrapStats {
  total: number;
  bySource: Record<string, number>;
  byTopIntent: Record<string, number>;
  avgScore: number;
  highQuality: number;       // oracleScore >= 0.85
  userApproved: number;
  oldest: number;
  newest: number;
}

export interface DatasetExport {
  format: 'jsonl' | 'sharegpt' | 'alpaca';
  outPath: string;
  filter?: BootstrapFilter;
}

export interface BootstrapFilter {
  minScore?: number;
  userApprovedOnly?: boolean;
  topIntents?: string[];
  since?: number;
}

export interface BootstrapStore {
  capture(ex: BootstrapExample): Promise<void>;
  list(filter?: BootstrapFilter): Promise<BootstrapExample[]>;
  stats(): Promise<BootstrapStats>;
  clear(): Promise<void>;
}
