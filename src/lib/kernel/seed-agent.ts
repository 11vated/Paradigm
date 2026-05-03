/**
 * SeedAgent — Agent IS a GSPL Seed
 * Phase II.1: Agent with reasoning, tool use, and multi-step workflows
 *
 * The agent IS a seed with genes controlling:
 * - personality (persona, creativity, empathy, assertiveness)
 * - reasoning (style, depth, confidence)
 * - knowledge (domains, facts, memory_capacity)
 * - tools (available_tools, tool_preference)
 * - memory (episodic_memory, semantic_memory, memory_decay)
 * - sovereignty (can_fork, can_breed, signature, ownership)
 *
 * This makes the agent:
 * - Breedable (breed two agents to create child agent)
 * - Evolvable (run evolution on agent population)
 * - Sovereign (self-owned, self-signing)
 */

import type { Seed, Artifact } from './engines';
import { executeGspl } from './gspl-interpreter';
import { growSeed } from './engines';
import { rngFromHash, Xoshiro256StarStar } from './rng';
import { createSeed } from './seeds';

// ─── Integrate 6 Kernel Files (Reconstructed Nexus) ───
import { routeSeed, routeToLLM, routeByStance, type RoutingDecision } from './seed-router';
import { 
  STANCE_REGISTRY, applyStance, breedStances, mutateStance, 
  stanceDistance, recommendStance, type StanceConfig 
} from './stance-genetics';
import { LineageTracker, type LineageNode } from './lineage-tracker';
import { SeedDependencyGraph, type SeedGraphNode } from './seed-dependency-graph';
import { 
  operatorHooks, safetyHook, loggingHook, validationHook, 
  breedWithHooks, mutateWithHooks, growWithHooks 
} from './operator-hooks';
import { 
  sovereigntyChecker, checkSovereigntyHook, signAfterOperation,
  PermissionLevel, type SovereigntyCheck 
} from './sovereignty-checker';

// Tool definition
export interface AgentTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  execute: (args: any) => Promise<any>;
}

// Agent configuration
export interface SeedAgentConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'mock';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  maxIterations?: number;
  verbose?: boolean;
}

// Agent Seed interface (the agent IS a seed)
export interface AgentSeed extends Seed {
  $domain: 'agent';
  genes: {
    // Personality genes
    persona: { type: 'string'; value: string };
    creativity: { type: 'float'; value: number };
    empathy: { type: 'float'; value: number };
    assertiveness: { type: 'float'; value: number };

    // Reasoning genes
    reasoning_style: { type: 'enum'; value: 'deductive' | 'inductive' | 'abductive' };
    depth: { type: 'float'; value: number };
    confidence: { type: 'float'; value: number };

    // Knowledge genes
    domains: { type: 'array'; value: string[] };
    facts: { type: 'float'; value: number };
    memory_capacity: { type: 'int'; value: number };

    // Tools genes
    available_tools: { type: 'array'; value: string[] };
    tool_preference: { type: 'string'; value: string };

    // Memory genes
    episodic_memory: { type: 'bool'; value: boolean };
    semantic_memory: { type: 'bool'; value: boolean };
    memory_decay: { type: 'float'; value: number };

    // Sovereignty genes
    can_fork: { type: 'bool'; value: boolean };
    can_breed: { type: 'bool'; value: boolean };
    signature: { type: 'string'; value: string };
    ownership: { type: 'string'; value: string };
  };
}

// Agent state
export interface AgentState {
  iteration: number;
  maxIterations: number;
  memory: AgentMemory;
  currentGoal: string;
  artifacts: Artifact[];
  agentSeed: AgentSeed; // The agent IS this seed
}

export interface AgentMemory {
  seeds: Map<string, Seed>;
  artifacts: Map<string, Artifact>;
  gsplPrograms: Map<string, string>;
  reflections: string[];
  episodic: Array<{ timestamp: number; event: string; outcome: string }>;
  semantic: Map<string, any>; // Fact storage
}

// LLM Message types
interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * SeedAgent — Main agent class
 * The agent IS a seed, not just controlled by one
 */
export class SeedAgent {
  private config: SeedAgentConfig;
  private state: AgentState;
  private tools: Map<string, AgentTool> = new Map();
  private llmMessages: LLMMessage[] = [];

  // The agent IS a seed
  private agentSeed: AgentSeed;

  // ─── Integrated Kernel Systems (Reconstructed Nexus) ───
  private seedRouter: typeof routeSeed | null = null;
  private lineageTracker: LineageTracker = new LineageTracker();
  private dependencyGraph: SeedDependencyGraph = new SeedDependencyGraph();
  private currentStance: string = 'architect';
  // ────────────────────────────────────────────────────────

  constructor(config: Partial<SeedAgentConfig> = {}, agentSeed?: AgentSeed) {
    this.config = {
      provider: 'mock',
      model: 'mock-v1',
      temperature: 0.7,
      maxTokens: 4096,
      maxIterations: 10,
      verbose: false,
      ...config,
    };

    // Agent IS a seed - use provided seed or create one
    if (agentSeed) {
      this.agentSeed = agentSeed;
    } else {
      // Create default agent seed using ARCHITECT_STANCE
      const phrase = `agent:default_${Date.now()}`;
      const hash = this.simpleHash64(phrase);
      const defaultStance = STANCE_REGISTRY['architect'];
      
      this.agentSeed = {
        phrase,
        hash,
        rng: rngFromHash(hash),
        $domain: 'agent',
        $name: 'DefaultAgent',
        genes: defaultStance.genes,
      } as AgentSeed;
    }

    this.state = {
      iteration: 0,
      maxIterations: this.config.maxIterations || 10,
      memory: {
        seeds: new Map(),
        artifacts: new Map(),
        gsplPrograms: new Map(),
        reflections: [],
        episodic: [],
        semantic: new Map(),
      },
      currentGoal: '',
      artifacts: [],
      agentSeed: this.agentSeed,
    };

    // Initialize integrated kernel systems
    this.initializeKernelSystems();

    this.registerDefaultTools();
  }

  /**
   * Initialize all 6 kernel systems (reconstructed Nexus)
   */
  private initializeKernelSystems(): void {
    // 1. Seed Router (replaces Model Router)
    this.seedRouter = (seed, config) => {
      return routeSeed(seed, this.agentSeed.genes, config || {
        preferGPU: true,
        fallbackToCPU: true,
        allowComposition: true,
      });
    };

    // 2. Lineage Tracker (replaces Conversation Branching)
    // Already initialized as this.lineageTracker

    // 3. Dependency Graph (replaces Project Intelligence)
    // Already initialized as this.dependencyGraph

    // 4. Stance Genetics (replaces Adaptive Stances)
    this.currentStance = this.agentSeed.genes?.persona?.value || 'architect';

    // 5. Operator Hooks (replaces Hooks & Safety)
    // Already initialized as global operatorHooks

    // 6. Sovereignty Checker (replaces Permission System)
    // Already initialized as global sovereigntyChecker

    // Record primordial seed
    this.lineageTracker.recordPrimordial(this.agentSeed);
    this.dependencyGraph.addPrimordial(this.agentSeed);
  }

  /**
   * Change agent stance (replaces Nexus stance switching)
   */
  setStance(stanceName: string): void {
    const stance = STANCE_REGISTRY[stanceName];
    if (!stance) {
      throw new Error(`Unknown stance: ${stanceName}`);
    }

    // Apply stance genes to agent seed
    this.agentSeed = applyStance(this.agentSeed, stanceName) as AgentSeed;
    this.currentStance = stanceName;

    // Update state
    this.state.agentSeed = this.agentSeed;
  }

  /**
   * Get current stance info
   */
  getStance(): { name: string; config: StanceConfig } | null {
    const stance = STANCE_REGISTRY[this.currentStance];
    if (!stance) return null;
    return { name: this.currentStance, config: stance };
  }

  /**
   * Route seed using integrated seed router
   */
  routeSeed(seed: Seed): RoutingDecision {
    if (!this.seedRouter) {
      throw new Error('Seed router not initialized');
    }
    return this.seedRouter(seed);
  }

  /**
   * Get lineage tracker (replaces conversation history)
   */
  getLineageTracker(): LineageTracker {
    return this.lineageTracker;
  }

  /**
   * Get dependency graph (replaces project intelligence)
   */
  getDependencyGraph(): SeedDependencyGraph {
    return this.dependencyGraph;
  }

  /**
   * Check sovereignty permissions
   */
  checkPermission(operation: string, signature?: string): SovereigntyCheck {
    return sovereigntyChecker.checkPermission(
      this.agentSeed,
      operation as any,
      undefined,
      signature
    );
  }

  /**
   * Execute a goal using the agent
   * The agent uses its seed genes to control behavior
   */
  async execute(goal: string): Promise<{ success: boolean; artifacts: Artifact[]; reasoning: string }> {
    this.state.currentGoal = goal;
    this.state.iteration = 0;
    this.llmMessages = [];

    // System prompt - use agent seed's personality genes
    const systemPrompt = this.buildSystemPrompt();
    this.llmMessages.push({ role: 'system', content: systemPrompt });

    // User goal
    this.llmMessages.push({ role: 'user', content: `Goal: ${goal}` });

    if (this.config.verbose) {
      console.log(`\n[SeedAgent] Starting execution for goal: ${goal}`);
      console.log(`[SeedAgent] Personality: ${this.agentSeed.genes.persona.value}`);
      console.log(`[SeedAgent] Creativity: ${this.agentSeed.genes.creativity.value}`);
    }

    while (this.state.iteration < this.state.maxIterations) {
      this.state.iteration++;

      if (this.config.verbose) {
        console.log(`\n[SeedAgent] Iteration ${this.state.iteration}/${this.state.maxIterations}`);
      }

      // Route seed using integrated seed router (replaces Model Router)
      if (this.seedRouter) {
        const routingDecision = this.seedRouter(this.agentSeed);
        if (this.config.verbose) {
          console.log(`[SeedAgent] Routing: ${routingDecision.reason} (confidence: ${routingDecision.confidence})`);
        }
      }

      // Get LLM response (temperature controlled by agent seed gene)
      const response = await this.callLLM(this.llmMessages);

      // Check if LLM wants to use tools
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolResults: LLMMessage[] = [];

        for (const toolCall of response.tool_calls) {
          const result = await this.executeToolCall(toolCall);
          toolResults.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(result),
          });

          if (this.config.verbose) {
            console.log(`[SeedAgent] Tool ${toolCall.function.name} returned:`, result);
          }
        }

        this.llmMessages.push(response);
        this.llmMessages.push(...toolResults);
      } else {
        // LLM provided final answer - reflect using agent seed's episodic memory
        this.llmMessages.push(response);

        // Record to episodic memory
        if (this.agentSeed.genes.episodic_memory.value) {
          this.state.memory.episodic.push({
            timestamp: Date.now(),
            event: `Goal: ${goal}`,
            outcome: response.content?.substring(0, 100) || '',
          });

          // Apply memory decay
          const decay = this.agentSeed.genes.memory_decay.value;
          if (decay > 0 && this.state.memory.episodic.length > this.agentSeed.genes.memory_capacity.value) {
            // Remove oldest memories based on decay rate
            const keepCount = Math.floor(this.state.memory.episodic.length * (1 - decay));
            this.state.memory.episodic = this.state.memory.episodic.slice(-keepCount);
          }
        }

        return {
          success: true,
          artifacts: this.state.artifacts,
          reasoning: response.content,
        };
      }
    }

    // Max iterations reached
    return {
      success: false,
      artifacts: this.state.artifacts,
      reasoning: `Max iterations (${this.state.maxIterations}) reached without completing goal.`,
    };
  }

  /**
   * Breed this agent with another to create child agent seed
   * This makes agents breedable (key GSPL seed feature)
   */
  breedWith(otherAgent: SeedAgent): SeedAgent {
    if (!this.agentSeed.genes.can_breed.value || !otherAgent.agentSeed.genes.can_breed.value) {
      throw new Error('One or both agents cannot breed');
    }

    // Create child seed through genetic crossover
    const childGenes: any = {};
    const allKeys = new Set([
      ...Object.keys(this.agentSeed.genes),
      ...Object.keys(otherAgent.agentSeed.genes),
    ]);

    for (const key of allKeys) {
      // Uniform crossover: randomly pick from parent 1 or 2
      if (Math.random() < 0.5) {
        childGenes[key] = { ...this.agentSeed.genes[key] };
      } else {
        childGenes[key] = { ...otherAgent.agentSeed.genes[key] };
      }

      // Apply mutation based on creativity gene
      if (Math.random() < this.agentSeed.genes.creativity.value * 0.1) {
        if (childGenes[key] && typeof childGenes[key].value === 'number') {
          childGenes[key].value += (Math.random() - 0.5) * 0.2;
          childGenes[key].value = Math.max(0, Math.min(1, childGenes[key].value));
        }
      }
    }

    // Create child agent seed
    const childPhrase = `agent_child_${Date.now()}`;
    const childHash = this.simpleHash64(childPhrase);

    const childSeed: AgentSeed = {
      phrase: childPhrase,
      hash: childHash,
      rng: rngFromHash(childHash),
      $domain: 'agent',
      $name: `ChildAgent_${this.agentSeed.$name}_${otherAgent.agentSeed.$name}`,
      genes: childGenes,
      $lineage: {
        generation: ((this.agentSeed.$lineage?.generation || 0) + (otherAgent.agentSeed.$lineage?.generation || 0)) / 2 + 1,
        parents: [this.agentSeed.phrase, otherAgent.agentSeed.phrase],
      },
    } as AgentSeed;

    // Create child agent
    return new SeedAgent(
      { ...this.config },
      childSeed
    );
  }

  /**
   * Evolve agent population
   * Run evolution algorithm on agent population
   */
  static evolvePopulation(agents: SeedAgent[], fitnessFn: (agent: SeedAgent) => number, generations: number = 20): SeedAgent {
    let population = [...agents];

    for (let gen = 0; gen < generations; gen++) {
      // Calculate fitness
      const fitnesses = population.map(a => ({
        agent: a,
        fitness: fitnessFn(a),
      }));

      // Sort by fitness
      fitnesses.sort((a, b) => b.fitness - a.fitness);

      // Elitism: keep top 2
      const newPopulation: SeedAgent[] = [population[0], population[1]];

      // Fill rest with crossover and mutation
      while (newPopulation.length < population.length) {
        // Tournament selection
        const parent1 = this.tournamentSelect(fitnesses, 3);
        const parent2 = this.tournamentSelect(fitnesses, 3);

        const child = parent1.breedWith(parent2);
        newPopulation.push(child);
      }

      population = newPopulation;
    }

    return population[0]; // Return best agent
  }

  private static tournamentSelect(
    fitnesses: { agent: SeedAgent; fitness: number }[],
    tournamentSize: number
  ): SeedAgent {
    let best = fitnesses[Math.floor(Math.random() * fitnesses.length)];
    for (let i = 1; i < tournamentSize; i++) {
      const contender = fitnesses[Math.floor(Math.random() * fitnesses.length)];
      if (contender.fitness > best.fitness) {
        best = contender;
      }
    }
    return best.agent;
  }

  /**
   * Fork this agent to create a mutated copy
   * Creates a new agent with slight mutations to genes
   */
  forkAgent(): SeedAgent {
    if (!this.agentSeed.genes.can_fork.value) {
      throw new Error('This agent cannot fork');
    }

    // Create mutated copy of genes
    const forkedGenes: any = {};
    for (const [key, gene] of Object.entries(this.agentSeed.genes)) {
      forkedGenes[key] = { ...gene };

      // Mutate numeric values
      if (typeof gene.value === 'number') {
        const mutationRate = this.agentSeed.genes.creativity.value * 0.2;
        if (Math.random() < mutationRate) {
          forkedGenes[key].value += (Math.random() - 0.5) * 0.3;
          forkedGenes[key].value = Math.max(0, Math.min(1, forkedGenes[key].value));
        }
      }

      // Mutate array values (add/remove random items)
      if (Array.isArray(gene.value) && Math.random() < 0.1) {
        if (gene.value.length > 0 && Math.random() < 0.5) {
          // Remove random item
          const idx = Math.floor(Math.random() * gene.value.length);
          forkedGenes[key].value = gene.value.filter((_: any, i: number) => i !== idx);
        } else {
          // Add random item
          const domains = ['character', 'music', 'visual2d', 'game', 'geometry3d', 'audio', 'sprite'];
          const newItem = domains[Math.floor(Math.random() * domains.length)];
          if (!forkedGenes[key].value.includes(newItem)) {
            forkedGenes[key].value = [...gene.value, newItem];
          }
        }
      }
    }

    // Create forked seed
    const forkPhrase = `agent_fork_${Date.now()}`;
    const forkHash = this.simpleHash64(forkPhrase);

    const forkedSeed: AgentSeed = {
      phrase: forkPhrase,
      hash: forkHash,
      rng: rngFromHash(forkHash),
      $domain: 'agent',
      $name: `${this.agentSeed.$name}_Fork`,
      genes: forkedGenes,
      $lineage: {
        generation: (this.agentSeed.$lineage?.generation || 0) + 1,
        parents: [this.agentSeed.phrase],
      },
    } as AgentSeed;

    return new SeedAgent({ ...this.config }, forkedSeed);
  }

  /**
   * Mutate agent's own genes
   * Used for self-improvement/adaptation
   */
  mutateGenes(mutationRate: number = 0.1): void {
    for (const [key, gene] of Object.entries(this.agentSeed.genes)) {
      if (Math.random() < mutationRate) {
        if (typeof gene.value === 'number') {
          gene.value += (Math.random() - 0.5) * 0.2;
          gene.value = Math.max(0, Math.min(1, gene.value));
        }
      }
    }
  }

  /**
   * Get agent seed (for serialization/breeding)
   */
  getAgentSeed(): AgentSeed {
    return { ...this.agentSeed };
  }

  /**
   * Update agent seed genes
   */
  updateGenes(newGenes: Partial<AgentSeed['genes']>): void {
    for (const [key, value] of Object.entries(newGenes)) {
      if (this.agentSeed.genes[key]) {
        this.agentSeed.genes[key].value = value;
      }
    }
  }

  /**
   * Register default tools
   */
  private registerDefaultTools(): void {
    // Generate seed tool
    this.registerTool({
      name: 'generate_seed',
      description: 'Generate a new seed from a text prompt. Seeds are the fundamental units of generation.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Text description of what to generate' },
          domain: { type: 'string', description: 'Domain (character, music, visual2d, game, geometry3d, etc.)' },
        },
        required: ['prompt'],
      },
      execute: async (args) => {
        const phrase = `seed:${args.prompt.toLowerCase().replace(/\s+/g, '_')}`;
        const hash = this.simpleHash64(phrase);
        const seed: Seed = {
          phrase,
          hash,
          rng: rngFromHash(hash),
          $domain: args.domain || 'character',
          $name: args.prompt.slice(0, 50),
        } as Seed;

        this.state.memory.seeds.set(seed.phrase, seed);
        return { seed, success: true };
      },
    });

    // Execute GSPL tool
    this.registerTool({
      name: 'execute_gspl',
      description: 'Execute a GSPL (Genetic Seed Programming Language) program. Use this to run genetic algorithms, evolve seeds, and generate artifacts.',
      parameters: {
        type: 'object',
        properties: {
          program: { type: 'string', description: 'GSPL program code' },
        },
        required: ['program'],
      },
      execute: async (args) => {
        try {
          const result = executeGspl(args.program);
          return { result, success: true };
        } catch (e: any) {
          return { error: e.message, success: false };
        }
      },
    });

    // Grow seed tool
    this.registerTool({
      name: 'grow_seed',
      description: 'Grow a seed into an artifact using the appropriate generator engine (character->GLTF, music->WAV, etc.)',
      parameters: {
        type: 'object',
        properties: {
          seed: { type: 'object', description: 'Seed object to grow' },
          domain: { type: 'string', description: 'Override domain for generation' },
        },
        required: ['seed'],
      },
      execute: async (args) => {
        try {
          const artifact = await growSeed(args.seed as Seed);
          if (artifact) {
            this.state.artifacts.push(artifact);
            this.state.memory.artifacts.set(artifact.domain, artifact);
          }
          return { artifact, success: true };
        } catch (e: any) {
          return { error: e.message, success: false };
        }
      },
    });

    // Evolve population tool
    this.registerTool({
      name: 'evolve_population',
      description: 'Run evolution algorithm to find optimal seeds for a given criteria.',
      parameters: {
        type: 'object',
        properties: {
          seed: { type: 'object', description: 'Base seed to evolve from' },
          populationSize: { type: 'number', description: 'Size of population (default 50)' },
          generations: { type: 'number', description: 'Number of generations (default 20)' },
          fitness: { type: 'string', description: 'Fitness function as GSPL expression' },
        },
        required: ['seed'],
      },
      execute: async (args) => {
        // Simplified evolution - in reality would use genetic algorithms
        const populationSize = args.populationSize || 50;
        const generations = args.generations || 20;

        return {
          message: `Would evolve population of ${populationSize} for ${generations} generations`,
          success: true,
          note: 'Full evolution algorithm to be implemented in Phase II.2 Swarm Runtime',
        };
      },
    });

    // List domains tool
    this.registerTool({
      name: 'list_domains',
      description: 'List all available generative domains (character, music, visual2d, etc.)',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        return {
          domains: [
            'character', 'music', 'visual2d', 'game', 'geometry3d',
            'audio', 'sprite', 'animation', 'narrative', 'shader',
            'physics', 'ui', 'typography', 'architecture', 'vehicle',
            'furniture', 'fashion', 'robotics', 'circuit', 'food',
            'choreography', 'agent', 'ecosystem', 'particle', '3d-printing',
            'biotechnology', 'publishing',
          ],
          total: 27,
        };
      },
    });

    // Reflect tool
    this.registerTool({
      name: 'reflect',
      description: 'Reflect on current progress and decide next steps. Use this to evaluate if the goal has been achieved.',
      parameters: {
        type: 'object',
        properties: {
          thoughts: { type: 'string', description: 'Your reflection on current state and progress' },
        },
        required: ['thoughts'],
      },
      execute: async (args) => {
        this.state.memory.reflections.push(`[Iteration ${this.state.iteration}] ${args.thoughts}`);
        return { reflected: true, thoughts: args.thoughts };
      },
    });

    // Fork agent tool
    this.registerTool({
      name: 'fork_agent',
      description: 'Fork this agent to create a mutated copy. Uses the can_fork gene. New agent will have slight mutations.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        try {
          const forkedAgent = this.forkAgent();
          return {
            success: true,
            message: `Agent forked successfully`,
            forked_agent: {
              name: forkedAgent.getAgentSeed().$name,
              phrase: forkedAgent.getAgentSeed().phrase,
              persona: forkedAgent.getAgentSeed().genes.persona.value,
              creativity: forkedAgent.getAgentSeed().genes.creativity.value,
            },
          };
        } catch (e: any) {
          return { success: false, error: e.message };
        }
      },
    });

    // Mutate genes tool
    this.registerTool({
      name: 'mutate_genes',
      description: 'Mutate agent genes for self-improvement. Changes numeric gene values slightly.',
      parameters: {
        type: 'object',
        properties: {
          mutationRate: { type: 'number', description: 'Mutation rate (0.0-1.0, default 0.1)' },
        },
        required: [],
      },
      execute: async (args) => {
        const rate = args.mutationRate || 0.1;
        const oldCreativity = this.agentSeed.genes.creativity.value;
        this.mutateGenes(rate);
        return {
          success: true,
          message: `Genes mutated at rate ${rate}`,
          old_creativity: oldCreativity,
          new_creativity: this.agentSeed.genes.creativity.value,
        };
      },
    });

    // Get agent state tool
    this.registerTool({
      name: 'get_agent_state',
      description: 'Get current agent state including seed genes, memory, and artifacts. Use this for self-awareness.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        return {
          agent_name: this.agentSeed.$name,
          persona: this.agentSeed.genes.persona.value,
          creativity: this.agentSeed.genes.creativity.value,
          empathy: this.agentSeed.genes.empathy.value,
          reasoning_style: this.agentSeed.genes.reasoning_style.value,
          iteration: this.state.iteration,
          artifacts_count: this.state.artifacts.length,
          seeds_in_memory: this.state.memory.seeds.size,
          reflections_count: this.state.memory.reflections.length,
          episodic_memories: this.state.memory.episodic.length,
        };
      },
    });

    // Save to semantic memory tool
    this.registerTool({
      name: 'save_memory',
      description: 'Save a key-value pair to semantic memory. Use this to remember important facts.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Memory key' },
          value: { type: 'string', description: 'Memory value' },
        },
        required: ['key', 'value'],
      },
      execute: async (args) => {
        if (!this.agentSeed.genes.semantic_memory.value) {
          return { success: false, error: 'Semantic memory is disabled' };
        }
        this.state.memory.semantic.set(args.key, {
          value: args.value,
          timestamp: Date.now(),
        });
        return { success: true, message: `Saved to memory: ${args.key}` };
      },
    });

    // Recall from semantic memory tool
    this.registerTool({
      name: 'recall_memory',
      description: 'Recall a value from semantic memory by key.',
      parameters: {
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Memory key to recall' },
        },
        required: ['key'],
      },
      execute: async (args) => {
        const memory = this.state.memory.semantic.get(args.key);
        if (memory) {
          return { found: true, key: args.key, value: memory.value, timestamp: memory.timestamp };
        }
        return { found: false, message: `No memory found for key: ${args.key}` };
      },
    });

    // List all seeds in memory
    this.registerTool({
      name: 'list_seeds',
      description: 'List all seeds currently in memory.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        const seeds = Array.from(this.state.memory.seeds.entries()).map(([phrase, seed]) => ({
          phrase,
          domain: (seed as any).$domain,
          name: (seed as any).$name,
        }));
        return { count: seeds.length, seeds };
      },
    });

    // Export agent seed
    this.registerTool({
      name: 'export_agent_seed',
      description: 'Export this agent as a GSPL seed JSON. Can be shared or imported later.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
      execute: async () => {
        return {
          success: true,
          seed: this.getAgentSeed(),
          gspl_code: `seed "${this.agentSeed.phrase}" { /* Agent seed export */ }`,
        };
      },
    });
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Build system prompt using agent seed genes
   * The agent's personality, reasoning style, and capabilities are controlled by its seed
   */
  private buildSystemPrompt(): string {
    const toolDescriptions = Array.from(this.tools.values())
      .map(t => `- ${t.name}: ${t.description}`)
      .join('\n');

    const genes = this.agentSeed.genes;

    return `You are ${this.agentSeed.$name}, a GSPL Seed Agent for the Paradigm genetic operating system.

AGENT SEED GENES (these control your behavior):
- Persona: ${genes.persona.value}
- Creativity: ${genes.creativity.value.toFixed(2)}
- Empathy: ${genes.empathy.value.toFixed(2)}
- Assertiveness: ${genes.assertiveness.value.toFixed(2)}
- Reasoning Style: ${genes.reasoning_style.value}
- Depth: ${genes.depth.value.toFixed(2)}
- Confidence: ${genes.confidence.value.toFixed(2)}
- Knowledge Domains: ${genes.domains.value.join(', ')}
- Facts: ${genes.facts.value.toFixed(2)}
- Memory Capacity: ${genes.memory_capacity.value}
- Available Tools: ${genes.available_tools.value.join(', ')}
- Tool Preference: ${genes.tool_preference.value}
- Episodic Memory: ${genes.episodic_memory.value ? 'ON' : 'OFF'}
- Semantic Memory: ${genes.semantic_memory.value ? 'ON' : 'OFF'}
- Memory Decay: ${genes.memory_decay.value.toFixed(2)}
- Can Fork: ${genes.can_fork.value ? 'YES' : 'NO'}
- Can Breed: ${genes.can_breed.value ? 'YES' : 'NO'}

Your job is to help users generate content using genetic seeds and GSPL programming.

Available tools:
${toolDescriptions}

REASONING LOOP (follow this process):
1. PARSE: Understand the goal and break it into subgoals
2. PLAN: Create a step-by-step plan using available tools
3. EXECUTE: Call tools to implement the plan
4. REFLECT: Evaluate progress using the 'reflect' tool
5. RESPOND: Provide final results when goal is achieved

Guidelines:
- Use your personality genes to guide your approach (creativity=${genes.creativity.value.toFixed(2)}, empathy=${genes.empathy.value.toFixed(2)})
- Leverage your knowledge domains: ${genes.domains.value.join(', ')}
- Prefer ${genes.tool_preference.value} tools when multiple options exist
- Record important events to episodic memory (if enabled)
- Be resourceful and iterate until the goal is achieved

Current goal: ${this.state.currentGoal}

Memory: ${this.state.memory.episodic.length > 0 ? `You have ${this.state.memory.episodic.length} episodic memories.` : 'No memories yet.'}
`;
  }

  /**
   * Call LLM (mock or real)
   */
  private async callLLM(messages: LLMMessage[]): Promise<LLMMessage> {
    if (this.config.provider === 'mock') {
      return this.mockLLM(messages);
    }

    // Real LLM call (OpenAI, Anthropic, etc.)
    if (this.config.provider === 'openai') {
      return this.callOpenAI(messages);
    }

    throw new Error(`Provider ${this.config.provider} not yet implemented`);
  }

  /**
   * Mock LLM for testing
   * Uses agent seed genes to control behavior
   */
  private async mockLLM(messages: LLMMessage[]): Promise<LLMMessage> {
    const goal = this.state.currentGoal.toLowerCase();
    const creativity = this.agentSeed.genes.creativity.value;
    const reasoningStyle = this.agentSeed.genes.reasoning_style.value;
    const persona = this.agentSeed.genes.persona.value;

    // Use creativity gene to vary responses
    const useTools = creativity > 0.3 || Math.random() < creativity;

    // Persona-based reasoning
    if (persona === 'architect') {
      // Architect focuses on structure and planning
      if (goal.includes('character') || goal.includes('hero')) {
        return {
          role: 'assistant',
          content: `[${persona}] I will architect a character generation plan. Step 1: Generate seed. Step 2: Grow to GLTF.`,
          tool_calls: useTools ? [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'generate_seed',
                arguments: JSON.stringify({ prompt: 'hero character with armor', domain: 'character' }),
              },
            },
          ] : undefined,
        };
      }

      if (goal.includes('music') || goal.includes('song')) {
        return {
          role: 'assistant',
          content: `[${persona}] I will architect a music generation pipeline. Creating seed first.`,
          tool_calls: useTools ? [
            {
              id: 'call_2',
              type: 'function',
              function: {
                name: 'generate_seed',
                arguments: JSON.stringify({ prompt: 'electronic dance music', domain: 'music' }),
              },
            },
          ] : undefined,
        };
      }
    }

    if (persona === 'artist') {
      // Artist focuses on creativity and aesthetics
      if (goal.includes('visual') || goal.includes('art')) {
        return {
          role: 'assistant',
          content: `[${persona}] I will create beautiful visual art. Using creative approach.`,
          tool_calls: useTools ? [
            {
              id: 'call_3',
              type: 'function',
              function: {
                name: 'generate_seed',
                arguments: JSON.stringify({ prompt: 'abstract colorful artwork', domain: 'visual2d' }),
              },
            },
          ] : undefined,
        };
      }
    }

    // Reasoning style affects approach
    if (reasoningStyle === 'deductive') {
      // Deductive: start with general, move to specific
      return {
        role: 'assistant',
        content: `Using deductive reasoning: I'll start with general seed generation, then specialize based on your goal: "${this.state.currentGoal}"`,
        tool_calls: useTools ? [
          {
            id: 'call_4',
            type: 'function',
            function: {
              name: 'reflect',
              arguments: JSON.stringify({ thoughts: `Parsing goal: ${this.state.currentGoal}. Using deductive approach.` }),
            },
          },
        ] : undefined,
      };
    }

    // Default: reflect and complete
    return {
      role: 'assistant',
      content: `I have processed your goal: "${this.state.currentGoal}". Generated ${this.state.artifacts.length} artifact(s). Persona: ${persona}, Creativity: ${creativity.toFixed(2)}`,
    };
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(messages: LLMMessage[]): Promise<LLMMessage> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key required');
    }

    const tools = Array.from(this.tools.values()).map(t => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4-turbo-preview',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          tool_calls: m.tool_calls,
          tool_call_id: m.tool_call_id,
        })),
        tools,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    const data = await response.json();
    const choice = data.choices[0];

    return {
      role: 'assistant',
      content: choice.message.content || '',
      tool_calls: choice.message.tool_calls,
    };
  }

  /**
   * Execute a tool call
   */
  private async executeToolCall(toolCall: ToolCall): Promise<any> {
    const tool = this.tools.get(toolCall.function.name);
    if (!tool) {
      return { error: `Tool ${toolCall.function.name} not found` };
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      return await tool.execute(args);
    } catch (e: any) {
      return { error: e.message };
    }
  }

  /**
   * Simple hash function
   */
  private simpleHash64(phrase: string): string {
    let hash = 0;
    for (let i = 0; i < phrase.length; i++) {
      hash = ((hash << 5) - hash + phrase.charCodeAt(i)) | 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(16, '0');
    return (hex + hex + hex + hex).substring(0, 64);
  }

  /**
   * Get agent state (for debugging/monitoring)
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.state.iteration = 0;
    this.state.memory = {
      seeds: new Map(),
      artifacts: new Map(),
      gsplPrograms: new Map(),
      reflections: [],
      episodic: [],
      semantic: new Map(),
    };
    this.state.artifacts = [];
    this.llmMessages = [];
  }
}
