/**
 * Paradigm Beyond Omega - Agent Swarm System
 * Idea Agent + Style Agent + Critic Agent collaborating
 * Reputation scores, autonomous evolution, self-improvement
 */

import { UniversalSeed, GeneType } from '../../seeds';
import { Xoshiro256Star, rngFromHash } from '../kernel/index.js';
import type { GSeedVisualConfig } from '../rendering/webgpu-seed-renderer';
import { dispatch } from '../kernel/engine-dispatcher';

export interface SwarmEvolutionConfig {
  maxGenerations: number;
  populationSize: number;
  mutationRate: number;
  targetFitness: number;
  autoStart: boolean;
}

// --- Agent Types ---
export interface AgentThought {
  id: string;
  timestamp: number;
  type: 'idea' | 'style' | 'critic';
  content: string;
  confidence: number;
  metadata: {
    actions?: string[];
    success?: boolean;
    improvements?: string[];
  };
}

export interface AgentConfig {
  name: string;
  type: 'idea' | 'style' | 'critic';
  personality: string;
  expertise: string[]; // Domains this agent specializes in
  temperature: number; // 0-1, creativity level
  reputation: number; // 0-1, starts at 0.5
}

// --- Base Agent Class ---
export abstract class BaseSwarmAgent {
  protected config: AgentConfig;
  protected thoughtHistory: AgentThought[] = [];
  protected rng: Xoshiro256Star;

  constructor(config: AgentConfig) {
    this.config = config;
    this.rng = rngFromHash(config.name + Date.now().toString(16));
  }

  abstract process(input: string, context?: any): Promise<AgentThought>;

  getThoughtHistory(): AgentThought[] {
    return this.thoughtHistory.slice();
  }

  updateReputation(success: boolean): void {
    const delta = success ? 0.1 : -0.05;
    this.config.reputation = Math.max(0, Math.min(1, this.config.reputation + delta));
  }

  getReputation(): number {
    return this.config.reputation;
  }

  protected createThought(content: string, metadata: any = {}): AgentThought {
    const thought: AgentThought = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      type: this.config.type,
      content,
      confidence: 0.5 + Math.random() * 0.5,
      metadata
    };
    this.thoughtHistory.push(thought);
    return thought;
  }
}

// --- Idea Agent ---
export class IdeaAgent extends BaseSwarmAgent {
  constructor(name: string, expertise: string[]) {
    super({
      name,
      type: 'idea',
      personality: 'Creative, divergent thinker, idea generator',
      expertise,
      temperature: 0.8,
      reputation: 0.5
    });
  }

  async process(input: string, context?: any): Promise<AgentThought> {
    const rng = rngFromHash(this.config.name + (context?.seedId || '') + Date.now().toString(16));

    // Generate ideas based on input
    const ideas = this.generateIdeas(input, rng);
    const content = `Idea Agent: Generated ${ideas.length} ideas for "${input}"`;

    return this.createThought(content, { ideas });
  }

  private generateIdeas(input: string, rng: Xoshiro256Star): any[] {
    const count = 3 + Math.floor(rng.nextF64() * 5);
    const ideas = [];
    for (let i = 0; i < count; i++) {
      ideas.push({
        domain: this.config.expertise[Math.floor(rng.nextF64() * this.config.expertise.length)] || 'character',
        genes: this.generateGeneIdeas(rng)
      });
    }
    return ideas;
  }

  private generateGeneIdeas(rng: Xoshiro256Star): Record<string, any> {
    return {
      [GeneType.COLOR as any]: [rng.nextF64(), rng.nextF64(), rng.nextF64()],
      [GeneType.MOTION as any]: [rng.nextF64() * 10, rng.nextF64() * 10, rng.nextF64() * 10]
    };
  }
}

// --- Style Agent ---
export class StyleAgent extends BaseSwarmAgent {
  constructor(name: string, expertise: string[]) {
    super({
      name,
      type: 'style',
      personality: 'Aesthetic, detail-oriented, pattern recognizer',
      expertise,
      temperature: 0.6,
      reputation: 0.5
    });
  }

  async process(input: string, context?: any): Promise<AgentThought> {
    const rng = rngFromHash(this.config.name + (context?.seedId || '') + Date.now().toString(16));

    // Analyze style of input or seed
    const styleAnalysis = this.analyzeStyle(input, context, rng);
    const content = `Style Agent: Applied ${styleAnalysis.style} style`;

    return this.createThought(content, { styleAnalysis });
  }

  private analyzeStyle(input: string, context: any, rng: Xoshiro256Star): any {
    const styles = ['minimalist', 'futuristic', 'organic', 'industrial', 'elegant'];
    return {
      style: styles[Math.floor(rng.nextF64() * styles.length)],
      palette: this.generatePalette(context?.style || 'default', rng),
      complexity: rng.nextF64()
    };
  }

  private generatePalette(style: string, rng: Xoshiro256Star): string[] {
    const palettes: Record<string, string[]> = {
      minimalist: ['#ffffff', '#f0f0f0', '#e0e0e0'],
      futuristic: ['#00ffff', '#ff00ff', '#ffff00'],
      organic: ['#228b22', '#32cd32', '#90ee90'],
      industrial: ['#808080', '#a9a9a9', '#696969'],
      elegant: ['#000000', '#1a1a1a', '#333333']
    };
    return palettes[style] || palettes.default;
  }
}

// --- Critic Agent ---
export class CriticAgent extends BaseSwarmAgent {
  constructor(name: string) {
    super({
      name,
      type: 'critic',
      personality: 'Analytical, fair, improvement-oriented',
      expertise: ['evaluation', 'quality', 'fitness'],
      temperature: 0.3,
      reputation: 0.5
    });
  }

  async process(input: string, context?: any): Promise<AgentThought> {
    const rng = rngFromHash(this.config.name + (context?.seedId || '') + Date.now().toString(16));

    // Critique the input
    const critique = this.generateCritique(input, context, rng);
    const content = `Critic Agent: ${critique.approved ? 'Approved' : 'Needs improvement'} - ${critique.summary}`;

    return this.createThought(content, { critique });
  }

  private generateCritique(input: string, context: any, rng: Xoshiro256Star): any {
    const overall = 0.3 + rng.nextF64() * 0.7; // 0.3-1.0
    return {
      overall,
      approved: overall > 0.7,
      summary: `Overall quality: ${(overall * 100).toFixed(0)}%`,
      suggestions: this.generateSuggestions(overall, rng)
    };
  }

  private generateSuggestions(overall: number, rng: Xoshiro256Star): string[] {
    const suggestions = [];
    if (overall < 0.5) {
      suggestions.push('Improve structure', 'Enhance aesthetics');
    } else if (overall < 0.8) {
      suggestions.push('Fine-tune details', 'Polish output');
    }
    return suggestions;
  }
}

// --- Swarm ---
export class AgentSwarm {
  private agents: BaseSwarmAgent[] = [];
  private evolutionConfig: SwarmEvolutionConfig = {
    maxGenerations: 100,
    populationSize: 10,
    mutationRate: 0.1,
    targetFitness: 0.95,
    autoStart: false
  };
  private isEvolving = false;
  private population: any[] = [];
  private evolutionCallback?: (gen: number, pop: any[]) => void;

  constructor() {
    // Create default agents
    this.agents.push(new IdeaAgent('Idea1', ['character', 'music', 'game']));
    this.agents.push(new IdeaAgent('Idea2', ['visual2d', 'narrative', 'ui']));
    this.agents.push(new StyleAgent('Style1', ['visual2d', 'architecture', 'fashion']));
    this.agents.push(new StyleAgent('Style2', ['music', 'choreography', 'dance']));
    this.agents.push(new CriticAgent('Critic1'));
    this.agents.push(new CriticAgent('Critic2'));
  }

  getAgents(): BaseSwarmAgent[] {
    return this.agents.slice();
  }

  getAgentsByType(type: string): BaseSwarmAgent[] {
    return this.agents.filter(a => a.constructor.name.toLowerCase().includes(type));
  }

  addAgent(agent: BaseSwarmAgent): void {
    this.agents.push(agent);
  }

  removeAgent(name: string): void {
    this.agents = this.agents.filter(a => a.constructor.name !== name);
  }

  configureEvolution(config: Partial<SwarmEvolutionConfig>): void {
    this.evolutionConfig = { ...this.evolutionConfig, ...config };
  }

  onEvolutionUpdate(callback: (gen: number, pop: any[]) => void): void {
    this.evolutionCallback = callback;
  }

  async startAutonomousEvolution(seedRequest: string): Promise<void> {
    if (this.isEvolving) return;
    this.isEvolving = true;

    // Initialize population with Idea Agents
    const ideaAgents = this.getAgentsByType('idea');
    if (ideaAgents.length === 0) {
      this.isEvolving = false;
      return;
    }

    this.population = [];
    for (let i = 0; i < this.evolutionConfig.populationSize; i++) {
      const agent = ideaAgents[i % ideaAgents.length];
      const thought = await agent.process(seedRequest);
      if ((thought.metadata as any)?.ideas?.[0]) {
        const seed = new UniversalSeed();
        if (seed) {
          this.population.push(seed);
        }
      }
    }

    // Evolution loop
    for (let gen = 0; gen < this.evolutionConfig.maxGenerations && this.isEvolving; gen++) {
      // Evaluate fitness using Critic Agents
      const criticAgents = this.getAgentsByType('critic');
      for (const seed of this.population) {
        if (criticAgents.length > 0) {
          const critique = await criticAgents[0].process('evaluate', { seed });
          (seed as any).fitness = ((critique.metadata as any)?.critique?.overall || 0.5) / 6;
        } else {
          (seed as any).fitness = Math.random();
        }
      }

      // Sort by fitness
      this.population.sort((a: any, b: any) => (b.fitness || 0) - (a.fitness || 0));

      if (this.evolutionCallback) {
        this.evolutionCallback(gen, this.population.slice(0, 10));
      }

      // Check termination
      if ((this.population[0] as any)?.fitness >= this.evolutionConfig.targetFitness) {
        break;
      }

      // Evolve: keep top 20%, mutate rest
      const eliteCount = Math.floor(this.population.length * 0.2);
      const newPopulation = this.population.slice(0, eliteCount);

      while (newPopulation.length < this.evolutionConfig.populationSize) {
        const parent = this.population[Math.floor(Math.random() * eliteCount)];
        const child = this.mutateSeed(parent);
        newPopulation.push(child);
      }

      this.population = newPopulation;
    }

    this.isEvolving = false;
  }

  stopEvolution(): void {
    this.isEvolving = false;
  }

  private mutateSeed(seed: any): any {
    const child = new UniversalSeed();
    if (!child) return seed;

    // Copy and mutate genes
    (child as any).genes = {};
    if ((seed as any).genes) {
      Object.entries((seed as any).genes).forEach(([name, gene]: [string, any]) => {
        if (Math.random() < this.evolutionConfig.mutationRate) {
          // Mutate
          const rng = rngFromHash((seed as any).$hash + Math.random().toString());
          if (gene.type === 'scalar') {
            (child as any).genes[name] = {
              ...gene,
              value: Math.max(0, Math.min(1, (gene.value || 0.5) + (rng.nextF64() - 0.5) * 0.2))
            };
          } else {
            (child as any).genes[name] = gene;
          }
        } else {
          (child as any).genes[name] = gene;
        }
      });
    }

    return child;
  }

  getSwarmReputation(): Record<string, number> {
    const rep: Record<string, number> = {};
    this.agents.forEach(agent => {
      rep[agent.constructor.name] = agent.getReputation();
    });
    return rep;
  }
}

// --- Factory ---
export function createDefaultSwarm(): AgentSwarm {
  return new AgentSwarm();
}
