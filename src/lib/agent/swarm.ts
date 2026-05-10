import type { Seed } from '../kernel/types';
import { rngFromHash } from '../kernel/rng';
import type { InferenceClient } from './types.js';
import { InferenceTier } from './types.js';

export interface SwarmAgent {
  id: string;
  name: string;
  persona: string;
  domain: string;
  strength: string;
  weakness?: string;
}

export interface SwarmResult {
  seed: Seed;
  votes: Record<string, 'approve' | 'reject' | 'abstain'>;
  scores: Record<string, number>;
  consensus: 'approve' | 'reject' | 'deadlock';
  iterations: number;
}

export interface SwarmConfig {
  agents: SwarmAgent[];
  quorum: number;
  maxIterations: number;
  minConsensus: number;
}

const DEFAULT_AGENTS: SwarmAgent[] = [
  {
    id: 'idea',
    name: 'Idea Agent',
    persona: 'You are a creative Idea Agent. You propose novel concepts and directions for seeds.',
    strength: 'creativity',
    domain: 'all',
  },
  {
    id: 'style',
    name: 'Style Agent',
    persona: 'You are a Style Agent. You evaluate aesthetic coherence and visual appeal.',
    strength: 'aesthetics',
    domain: 'visual',
  },
  {
    id: 'critic',
    name: 'Critic Agent',
    persona: 'You are a Critic Agent. You identify flaws, inconsistencies, and areas for improvement.',
    strength: 'analysis',
    domain: 'all',
  },
  {
    id: 'architect',
    name: 'Architect Agent',
    persona: 'You are an Architect Agent. You ensure structural integrity and technical soundness.',
    strength: 'structure',
    domain: 'technical',
  },
  {
    id: 'historian',
    name: 'Historian Agent',
    persona: 'You are a Historian Agent. You check for originality and avoid derivative work.',
    strength: 'knowledge',
    domain: 'all',
  },
];

export class AgentSwarm {
  private config: SwarmConfig;

  constructor(config?: Partial<SwarmConfig>) {
    this.config = {
      agents: config?.agents || DEFAULT_AGENTS,
      quorum: config?.quorum || 3,
      maxIterations: config?.maxIterations || 5,
      minConsensus: config?.minConsensus || 0.6,
    };
  }

  evaluate(seed: Seed): SwarmResult {
    const votes: Record<string, 'approve' | 'reject' | 'abstain'> = {};
    const scores: Record<string, number> = {};

    for (const agent of this.config.agents) {
      const evaluation = this.evaluateWithAgent(seed, agent);
      votes[agent.id] = evaluation.vote;
      scores[agent.id] = evaluation.score;
    }

    const approveCount = Object.values(votes).filter(v => v === 'approve').length;
    const rejectCount = Object.values(votes).filter(v => v === 'reject').length;
    const total = this.config.agents.length;

    let consensus: 'approve' | 'reject' | 'deadlock';
    if (approveCount / total >= this.config.minConsensus) {
      consensus = 'approve';
    } else if (rejectCount / total >= this.config.minConsensus) {
      consensus = 'reject';
    } else {
      consensus = 'deadlock';
    }

    return {
      seed,
      votes,
      scores,
      consensus,
      iterations: 1,
    };
  }

  private evaluateWithAgent(
    seed: Seed,
    agent: SwarmAgent
  ): { vote: 'approve' | 'reject' | 'abstain'; score: number } {
    let score = 0.5;

    const fitness = (seed.$fitness && typeof seed.$fitness === 'object' && 'overall' in seed.$fitness)
      ? seed.$fitness.overall
      : (seed.$fitness as number) || 0;
    const lineage = seed.$lineage?.generation || 0;

    switch (agent.strength) {
      case 'creativity':
        score = Math.min(1, fitness * 1.1 + lineage * 0.05);
        break;
      case 'aesthetics':
        score = fitness;
        break;
      case 'analysis':
        score = 1 - fitness * 0.3 + lineage * 0.1;
        break;
      case 'structure':
        score = 0.8 + fitness * 0.2;
        break;
      case 'knowledge':
        score = lineage > 5 ? 0.9 : 0.3 + lineage * 0.1;
        break;
      default:
        score = fitness;
    }

    const vote = score >= 0.6 ? 'approve' : score >= 0.4 ? 'abstain' : 'reject';

    return { vote, score: Math.round(score * 100) / 100 };
  }

  iterate(seed: Seed, results: SwarmResult): Seed | null {
    if (results.iterations >= this.config.maxIterations) {
      return null;
    }

    if (results.consensus === 'deadlock') {
      const approveAgents = this.config.agents.filter(
        a => results.votes[a.id] === 'abstain'
      );
      if (approveAgents.length > 0) {
        const rng = rngFromHash(`${seed.$hash ?? seed.$name ?? 'swarm'}:${results.iterations}`);
        const randomAgent =
          approveAgents[rng.nextInt(0, approveAgents.length - 1)];
        results.votes[randomAgent.id] = 'approve';
        results.scores[randomAgent.id] += 0.2;
        results.iterations++;
      }
    }

    return null;
  }

  async run(seed: Seed): Promise<SwarmResult> {
    let results = this.evaluate(seed);
    let iterations = 0;

    while (
      results.consensus === 'deadlock' &&
      iterations < this.config.maxIterations
    ) {
      this.iterate(seed, results);
      iterations++;
    }

    return results;
  }

  getConfig(): SwarmConfig {
    return { ...this.config };
  }

  setAgents(agents: SwarmAgent[]): void {
    this.config.agents = agents;
  }

  addAgent(agent: SwarmAgent): void {
    this.config.agents.push(agent);
  }

  removeAgent(agentId: string): void {
    this.config.agents = this.config.agents.filter(a => a.id !== agentId);
  }

  // Evolution methods (stubs for now)
  onEvolutionUpdate(callback: (gen: number, pop: any[]) => void): void {
    // TODO: implement evolution update callback
  }

  async startAutonomousEvolution(request: string): Promise<void> {
    // TODO: implement autonomous evolution
    return Promise.resolve();
  }

  getSwarmReputation(): Record<string, number> {
    const rep: Record<string, number> = {};
    this.config.agents.forEach(a => {
      rep[a.id] = 0.5; // Default reputation
    });
    return rep;
  }

  stopEvolution(): void {
    // TODO: implement stop evolution
  }

  getAgents(): SwarmAgent[] {
    return this.config.agents;
  }
}

export const createAgentSwarm = (config?: Partial<SwarmConfig>) =>
  new AgentSwarm(config);

// Types and DEFAULT_AGENTS already exported inline above

export interface SwarmRole {
  id: string;
  name: string;
  systemPrompt: string;
  tier: InferenceTier;
  temperature: number;
}

export interface SwarmTurn {
  roleId: string;
  roleName: string;
  prompt: string;
  output: string;
  tier: InferenceTier;
  tokensUsed: number;
  latencyMs: number;
}

export interface SwarmRunResult {
  turns: SwarmTurn[];
  finalOutput: string;
  verdict: 'ship' | 'revise' | null;
  totalTokens: number;
  totalLatencyMs: number;
}

export interface SwarmOrchestratorConfig {
  roles: SwarmRole[];
  client: InferenceClient;
  shareTranscript?: boolean;
  sharedContext?: string;
}

export const DEFAULT_ROLES = {
  idea: {
    id: 'idea',
    name: 'Idea',
    systemPrompt: 'Generate a concise creative proposal.',
    tier: InferenceTier.STANDARD,
    temperature: 0.7,
  },
  style: {
    id: 'style',
    name: 'Style',
    systemPrompt: 'Refine aesthetic coherence and style.',
    tier: InferenceTier.STANDARD,
    temperature: 0.5,
  },
  critic: {
    id: 'critic',
    name: 'Critic',
    systemPrompt: 'Critique the proposal and end with VERDICT: ship or VERDICT: revise when appropriate.',
    tier: InferenceTier.DEEP,
    temperature: 0.2,
  },
} satisfies Record<string, SwarmRole>;

export function parseVerdict(text: string): 'ship' | 'revise' | null {
  const matches = [...text.matchAll(/verdict\s*:\s*(ship|revise)\b/gi)];
  if (matches.length === 0) return null;
  return matches[matches.length - 1][1].toLowerCase() as 'ship' | 'revise';
}

export class SwarmOrchestrator {
  private readonly roles: SwarmRole[];
  private readonly client: InferenceClient;
  private readonly shareTranscript: boolean;
  private readonly sharedContext?: string;

  constructor(config: SwarmOrchestratorConfig) {
    if (config.roles.length === 0) {
      throw new Error('roles must be non-empty');
    }
    const ids = new Set<string>();
    for (const role of config.roles) {
      if (ids.has(role.id)) {
        throw new Error(`duplicate role id: ${role.id}`);
      }
      ids.add(role.id);
    }
    this.roles = config.roles;
    this.client = config.client;
    this.shareTranscript = config.shareTranscript ?? true;
    this.sharedContext = config.sharedContext;
  }

  async run(prompt: string): Promise<SwarmRunResult> {
    const turns: SwarmTurn[] = [];
    for (const role of this.roles) {
      const rolePrompt = this.buildPrompt(prompt, turns);
      const response = await this.client.generate({
        prompt: rolePrompt,
        systemPrompt: role.systemPrompt,
        maxTokens: 512,
        temperature: role.temperature,
      }, role.tier);
      turns.push({
        roleId: role.id,
        roleName: role.name,
        prompt: rolePrompt,
        output: response.text,
        tier: response.tier,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
      });
    }
    const finalOutput = turns[turns.length - 1]?.output ?? '';
    return {
      turns,
      finalOutput,
      verdict: parseVerdict(finalOutput),
      totalTokens: turns.reduce((sum, turn) => sum + turn.tokensUsed, 0),
      totalLatencyMs: turns.reduce((sum, turn) => sum + turn.latencyMs, 0),
    };
  }

  async runUntilShipped(prompt: string, maxRounds: number): Promise<{ shipped: boolean; rounds: SwarmRunResult[] }> {
    if (maxRounds < 1) {
      throw new Error('maxRounds must be at least 1');
    }
    const rounds: SwarmRunResult[] = [];
    let currentPrompt = prompt;
    const hasCritic = this.roles.some(role => role.id === 'critic');
    for (let round = 0; round < maxRounds; round++) {
      const result = await this.run(currentPrompt);
      rounds.push(result);
      if (result.verdict === 'ship') return { shipped: true, rounds };
      if (!hasCritic) break;
      currentPrompt = `${prompt}\n\nPrior critique to address:\n${result.finalOutput}`;
    }
    return { shipped: false, rounds };
  }

  private buildPrompt(prompt: string, turns: SwarmTurn[]): string {
    const parts: string[] = [];
    if (this.sharedContext) parts.push(this.sharedContext);
    parts.push(prompt);
    if (this.shareTranscript && turns.length > 0) {
      parts.push('Transcript so far:');
      for (const turn of turns) {
        parts.push(`${turn.roleName}: ${turn.output}`);
      }
    }
    return parts.join('\n\n');
  }
}