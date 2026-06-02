/**
 * Multi-role inference swarm — sequential roles with shared transcript (Phase 6).
 */

import type { InferenceClient, InferenceRequest, InferenceTier } from './types.js';
import { InferenceTier as IT } from './types.js';

export type SwarmRole = {
  id: string;
  name: string;
  persona?: string;
  tier?: InferenceTier;
};

export const DEFAULT_ROLES: Record<'idea' | 'style' | 'critic', SwarmRole> = {
  idea: { id: 'idea', name: 'Idea Agent', tier: IT.FAST },
  style: { id: 'style', name: 'Style Agent', tier: IT.STANDARD },
  critic: { id: 'critic', name: 'Critic Agent', tier: IT.DEEP },
};

export type SwarmVerdict = 'ship' | 'revise';

/** Parse the last VERDICT: ship|revise marker in model output (case-insensitive). */
export function parseVerdict(text: string): SwarmVerdict | null {
  const matches = [...text.matchAll(/verdict\s*:\s*(ship|revise)/gi)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1][1].toLowerCase();
  if (last === 'ship' || last === 'revise') return last;
  return null;
}

export interface SwarmTurn {
  roleId: string;
  output: string;
  prompt: string;
  tier: InferenceTier;
  latencyMs: number;
  tokensUsed: number;
}

export interface SwarmRunResult {
  turns: SwarmTurn[];
  finalOutput: string;
  totalLatencyMs: number;
  totalTokens: number;
  verdict: SwarmVerdict | null;
}

export interface SwarmRoundResult {
  turns: SwarmTurn[];
  verdict: SwarmVerdict | null;
}

export interface SwarmUntilShippedResult {
  shipped: boolean;
  rounds: SwarmRoundResult[];
}

export interface SwarmOrchestratorConfig {
  roles: SwarmRole[];
  client: InferenceClient;
  shareTranscript?: boolean;
  sharedContext?: string;
}

export class SwarmOrchestrator {
  private readonly roles: SwarmRole[];
  private readonly client: InferenceClient;
  private readonly shareTranscript: boolean;
  private readonly sharedContext: string;

  constructor(config: SwarmOrchestratorConfig) {
    if (!config.roles?.length) {
      throw new Error('SwarmOrchestrator roles must be non-empty');
    }
    const seen = new Set<string>();
    for (const r of config.roles) {
      if (seen.has(r.id)) {
        throw new Error(`duplicate role id: ${r.id}`);
      }
      seen.add(r.id);
    }
    this.roles = config.roles;
    this.client = config.client;
    this.shareTranscript = config.shareTranscript !== false;
    this.sharedContext = config.sharedContext ?? '';
  }

  async run(userPrompt: string): Promise<SwarmRunResult> {
    const turns: SwarmTurn[] = [];
    let transcript = '';
    let totalLatencyMs = 0;
    let totalTokens = 0;

    for (const role of this.roles) {
      const parts: string[] = [];
      if (this.sharedContext) parts.push(this.sharedContext);
      if (this.shareTranscript && transcript) parts.push(transcript);
      parts.push(userPrompt);
      const prompt = parts.join('\n\n');

      const tier = role.tier ?? IT.STANDARD;
      const req: InferenceRequest = {
        prompt,
        maxTokens: 256,
        temperature: 0.7,
      };
      const res = await this.client.generate(req, tier);
      const turn: SwarmTurn = {
        roleId: role.id,
        output: res.text,
        prompt,
        tier: res.tier,
        latencyMs: res.latencyMs,
        tokensUsed: res.tokensUsed,
      };
      turns.push(turn);
      totalLatencyMs += res.latencyMs;
      totalTokens += res.tokensUsed;
      transcript += `\n[${role.id}]: ${res.text}`;
    }

    const finalOutput = turns[turns.length - 1]?.output ?? '';
    const criticTurn = [...turns].reverse().find((t) => t.roleId === 'critic');
    const verdict = criticTurn ? parseVerdict(criticTurn.output) : parseVerdict(finalOutput);

    return {
      turns,
      finalOutput,
      totalLatencyMs: Math.max(totalLatencyMs, 1),
      totalTokens,
      verdict,
    };
  }

  async runUntilShipped(userPrompt: string, maxRounds: number): Promise<SwarmUntilShippedResult> {
    if (maxRounds < 1) {
      throw new Error('maxRounds must be at least 1');
    }

    const hasCritic = this.roles.some((r) => r.id === 'critic');
    const effectiveMax = hasCritic ? maxRounds : 1;

    const rounds: SwarmRoundResult[] = [];
    let priorCritique = '';

    for (let round = 0; round < effectiveMax; round++) {
      let prompt = userPrompt;
      if (priorCritique) {
        prompt = `${userPrompt}\n\nPrior critique to address:\n${priorCritique}`;
      }
      const run = await this.run(prompt);
      rounds.push({ turns: run.turns, verdict: run.verdict });
      if (run.verdict === 'ship') {
        return { shipped: true, rounds };
      }
      if (run.verdict === 'revise') {
        priorCritique = run.finalOutput;
      }
    }

    return { shipped: false, rounds };
  }
}
