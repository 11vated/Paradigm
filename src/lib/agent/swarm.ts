import type { Seed } from '../kernel/types';

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

    const fitness = seed.$fitness?.overall || 0;
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
        const randomAgent =
          approveAgents[Math.floor(Math.random() * approveAgents.length)];
        const voteIdx = this.config.agents.findIndex(a => a.id === randomAgent.id);
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
}

export const createAgentSwarm = (config?: Partial<SwarmConfig>) =>
  new AgentSwarm(config);

export { AgentSwarm, type SwarmAgent, type SwarmConfig, type SwarmResult, DEFAULT_AGENTS };