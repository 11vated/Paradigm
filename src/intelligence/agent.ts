import { UniversalSeed } from '../seeds';
import { Interpreter } from '../gspl';

export interface AgentConfig {
  name: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  contextWindow?: number;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AgentContext {
  messages: AgentMessage[];
  seeds: UniversalSeed[];
  workingDirectory?: string;
}

export class GSPLAgent {
  private config: AgentConfig;
  private context: AgentContext;
  private interpreter: Interpreter;
  private sessionId: string;
  private state: Map<string, unknown> = new Map();

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
      name: config.name ?? 'GSPL-Agent',
      model: config.model ?? 'gpt-4',
      maxTokens: config.maxTokens ?? 4096,
      temperature: config.temperature ?? 0.7,
      contextWindow: config.contextWindow ?? 8192
    };
    this.interpreter = new Interpreter();
    this.sessionId = crypto.randomUUID();
    this.context = {
      messages: [{
        role: 'system',
        content: this.getSystemPrompt(),
        timestamp: Date.now()
      }],
      seeds: []
    };
  }

  private getSystemPrompt(): string {
    return `You are ${this.config.name}, an intelligent agent for the Paradigm GSPL Platform.

You can:
1. Create and manipulate seeds using GSPL code
2. Breed, mutate, and evolve seeds
3. Execute genetic algorithms
4. Work with 17 gene types: structure, color, shape, motion, audio, texture, pattern, behavior, interaction, physics, material, lighting, environment, animation, logic, data, meta

Available functions:
- seed(name, config) - create a new seed
- gene(type, value) - create a gene
- breed(parentA, parentB) - breed two seeds
- mutate(seed, intensity) - mutate a seed
- evolve(population, fitnessFn) - evolve population
- eval(code) - execute GSPL code

Always explain your reasoning and show code before execution.`;
  }

  async process(userInput: string): Promise<string> {
    this.context.messages.push({
      role: 'user',
      content: userInput,
      timestamp: Date.now()
    });

    const response = await this.reason(userInput);

    this.context.messages.push({
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    });

    return response;
  }

  private async reason(input: string): Promise<string> {
    const code = this.extractGSPLCode(input);
    if (code) {
      try {
        const result = this.interpreter.execute(code);
        return `Executed GSPL code:\n\`\`\`\n${code}\n\`\`\`\nResult: ${JSON.stringify(result, null, 2)}`;
      } catch (error) {
        return `Error: ${error}`;
      }
    }

    const seedOps = this.detectSeedOperations(input);
    if (seedOps.length > 0) {
      return this.executeSeedOperations(seedOps, input);
    }

    return this.generateResponse(input);
  }

  private extractGSPLCode(input: string): string | null {
    const codeBlockMatch = input.match(/```(?:gspl|javascript)?\n([\s\S]*?)\n```/);
    if (codeBlockMatch) return codeBlockMatch[1];

    const lines = input.split('\n');
    if (lines.some(l => l.includes('seed(') || l.includes('breed(') || l.includes('mutate('))) {
      return lines.filter(l => !l.startsWith('//') && !l.startsWith('#')).join('\n');
    }

    return null;
  }

  private detectSeedOperations(input: string): string[] {
    const operations: string[] = [];
    const keywords = ['create', 'breed', 'mutate', 'evolve', 'combine', 'cross', 'modify', 'generate'];

    for (const keyword of keywords) {
      if (input.toLowerCase().includes(keyword)) {
        operations.push(keyword);
      }
    }

    return operations;
  }

  private executeSeedOperations(operations: string[], input: string): string {
    const hasSeed = input.toLowerCase().includes('seed');
    const hasCreate = operations.includes('create');

    if (hasSeed && hasCreate) {
      const seedCode = `
        let newSeed = seed("generated-${Date.now()}", {
          color: ["#ff0000", "#00ff00", "#0000ff"],
          motion: { velocity: 0.5 }
        });
        print("Created seed:", newSeed.name);
      `;
      try {
        this.interpreter.execute(seedCode);
        return `Created a new seed with color palette and motion configuration.`;
      } catch (e) {
        return `Error creating seed: ${e}`;
      }
    }

    if (operations.includes('breed') || operations.includes('cross')) {
      return `To breed seeds, use: breed(parentA, parentB) in GSPL code.`;
    }

    if (operations.includes('mutate') || operations.includes('modify')) {
      return `To mutate a seed, use: mutate(seed, intensity) where intensity is 0-1.`;
    }

    return `Detected operations: ${operations.join(', ')}. Use GSPL code for more control.`;
  }

  private generateResponse(input: string): string {
    const inputLower = input.toLowerCase();

    if (inputLower.includes('hello') || inputLower.includes('hi')) {
      return `Hello! I'm ${this.config.name}, here to help you work with genetic seed programming.`;
    }

    if (inputLower.includes('what can you do')) {
      return `I can help you with:
1. Creating seeds with custom genes
2. Breeding and mutating seeds
3. Running genetic algorithms (GA, MAP-Elites, CMA-ES)
4. Executing GSPL code
5. Working with the 26 domain engines`;
    }

    if (inputLower.includes('help')) {
      return `Available commands:
- seed(name, config) - Create seed
- gene(type, value) - Create gene
- breed(a, b) - Cross two seeds
- mutate(s, intensity) - Mutate seed
- eval(code) - Execute GSPL`;
    }

    return `I understand you want to: "${input}". I can help with that using GSPL code. What specific operations would you like to perform?`;
  }

  addSeed(seed: UniversalSeed): void {
    this.context.seeds.push(seed);
  }

  getSeeds(): UniversalSeed[] {
    return [...this.context.seeds];
  }

  getMessages(): AgentMessage[] {
    return [...this.context.messages];
  }

  getSessionId(): string {
    return this.sessionId;
  }

  setState(key: string, value: unknown): void {
    this.state.set(key, value);
  }

  getState(key: string): unknown {
    return this.state.get(key);
  }

  clearContext(): void {
    this.context.messages = [{
      role: 'system',
      content: this.getSystemPrompt(),
      timestamp: Date.now()
    }];
    this.context.seeds = [];
    this.state.clear();
  }
}