/**
 * AI Agent Tools — Tool-calling interface for Seed LLM
 *
 * Defines tools that the AI agent can call to interact
 * with the Paradigm generative system.
 */

import type { Seed, GeneratorOutput } from './engines';
import { rngFromHash } from './rng';
import { growSeed } from './engines';
import { executeGspl } from './gspl-interpreter';
import { encodeGseed, createGseed, SectionType } from './binary-format';
import { buildC2PAManifest } from './c2pa-manifest';
import type { SeedLLM } from './seed-llm';

/**
 * Tool parameter schema (JSON Schema subset)
 */
export interface ToolParameter {
  type: string;
  enum?: string[];
  description?: string;
  properties?: Record<string, ToolParameter>;
  required?: string[];
}

/**
 * AI Agent Tool definition
 */
export interface AIAgentTool {
  name: string;
  description: string;
  parameters: ToolParameter;
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Tool execution result
 */
export interface ToolResult {
  tool: string;
  params: Record<string, unknown>;
  result: unknown;
  error?: string;
}

/**
 * Create the standard Seed Agent tools
 */
export function createSeedTools(llm: SeedLLM): AIAgentTool[] {
  return [
    {
      name: 'generate_seed',
      description: 'Generate a new seed from a text prompt',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Text description of what to generate' },
          domain: {
            type: 'string',
            enum: ['character', 'music', 'sprite', 'game', 'narrative'],
            description: 'Generator domain',
          },
        },
        required: ['prompt'],
      },
      execute: async (params) => {
        const seed = await llm.generateSeed(params.prompt as string);
        return {
          phrase: seed.phrase,
          hash: seed.hash,
          domain: (seed as Record<string, unknown>).$domain || 'unknown',
        };
      },
    },

    {
      name: 'grow_artifact',
      description: 'Grow a generative artifact from a seed hash',
      parameters: {
        type: 'object',
        properties: {
          seed_hash: { type: 'string', description: 'Seed hash (64 hex chars)' },
          format: {
            type: 'string',
            enum: ['obj', 'wav', 'png', 'gltf'],
            description: 'Output format',
          },
        },
        required: ['seed_hash'],
      },
      execute: async (params) => {
        // Reconstruct seed from hash (mock — in production, load from storage)
        const seed = {
          phrase: `hash:${params.seed_hash}`,
          hash: params.seed_hash,
          rng: rngFromHash(params.seed_hash as string),
        } as Seed;

        const output = await growSeed(seed);
        return {
          type: output.type,
          format: output.format,
          hasData: !!(output.mesh || output.audio || output.sprite),
        };
      },
    },

    {
      name: 'write_gspl',
      description: 'Write a GSPL program for generative design',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Description of what to generate' },
          seed_phrase: { type: 'string', description: 'Optional seed phrase' },
        },
        required: ['description'],
      },
      execute: async (params) => {
        const seedPhrase = (params.seed_phrase as string) || (params.description as string);
        const seed = rngFromHash(seedPhrase);
        const gspl = await llm.generateGSPL(params.description as string, seed);
        return { gspl };
      },
    },

    {
      name: 'execute_gspl',
      description: 'Execute a GSPL program and return the output',
      parameters: {
        type: 'object',
        properties: {
          program: { type: 'string', description: 'GSPL program code' },
        },
        required: ['program'],
      },
      execute: async (params) => {
        const output = await executeGspl(params.program as string);
        return {
          type: output.type,
          format: output.format,
          hasData: !!(output.mesh || output.audio || output.sprite),
        };
      },
    },

    {
      name: 'export_gseed',
      description: 'Export artifact as .gseed with C2PA provenance',
      parameters: {
        type: 'object',
        properties: {
          seed_hash: { type: 'string' },
          author: { type: 'string', description: 'Author name' },
          title: { type: 'string', description: 'Artifact title' },
        },
        required: ['seed_hash'],
      },
      execute: async (params) => {
        // Mock: create .gseed package
        const seed = {
          phrase: `hash:${params.seed_hash}`,
          hash: params.seed_hash,
          rng: rngFromHash(params.seed_hash as string),
        } as Seed;

        const output = await growSeed(seed);
        const gseed = createGseed(seed, 'character-v2', output, {
          author: (params.author as string) || 'Anonymous',
          title: (params.title as string) || 'Generated Artifact',
        });

        // Add C2PA manifest
        const manifest = buildC2PAManifest(seed, 'character-v2');
        gseed.c2paManifest = new TextEncoder().encode(JSON.stringify(manifest));
        gseed.flags.hasC2PA = true;

        const encoded = encodeGseed(gseed);
        return {
          size: encoded.length,
          seedHash: gseed.seedHash,
          hasC2PA: gseed.flags.hasC2PA,
        };
      },
    },

    {
      name: 'refine_seed',
      description: 'Refine a seed based on feedback',
      parameters: {
        type: 'object',
        properties: {
          seed_phrase: { type: 'string' },
          feedback: { type: 'string', description: 'Refinement instructions' },
        },
        required: ['seed_phrase', 'feedback'],
      },
      execute: async (params) => {
        const seed = rngFromHash(params.seed_phrase as string);
        const refined = await llm.refineSeed(
          { phrase: params.seed_phrase, hash: seed.hash, rng: seed } as Seed,
          params.feedback as string
        );
        return {
          original: params.seed_phrase,
          refined: refined.phrase,
          newHash: refined.hash,
        };
      },
    },
  ];
}

/**
 * Execute a tool by name with parameters
 */
export async function executeTool(
  tools: AIAgentTool[],
  toolName: string,
  params: Record<string, unknown>
): Promise<ToolResult> {
  const tool = tools.find(t => t.name === toolName);
  if (!tool) {
    return {
      tool: toolName,
      params,
      result: null,
      error: `Tool '${toolName}' not found`,
    };
  }

  try {
    const result = await tool.execute(params);
    return { tool: toolName, params, result };
  } catch (err) {
    return {
      tool: toolName,
      params,
      result: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Parse tool calls from LLM response (simplified)
 */
export function parseToolCalls(response: string): Array<{ name: string; params: Record<string, unknown> }> {
  // Simplified parser — in production use proper function-calling format
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];

  // Look for tool call patterns like: "call generate_seed with prompt='...'"
  const regex = /call\s+(\w+)\s+with\s+(.+?)(?=\n|$)/g;
  let match;
  while ((match = regex.exec(response)) !== null) {
    const name = match[1];
    const paramsStr = match[2];
    const params: Record<string, unknown> = {};

    // Parse simple key='value' pairs
    const paramRegex = /(\w+)='([^']+)'/g;
    let paramMatch;
    while ((paramMatch = paramRegex.exec(paramsStr)) !== null) {
      params[paramMatch[1]] = paramMatch[2];
    }

    calls.push({ name, params });
  }

  return calls;
}
