/**
 * Agent Generator — produces agent as a GSPL Seed
 * The agent IS a seed with genes for personality, reasoning, knowledge, tools, memory, sovereignty
 * This implements the GSPL-AGENT-ARCHITECTURE.md specification
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { rngFromHash } from '../rng';

interface AgentParams {
  persona: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateAgent(seed: Seed, outputPath: string): Promise<{ filePath: string; configSize: number }> {
  const params = extractParams(seed);
  const rng = rngFromHash(seed.$hash || '');

  // Build agent as a seed with genes (19 gene types matching AgentSeed interface)
  const agentSeed: Seed = {
    ...seed,
    $domain: 'agent',
    genes: {
      // Personality genes (4)
      persona: { type: 'string', value: params.persona },
      creativity: { type: 'float', value: seed.genes?.creativity?.value ?? rng() },
      empathy: { type: 'float', value: seed.genes?.empathy?.value ?? rng() },
      assertiveness: { type: 'float', value: seed.genes?.assertiveness?.value ?? rng() },

      // Reasoning genes (3)
      reasoning_style: { type: 'enum', value: seed.genes?.reasoning_style?.value || ['deductive', 'inductive', 'abductive'][Math.floor(rng() * 3)] },
      depth: { type: 'float', value: seed.genes?.depth?.value ?? 0.5 + rng() * 0.5 },
      confidence: { type: 'float', value: seed.genes?.confidence?.value ?? 0.7 },

      // Knowledge genes (3)
      domains: { type: 'array', value: seed.genes?.domains?.value || ['character', 'music', 'visual2d'] },
      facts: { type: 'float', value: seed.genes?.facts?.value ?? rng() },
      memory_capacity: { type: 'int', value: seed.genes?.memory_capacity?.value || 100 },

      // Tools genes (2)
      available_tools: { type: 'array', value: seed.genes?.available_tools?.value || ['generate_seed', 'execute_gspl', 'grow_seed', 'evolve_population', 'list_domains', 'reflect'] },
      tool_preference: { type: 'string', value: seed.genes?.tool_preference?.value || 'generation' },

      // Memory genes (3)
      episodic_memory: { type: 'bool', value: seed.genes?.episodic_memory?.value ?? true },
      semantic_memory: { type: 'bool', value: seed.genes?.semantic_memory?.value ?? true },
      memory_decay: { type: 'float', value: seed.genes?.memory_decay?.value ?? 0.1 },

      // Sovereignty genes (4)
      can_fork: { type: 'bool', value: true },
      can_breed: { type: 'bool', value: true },
      signature: { type: 'string', value: seed.$provenance?.signature || '' },
      ownership: { type: 'string', value: seed.$provenance?.signer || '' },
    },
  };

  // Generate agent configuration
  const config = {
    seed: agentSeed,
    name: seed.$name ?? 'Agent',
    genes: agentSeed.genes,
    systemPrompt: generateSystemPrompt(params, agentSeed.genes),
    tools: (agentSeed.genes.available_tools as any).value,
    quality: params.quality,
  };

  // Write agent seed as JSON
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.gltf$/, '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write system prompt
  const promptPath = outputPath.replace(/\.gltf$/, '_prompt.txt');
  fs.writeFileSync(promptPath, config.systemPrompt);

  return { filePath: jsonPath, configSize: JSON.stringify(config).length };
}

function generateSystemPrompt(params: AgentParams, genes: any): string {
  const persona = params.persona;
  const creativity = genes.creativity?.value || 0.5;
  const empathy = genes.empathy?.value || 0.5;
  const reasoningStyle = genes.reasoning_style?.value || 'deductive';

  const traits: Record<string, string> = {
    architect: 'You approach problems systematically, designing structured solutions.',
    artist: 'You embrace creativity and expressiveness in all tasks.',
    critic: 'You evaluate rigorously and point out weaknesses.',
    explorer: 'You prioritize novelty and exploration of new ideas.',
    composer: 'You excel at combining multiple domains creatively.',
    analyst: 'You are precise and data-driven in your approach.'
  };

  return `You are ${persona}, a Paradigm GSPL Agent Seed.

PERSONALITY GENES:
- Persona: ${persona}
- Creativity: ${creativity.toFixed(2)}
- Empathy: ${empathy.toFixed(2)}

REASONING GENES:
- Style: ${reasoningStyle}
- Depth: ${genes.depth?.value || 0.5}
- Confidence: ${genes.confidence?.value || 0.7}

KNOWLEDGE GENES:
- Domains: ${(genes.domains?.value || []).join(', ')}
- Facts: ${genes.facts?.value || 0.5}
- Memory Capacity: ${genes.memory_capacity?.value || 100}

TOOLS GENES:
- Available Tools: ${(genes.available_tools?.value || []).join(', ')}
- Tool Preference: ${genes.tool_preference?.value || 'generation'}

MEMORY GENES:
- Episodic Memory: ${genes.episodic_memory?.value ? 'ON' : 'OFF'}
- Semantic Memory: ${genes.semantic_memory?.value ? 'ON' : 'OFF'}
- Memory Decay: ${genes.memory_decay?.value || 0.1}

SOVEREIGNTY GENES:
- Can Fork: ${genes.can_fork?.value ? 'YES' : 'NO'}
- Can Breed: ${genes.can_breed?.value ? 'YES' : 'NO'}

TRAIT: ${traits[persona] || traits.architect}

You are a seed that can grow, breed, and evolve. Use your genes to guide your behavior.`;
}

function extractParams(seed: Seed): AgentParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    persona: seed.genes?.persona?.value || 'architect',
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
