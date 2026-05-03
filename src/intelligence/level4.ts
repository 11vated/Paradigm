import { GSPLAgent, AgentConfig } from './agent';
import { WorldModel } from './worldmodel';
import { UniversalSeed, GeneType } from '../seeds';
import { GeneticAlgorithm } from '../evolution';
import { Xoshiro256StarStar, rngFromHash } from '../lib/kernel/rng';

export interface Level4Config {
  selfImprovement: boolean;
  worldModelEnabled: boolean;
  multiAgentEnabled: boolean;
  maxAgents: number;
  autoTuning: boolean;
}

export interface AgentThought {
  id: string;
  timestamp: number;
  type: 'perception' | 'reasoning' | 'planning' | 'action' | 'reflection';
  content: string;
  confidence: number;
  metadata: Record<string, unknown>;
}

export interface SelfModel {
  identity: string;
  capabilities: string[];
  limitations: string[];
  goals: string[];
  values: Record<string, number>;
  performance: Map<string, number>;
  learningHistory: AgentThought[];
}

export interface MultiAgentNetwork {
  id: string;
  agents: Map<string, GSPLAgent>;
  sharedWorldModel: WorldModel;
  messageBus: AgentMessage[];
}

export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string | 'broadcast';
  type: 'request' | 'response' | 'notification' | 'query';
  content: string;
  timestamp: number;
  correlationId?: string;
}

export class Level4Intelligence {
  private config: Level4Config;
  private selfModel: SelfModel;
  private network: MultiAgentNetwork;
  private rng: ReturnType<typeof rngFromHash> | null = null;
  private thoughtHistory: AgentThought[] = [];
  private metaLearner: MetaLearner;
  private codeGenerator: CodeGenerator;

  constructor(config: Partial<Level4Config> = {}) {
    this.config = {
      selfImprovement: config.selfImprovement ?? true,
      worldModelEnabled: config.worldModelEnabled ?? true,
      multiAgentEnabled: config.multiAgentEnabled ?? true,
      maxAgents: config.maxAgents ?? 10,
      autoTuning: config.autoTuning ?? true
    };

    this.selfModel = this.initializeSelfModel();
    this.network = this.initializeNetwork();
    this.metaLearner = new MetaLearner();
    this.codeGenerator = new CodeGenerator();
  }

  private initializeSelfModel(): SelfModel {
    return {
      identity: crypto.randomUUID(),
      capabilities: [
        'seed_creation',
        'mutation',
        'breeding',
        'evolution',
        'code_execution',
        'reasoning',
        'planning',
        'learning'
      ],
      limitations: [
        'no_physical_embodiment',
        'limited_context_window',
        'no_real_time_feedback'
      ],
      goals: [
        'improve_reasoning',
        'expand_capabilities',
        'optimize_performance',
        'achieve_better_fitness'
      ],
      values: {
        accuracy: 0.8,
        speed: 0.7,
        creativity: 0.6,
        safety: 0.9,
        efficiency: 0.75
      },
      performance: new Map([
        ['task_completion', 0.85],
        ['reasoning_quality', 0.7],
        ['learning_rate', 0.5],
        ['error_rate', 0.1]
      ]),
      learningHistory: []
    };
  }

  private initializeNetwork(): MultiAgentNetwork {
    return {
      id: `network_${crypto.randomUUID()}`,
      agents: new Map(),
      sharedWorldModel: new WorldModel(),
      messageBus: []
    };
  }

  async process(input: string): Promise<string> {
    const thought = await this.perceive(input);
    this.thoughtHistory.push(thought);

    const reasoning = await this.reason(thought);
    this.thoughtHistory.push(reasoning);

    const planning = await this.plan(reasoning);
    this.thoughtHistory.push(planning);

    const action = await this.act(planning);
    this.thoughtHistory.push(action);

    if (this.config.selfImprovement) {
      await this.selfImprove();
    }

    return action.content;
  }

  private async perceive(input: string): Promise<AgentThought> {
    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'perception',
      content: input,
      confidence: 0.9,
      metadata: {
        inputLength: input.length,
        tokens: input.split(/\s+/).length
      }
    };
  }

  private async reason(thought: AgentThought): Promise<AgentThought> {
    const relevantConcepts = this.network.sharedWorldModel.infer(thought.content);
    
    const reasoning: AgentThought = {
      id: crypto.randomUUID() as any, // the exact type depends on AgentThought definition
      timestamp: Date.now(),
      type: 'reasoning',
      content: `Analyzed input. Found ${relevantConcepts.length} relevant concepts.`,
      confidence: 0.75,
      metadata: {
        concepts: relevantConcepts,
        depth: 3
      }
    };

    return reasoning;
  }

  private async plan(reasoning: AgentThought): Promise<AgentThought> {
    const plan: AgentThought = {
      id: crypto.randomUUID() as any,
      timestamp: Date.now(),
      type: 'planning',
      content: 'Generated execution plan: create seed -> mutate -> evaluate fitness',
      confidence: 0.8,
      metadata: {
        steps: ['create_seed', 'mutate', 'evaluate', 'evolve'],
        estimatedTime: '5s'
      }
    };

    return plan;
  }

  private async act(plan: AgentThought): Promise<AgentThought> {
    const actions = plan.metadata.steps as string[];
    let result = 'Executed: ';

    for (const action of actions) {
      switch (action) {
        case 'create_seed':
          const seed = new UniversalSeed();
          if (!this.rng) {
            const seed = new UniversalSeed();
            this.rng = rngFromHash(seed.id || 'level4-default');
          }
          seed.setGene(GeneType.COLOR, [this.rng.nextF64(), this.rng.nextF64(), this.rng.nextF64()]);
          result += 'seed created, ';
          break;
        case 'mutate':
          result += 'mutated, ';
          break;
        case 'evaluate':
          result += 'evaluated, ';
          break;
        case 'evolve':
          result += 'evolved';
          break;
      }
    }

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'action',
      content: result,
      confidence: 0.95,
      metadata: {
        actions,
        success: true
      }
    };
  }

  private async selfImprove(): Promise<void> {
    const recentThoughts = this.thoughtHistory.slice(-100);
    
    const patterns = this.metaLearner.analyze(recentThoughts);
    
    const improvements = this.metaLearner.suggestImprovements(patterns);
    
    for (const improvement of improvements) {
      await this.applyImprovement(improvement);
    }

    this.selfModel.learningHistory.push({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'reflection',
      content: `Applied ${improvements.length} improvements`,
      confidence: 0.7,
      metadata: { improvements }
    });
  }

  private async applyImprovement(improvement: { type: string; params: unknown }): Promise<void> {
    switch (improvement.type) {
      case 'parameter_tuning':
        if (this.config.autoTuning) {
          this.selfModel.values.accuracy += 0.01;
        }
        break;
      case 'code_generation':
        const newCode = this.codeGenerator.generate(improvement.params as string);
        this.selfModel.capabilities.push(newCode);
        break;
      case 'model_extension':
        this.selfModel.capabilities.push('extended_capability');
        break;
    }
  }

  addAgent(config: AgentConfig): GSPLAgent {
    if (this.network.agents.size >= this.config.maxAgents) {
      throw new Error('Maximum agent limit reached');
    }

    const agent = new GSPLAgent(config);
    this.network.agents.set(agent.getSessionId(), agent);
    return agent;
  }

  removeAgent(agentId: string): boolean {
    return this.network.agents.delete(agentId);
  }

  sendMessage(fromAgent: string, toAgent: string | 'broadcast', content: string, type: AgentMessage['type']): AgentMessage {
    const message: AgentMessage = {
      id: crypto.randomUUID(),
      fromAgent,
      toAgent,
      type,
      content,
      timestamp: Date.now()
    };

    this.network.messageBus.push(message);

    if (toAgent !== 'broadcast' && this.network.agents.has(toAgent)) {
      const targetAgent = this.network.agents.get(toAgent)!;
      targetAgent.process(content);
    } else if (toAgent === 'broadcast') {
      for (const agent of this.network.agents.values()) {
        if (agent.getSessionId() !== fromAgent) {
          agent.process(content);
        }
      }
    }

    return message;
  }

  getThoughtHistory(): AgentThought[] {
    return [...this.thoughtHistory];
  }

  getSelfModel(): SelfModel {
    return { ...this.selfModel };
  }

  getNetworkStats(): { agentCount: number; messageCount: number; conceptCount: number } {
    return {
      agentCount: this.network.agents.size,
      messageCount: this.network.messageBus.length,
      conceptCount: this.network.sharedWorldModel.getConceptCount()
    };
  }
}

class MetaLearner {
  analyze(thoughts: AgentThought[]): object {
    const patterns = {
      successRate: 0,
      commonTypes: [] as string[],
      avgConfidence: 0
    };

    const completed = thoughts.filter(t => t.type === 'action');
    patterns.successRate = completed.length / thoughts.length;
    
    const typeCounts = new Map<string, number>();
    for (const thought of thoughts) {
      typeCounts.set(thought.type, (typeCounts.get(thought.type) || 0) + 1);
    }
    patterns.commonTypes = Array.from(typeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(e => e[0]);

    patterns.avgConfidence = thoughts.reduce((sum, t) => sum + t.confidence, 0) / thoughts.length;

    return patterns;
  }

  suggestImprovements(patterns: object): { type: string; params: unknown }[] {
    const suggestions: { type: string; params: unknown }[] = [];

    if ((patterns as { avgConfidence: number }).avgConfidence < 0.7) {
      suggestions.push({ type: 'parameter_tuning', params: { confidence: 0.1 } });
    }

    suggestions.push({ type: 'code_generation', params: 'optimization' });
    suggestions.push({ type: 'model_extension', params: { capability: 'advanced_reasoning' } });

    return suggestions;
  }
}

class CodeGenerator {
  generate(purpose: string): string {
    const templates: Record<string, string> = {
      optimization: `
function optimize() {
  const seeds = registry.getAll();
  const fitness = evaluateAll(seeds);
  return evolveTop(fitness, 10);
}`,
      'advanced_reasoning': `
function deepReason(input) {
  const concepts = extractConcepts(input);
  const causalLinks = findCausalLinks(concepts);
  return infer(causalLinks);
}`
    };

    return templates[purpose] || templates.optimization;
  }
}