/**
 * Agent Swarm Orchestration (Phase 6)
 *
 * A swarm is a small team of agent roles (Idea, Style, Critic, …) that run a
 * structured round of propose → critique → refine over a shared artifact. The
 * design treats the *roles* as data, the *orchestration* as plain TypeScript,
 * and the *LLM calls* as a pluggable `InferenceClient`. That means:
 *
 *   - Zero hard dependency on Phi-4 being up — tests use a deterministic
 *     inference adapter; production uses the real tier-routed client.
 *   - Role config is a value object. Callers can define their own roles
 *     without touching this file.
 *   - The transcript is captured turn-by-turn so the caller can persist it,
 *     score it, or replay it.
 *
 * This is the seed-forward piece of the "Agent Swarms" plank in Appendix D —
 * it deliberately does *not* yet do on-device fine-tuning or remix feedback.
 * Those land in a later phase on top of the same interface.
 */

import type {
  InferenceClient,
  InferenceRequest,
  InferenceResponse,
} from './types.js';
import { InferenceTier } from './types.js';

// ─── Role definitions ──────────────────────────────────────────────────────

export interface SwarmRole {
  /** Stable identifier used in transcripts. */
  id: string;
  /** Short human name for UI/display. */
  name: string;
  /** System prompt — the persona the role takes on. */
  systemPrompt: string;
  /** Preferred inference tier; client falls back if unavailable. */
  tier: InferenceTier;
  /** Sampling temperature. */
  temperature: number;
  /** Max tokens for a single turn. */
  maxTokens: number;
}

/** Out-of-the-box role presets tuned for seed design. */
export const DEFAULT_ROLES = Object.freeze({
  idea: {
    id: 'idea',
    name: 'Idea Agent',
    systemPrompt:
      'You generate bold, unexpected seed ideas. Respond with a single concrete proposal — a few sentences. No lists, no meta-commentary.',
    tier: InferenceTier.STANDARD,
    temperature: 0.9,
    maxTokens: 256,
  },
  style: {
    id: 'style',
    name: 'Style Agent',
    systemPrompt:
      'You refine the aesthetic direction of a seed idea. Keep the core intact but sharpen the visual/tonal identity in 2-3 sentences.',
    tier: InferenceTier.STANDARD,
    temperature: 0.5,
    maxTokens: 200,
  },
  critic: {
    id: 'critic',
    name: 'Critic Agent',
    systemPrompt:
      'You critique seed proposals for novelty, coherence, and feasibility. End with a one-line verdict: "VERDICT: ship" or "VERDICT: revise".',
    tier: InferenceTier.DEEP,
    temperature: 0.2,
    maxTokens: 256,
  },
}) satisfies Readonly<Record<string, SwarmRole>>;

// ─── Transcript ────────────────────────────────────────────────────────────

export interface SwarmTurn {
  roleId: string;
  roleName: string;
  /** The prompt sent to the inference client, after assembly. */
  prompt: string;
  /** Raw inference output. */
  output: string;
  tier: InferenceTier;
  model: string;
  latencyMs: number;
  cached: boolean;
  tokensUsed: number;
}

export interface SwarmRunResult {
  prompt: string;
  turns: SwarmTurn[];
  /** The final accepted artifact (the last turn's output, unless overridden). */
  finalOutput: string;
  /** VERDICT parsed from the critic's output if present — else null. */
  verdict: 'ship' | 'revise' | null;
  /** Total wall time across all inference calls. */
  totalLatencyMs: number;
  /** Total tokens consumed (sum over turns). */
  totalTokens: number;
}

// ─── Orchestrator ──────────────────────────────────────────────────────────

export interface SwarmOrchestratorOptions {
  /** Roles run in order. Must contain at least one role. */
  roles: SwarmRole[];
  /** Inference client (real or deterministic). */
  client: InferenceClient;
  /**
   * Optional transcript prefix sent before every role's prompt. Useful to
   * pin domain constraints ("this is for a 'character' seed") the roles
   * shouldn't have to re-learn per turn.
   */
  sharedContext?: string;
  /**
   * If true (default), each role sees the cumulative transcript so far so
   * it can build on earlier turns. Set false to isolate roles.
   */
  shareTranscript?: boolean;
}

export class SwarmOrchestrator {
  private readonly roles: SwarmRole[];
  private readonly client: InferenceClient;
  private readonly sharedContext: string;
  private readonly shareTranscript: boolean;

  constructor(opts: SwarmOrchestratorOptions) {
    if (opts.roles.length === 0) {
      throw new Error('SwarmOrchestrator: roles must be non-empty');
    }
    // Enforce unique role IDs — transcript parsing downstream assumes this.
    const ids = new Set<string>();
    for (const r of opts.roles) {
      if (ids.has(r.id)) throw new Error(`SwarmOrchestrator: duplicate role id "${r.id}"`);
      ids.add(r.id);
    }
    this.roles = opts.roles;
    this.client = opts.client;
    this.sharedContext = opts.sharedContext ?? '';
    this.shareTranscript = opts.shareTranscript ?? true;
  }

  /**
   * Run a single pass of every role over the given user prompt. Returns the
   * full transcript plus a parsed VERDICT if the last turn came from a critic.
   *
   * Inference failures bubble up — we deliberately *don't* swallow them,
   * because silently dropping a tier turns a swarm into a single-agent mess.
   */
  async run(userPrompt: string): Promise<SwarmRunResult> {
    const turns: SwarmTurn[] = [];
    let totalLatencyMs = 0;
    let totalTokens = 0;

    for (const role of this.roles) {
      const prompt = this.assemblePrompt(userPrompt, role, turns);
      const req: InferenceRequest = {
        prompt,
        systemPrompt: role.systemPrompt,
        maxTokens: role.maxTokens,
        temperature: role.temperature,
      };
      const resp: InferenceResponse = await this.client.generate(req, role.tier);
      turns.push({
        roleId: role.id,
        roleName: role.name,
        prompt,
        output: resp.text,
        tier: resp.tier,
        model: resp.model,
        latencyMs: resp.latencyMs,
        cached: resp.cached,
        tokensUsed: resp.tokensUsed,
      });
      totalLatencyMs += resp.latencyMs;
      totalTokens += resp.tokensUsed;
    }

    const finalOutput = turns[turns.length - 1]?.output ?? '';
    return {
      prompt: userPrompt,
      turns,
      finalOutput,
      verdict: parseVerdict(finalOutput),
      totalLatencyMs,
      totalTokens,
    };
  }

  /**
   * Loop a propose → critique round until the critic says "ship" or we hit
   * `maxRounds`. Each subsequent round sees the critic's verdict appended to
   * the prompt so the Idea/Style agents can respond to feedback.
   *
   * Requires that one of the roles is a critic (id === 'critic'). If none is
   * supplied, each round simply re-runs the roles — you get variance through
   * sampling, not real critique-driven refinement.
   */
  async runUntilShipped(
    userPrompt: string,
    maxRounds: number = 3,
  ): Promise<{ rounds: SwarmRunResult[]; shipped: boolean }> {
    if (maxRounds < 1) throw new Error('runUntilShipped: maxRounds must be ≥ 1');
    const rounds: SwarmRunResult[] = [];
    let shipped = false;
    let prompt = userPrompt;

    for (let i = 0; i < maxRounds; i++) {
      const result = await this.run(prompt);
      rounds.push(result);
      if (result.verdict === 'ship') {
        shipped = true;
        break;
      }
      // Compose the next round's prompt using the critique.
      const critic = result.turns.find((t) => t.roleId === 'critic');
      if (!critic) break; // no critic → don't re-run blindly
      prompt = `${userPrompt}\n\nPrior critique to address:\n${critic.output}`;
    }

    return { rounds, shipped };
  }

  private assemblePrompt(userPrompt: string, role: SwarmRole, priorTurns: SwarmTurn[]): string {
    const parts: string[] = [];
    if (this.sharedContext) parts.push(this.sharedContext);
    parts.push(`User request: ${userPrompt}`);
    if (this.shareTranscript && priorTurns.length > 0) {
      parts.push('\nPrior turns:');
      for (const t of priorTurns) {
        parts.push(`[${t.roleName}] ${t.output}`);
      }
    }
    parts.push(`\nYour turn as ${role.name}.`);
    return parts.join('\n');
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

/**
 * Extract a VERDICT:{ship|revise} marker from a critic output. Case-insensitive,
 * searches the *last* such marker so earlier mentions don't override a final
 * decision. Returns null if no marker is found.
 */
export function parseVerdict(text: string): 'ship' | 'revise' | null {
  const matches = [...text.matchAll(/VERDICT\s*:\s*(ship|revise)\b/gi)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1][1].toLowerCase();
  return last === 'ship' ? 'ship' : 'revise';
}
