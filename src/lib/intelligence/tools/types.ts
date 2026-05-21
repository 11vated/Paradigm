/** Tool Layer types — every tool is optional, sandboxed, typed. Air-gap default. */
import type { Seed } from '../../kernel/engines';

export type ToolCategory = 'kernel' | 'memory' | 'composition' | 'evolution' | 'reality' | 'simulation' | 'multimodal' | 'network' | 'fs';

export type ToolPermission = 'allowed' | 'requires-consent' | 'air-gapped';

export interface ToolSchema {
  /** JSON schema for input validation; use a permissive shape for v1. */
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface ToolDescriptor {
  readonly id: string;
  readonly category: ToolCategory;
  readonly description: string;
  readonly schema?: ToolSchema;
  readonly permission: ToolPermission;
  /** Soft wall-clock timeout for this tool in ms. */
  readonly timeoutMs?: number;
}

export interface ToolContext {
  /** Caller identity — sub-agent id or "user". */
  caller: string;
  /** Air-gap mode — if true, network + filesystem tools throw. */
  airGap: boolean;
  /** Per-call abort signal for cooperative cancellation. */
  signal?: AbortSignal;
  /** Optional consent token from the user for elevated tools. */
  consent?: string;
}

export interface ToolInvocation {
  toolId: string;
  args: unknown;
  ctx: ToolContext;
}

export interface ToolResult<T = unknown> {
  ok: boolean;
  value?: T;
  error?: { code: string; message: string };
  /** Tool-reported provenance: where the data came from. */
  source?: string;
  /** Approximate cost (tokens, network ms, etc.) for telemetry. */
  cost?: number;
}

export interface Tool<T = unknown> {
  readonly descriptor: ToolDescriptor;
  execute(args: unknown, ctx: ToolContext): Promise<ToolResult<T>>;
}

export interface ToolRegistry {
  register<T>(tool: Tool<T>): void;
  get(id: string): Tool | undefined;
  list(): ToolDescriptor[];
  /** Filter by sub-agent permission grant. */
  listAllowed(callerId: string): ToolDescriptor[];
}

export interface ToolHarness {
  registry: ToolRegistry;
  /** Invoke a tool. Enforces permissions, timeouts, air-gap, and audit-logs the call. */
  invoke<T = unknown>(invocation: ToolInvocation): Promise<ToolResult<T>>;
  /** Replay the audit log (for transparency / debug). */
  auditLog(): readonly ToolAuditEntry[];
}

export interface ToolAuditEntry {
  ts: number;
  toolId: string;
  caller: string;
  ok: boolean;
  errorCode?: string;
  durationMs: number;
  /** Hash of the args (for replay without leaking content). */
  argsHash: string;
}

export interface SubAgentToolGrants {
  /** Sub-agent id → set of allowed tool ids. */
  [subAgentId: string]: ReadonlyArray<string>;
}

/** Canonical grants — derived from 8-sub-agents.md "Tools" sections. */
export const DEFAULT_TOOL_GRANTS: SubAgentToolGrants = {
  vision: ['palette_gen', 'image_describe', 'world_lookup', 'resonance_score'],
  personality: ['world_lookup', 'archetype_lookup', 'resonance_score'],
  'music-theory': ['music_theory_lookup', 'world_lookup', 'harmonic_score'],
  mechanics: ['kernel_run', 'oracle_score', 'simulate'],
  narrative: ['world_lookup', 'archetype_lookup', 'name_generator'],
  physics: ['world_lookup', 'simulate'],
  style: ['world_lookup', 'image_describe'],
  critique: ['oracle_score', 'gene_diff', 'resonance_score'],
};

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];

export interface KernelToolArgs {
  domain: string;
  seed: Seed;
  outputPath?: string;
}

export interface OracleScoreArgs {
  seed: Seed;
  axes?: readonly string[];
}

export interface WorldLookupArgs {
  library: string;
  key?: string;
  text?: string;
}

export interface ResonanceScoreArgs {
  a: { harmonic?: number; structure?: unknown };
  b: { harmonic?: number; structure?: unknown };
}
