import { createOpencodeClient } from '@opencode-ai/sdk';
import type { Message, Session } from '@opencode-ai/sdk';
import { useSeedStore } from '@/stores/seedStore';

/**
 * ParadigmAgent powered by OpenCode AI.
 * This replaces the regex-based agent (agent.ts) with a real LLM agent
 * that can understand natural language and execute GSPL code via the interpreter.
 */
export interface ParadigmAgentConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AgentResponse {
  message: string;
  intent?: string;
  data?: unknown;
  sessionId?: string;
}

export class ParadigmOpenCodeAgent {
  private client: ReturnType<typeof createOpencodeClient> | null = null;
  private session: Session | null = null;
  private config: Required<ParadigmAgentConfig>;
  private store = useSeedStore;

  constructor(config: ParadigmAgentConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl ?? 'http://localhost:4096',
      model: config.model ?? 'anthropic/claude-3-5-sonnet-20241022',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 4096,
    };
  }

  /**
   * Initialize the OpenCode client and create a session.
   * Must be called before `process`.
   */
  async initialize(): Promise<void> {
    if (this.client) return;

    this.client = createOpencodeClient({
      baseUrl: this.config.baseUrl,
    });

    // Create a new session
    const response = await this.client.session.create({
      body: {
        title: 'Paradigm Agent Session',
      },
    });

    this.session = response.data as unknown as Session;
  }

  /**
   * Process a user query through OpenCode.
   * Returns a structured response with message, intent, and optional data.
   */
  async process(userInput: string): Promise<AgentResponse> {
    if (!this.client || !this.session) {
      await this.initialize();
    }

    const sessionId = this.session!.id;

    try {
      // Send the prompt to OpenCode via the session.prompt() API
      const response = await this.client!.session.prompt({
        path: { id: sessionId },
        body: {
          parts: [
            { type: 'text', text: this.buildPrompt(userInput) },
          ],
        },
      });

      // The response contains the assistant message
      const messageData = response.data as any;
      const content = this.extractTextContent(messageData);

      // Parse the response for structured data
      const parsed = this.parseResponse(content);

      return {
        message: parsed.message,
        intent: parsed.intent,
        data: parsed.data,
        sessionId,
      };
    } catch (error) {
      console.error('OpenCode agent error:', error);
      return {
        message: `Agent error: ${error instanceof Error ? error.message : String(error)}`,
        intent: 'error',
      };
    }
  }

  /**
   * Build a system prompt that explains Paradigm GSPL to the LLM.
   */
  private buildPrompt(userInput: string): string {
    const context = this.buildContext();
    return `${this.getSystemPrompt()}

${context}

User: ${userInput}`;
  }

  private getSystemPrompt(): string {
    return `You are the Paradigm GSPL Agent — an expert in genetic seed programming.

You help users create, breed, mutate, and evolve digital artifacts using the GSPL (Genetic Seed Programming Language).

CORE CONCEPTS:
- UniversalSeed: A JSON structure encoding any creative artifact (character, music, vehicle, etc.)
- 17 Gene Types: scalar, categorical, struct, vector, map, weighted_graph, timeline, quantum, gematria, etc.
- 27 Domain Engines: character, sprite, music, fullgame, animation, ecosystem, etc.
- Operations: seed(), breed(), mutate(), evolve(), compose(), grow()

GSPL SYNTAX EXAMPLES:

1. Create a seed:
   seed "Fire Mage" in character {
     size: 1.2
     archetype: "mage"
     magic_affinity: 0.9
   }

2. Mutate a seed:
   let variant = mutate(hero, rate: 0.15)

3. Breed two seeds:
   let child = breed(hero, villain)

4. Compose across domains:
   let sprite_form = compose(hero, to: "sprite")
   let theme = compose(hero, to: "music")

5. Evolve a population:
   let pop = [seed1, seed2, seed3, seed4, seed5]
   let evolved = evolve(pop, fitnessFn: fn(s) => s.genes.strength?.value || 0)

INSTRUCTIONS:
- Always write valid GSPL code
- Explain your reasoning before showing code
- Use the \`grow()\` function to materialize artifacts
- When creating seeds, always specify the domain (character, music, sprite, etc.)
- You can execute GSPL code directly — the interpreter is wired to the kernel

Current store state: {{SEED_COUNT}} seeds available.
`;
  }

  private buildContext(): string {
    const state = this.store.getState();
    const seedCount = state.gallery?.length ?? 0;
    const currentSeed = state.currentSeed;

    let context = `Context: ${seedCount} seeds in gallery.`;

    if (currentSeed) {
      context += `
Current seed: ${currentSeed.$name} (${currentSeed.$domain}, Gen ${currentSeed.$lineage?.generation || 0})`;
      const geneCount = Object.keys(currentSeed.genes || {}).length;
      context += `\nGenes: ${geneCount} defined.`;
    }

    return context.replace('{{SEED_COUNT}}', String(seedCount));
  }

    private extractTextContent(responseData: any): string {
    // The session.prompt() response has structure: { info: Message, parts: Part[] }
    if (!responseData) return '';

    // If it's the full response with parts
    if (responseData.parts && Array.isArray(responseData.parts)) {
      return responseData.parts
        .filter((part: any) => part.type === 'text')
        .map((part: any) => part.text || '')
        .join('');
    }

    // If it's just a string
    if (typeof responseData === 'string') return responseData;

    return '';
  }

  private parseResponse(content: string): { message: string; intent?: string; data?: unknown } {
    // Try to extract GSPL code blocks
    const codeMatch = content.match(/```(?:gspl)?\n([\s\S]*?)\n```/);
    const hasCode = codeMatch || content.includes('seed(') || content.includes('breed(');

    let intent: string | undefined;
    let data: unknown;

    if (hasCode) {
      intent = 'gspl_code';
      // The actual execution happens in the GSPLEditor or AgentPanel
      // when they call the interpreter
    }

    if (content.toLowerCase().includes('error')) {
      intent = 'error';
    } else if (content.toLowerCase().includes('create') || content.toLowerCase().includes('generate')) {
      intent = 'create_seed';
    } else if (content.toLowerCase().includes('breed') || content.toLowerCase().includes('cross')) {
      intent = 'breed_seeds';
    } else if (content.toLowerCase().includes('mutate') || content.toLowerCase().includes('modify')) {
      intent = 'mutate_seed';
    } else if (content.toLowerCase().includes('evolve')) {
      intent = 'evolve_population';
    } else if (content.toLowerCase().includes('compose') || content.toLowerCase().includes('convert')) {
      intent = 'compose_domain';
    }

    return { message: content, intent, data };
  }

  /**
   * Get the current session ID.
   */
  getSessionId(): string | null {
    return this.session?.id ?? null;
  }

  /**
   * Get all messages in the current session.
   */
  async getMessages(): Promise<any[]> {
    if (!this.client || !this.session) return [];

    try {
      const response = await this.client.session.messages({
        path: { id: this.session.id },
      });
      // Returns { info: Message, parts: Part[] }[]
      const data = response.data as any[];
      return data || [];
    } catch {
      return [];
    }
  }

  /**
   * Clear the session (create a new one).
   */
  async clearContext(): Promise<void> {
    if (this.client && this.session) {
      try {
        await this.client.session.delete({
          path: { id: this.session.id },
        });
      } catch {
        // Ignore errors on cleanup
      }
    }

    this.session = null;
    await this.initialize();
  }
}

/**
 * Create a singleton instance for use throughout the app.
 * Users can create multiple agents if needed.
 */
let agentInstance: ParadigmOpenCodeAgent | null = null;

export function getParadigmAgent(config?: ParadigmAgentConfig): ParadigmOpenCodeAgent {
  if (!agentInstance) {
    agentInstance = new ParadigmOpenCodeAgent(config);
  }
  return agentInstance;
}

export function createParadigmAgent(config?: ParadigmAgentConfig): ParadigmOpenCodeAgent {
  return new ParadigmOpenCodeAgent(config);
}
