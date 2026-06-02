import type { Seed } from '../kernel/types';
import { rngFromHash } from '../kernel/rng';

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
      ? (seed.$fitness.overall ?? 0)
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
}

/** Quick factory for larger agent swarms (used by the GSPL agent and OS Shell) */
export function createSwarm(config: Partial<SwarmConfig> = {}): SwarmConfig {
  const baseAgents: SwarmAgent[] = [
    { id: 'idea', name: 'Idea Agent', persona: 'creative', domain: 'all', strength: 'creativity' },
    { id: 'critic', name: 'Critic Agent', persona: 'analytical', domain: 'all', strength: 'analysis' },
    { id: 'economist', name: 'Economist Agent', persona: 'value-focused', domain: 'agent', strength: 'value' },
    { id: 'historian', name: 'Historian Agent', persona: 'memory', domain: 'narrative', strength: 'context' },
  ];
  const agents = config.agents || baseAgents;
  return {
    agents,
    quorum: config.quorum ?? Math.ceil(agents.length * 0.6),
    maxIterations: config.maxIterations ?? 6,
    minConsensus: config.minConsensus ?? 0.65,
  };
}

export {
  SwarmOrchestrator,
  DEFAULT_ROLES,
  parseVerdict,
  type SwarmRole,
  type SwarmRunResult,
  type SwarmUntilShippedResult,
} from './swarm-orchestrator.js';

/** Swarm-level sovereign breeding */
export function breedSwarm(swarmA: SwarmConfig, swarmB: SwarmConfig): SwarmConfig {
  const combined = [...swarmA.agents, ...swarmB.agents].slice(0, 8);
  return createSwarm({
    agents: combined,
    quorum: Math.ceil(combined.length * 0.6),
    maxIterations: Math.max(swarmA.maxIterations, swarmB.maxIterations),
  });
}

// End of swarm module - all functions complete for this 100% wave.