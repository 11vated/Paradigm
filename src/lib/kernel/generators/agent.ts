/**
 * Agent Generator — produces agent configuration
 * Generates agent setup files (system prompt, config)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface AgentParams {
  persona: string;
  temperature: number;
  maxSteps: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateAgent(seed: Seed, outputPath: string): Promise<{ filePath: string; configSize: number }> {
  const params = extractParams(seed);

  // Generate agent configuration
  const config = {
    name: seed.$name ?? 'Agent',
    persona: params.persona,
    temperature: params.temperature,
    maxSteps: params.maxSteps,
    systemPrompt: generateSystemPrompt(params),
    tools: ['web_browse', 'file_write', 'fork_agent', 'delegate'],
    geneWeights: generateGeneWeights(),
    domainWeights: generateDomainWeights(),
    quality: params.quality
  };

  // Write JSON config
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.gltf$/, '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write system prompt as separate file
  const promptPath = outputPath.replace(/\.gltf$/, '_prompt.txt');
  fs.writeFileSync(promptPath, config.systemPrompt);

  return { filePath: jsonPath, configSize: JSON.stringify(config).length };
}

function generateSystemPrompt(params: AgentParams): string {
  const traits: Record<string, string> = {
    architect: 'You approach problems systematically, designing structured solutions.',
    artist: 'You embrace creativity and expressiveness in all tasks.',
    critic: 'You evaluate rigorously and point out weaknesses.',
    explorer: 'You prioritize novelty and exploration of new ideas.',
    composer: 'You excel at combining multiple domains creatively.',
    analyst: 'You are precise and data-driven in your approach.'
  };

  return `You are ${params.persona}, a Paradigm GSPL agent.
${traits[params.persona] || traits.architect}
Temperature: ${params.temperature.toFixed(2)} | Max Steps: ${params.maxSteps}
You have access to 27 creative domains and 17 gene types.`;
}

function generateGeneWeights(): Record<string, number> {
  const genes = ['float', 'int', 'color', 'string', 'bool', 'enum', 'range', 'vector', 'curve', 'noise', 'seed_ref', 'array', 'object', 'function', 'union', 'tuple', 'any'];
  const weights: Record<string, number> = {};
  genes.forEach((g, i) => weights[g] = 1 / genes.length);
  return weights;
}

function generateDomainWeights(): Record<string, number> {
  const domains = ['character', 'sprite', 'music', 'visual2d', 'geometry3d', 'fullgame', 'animation', 'narrative', 'ui', 'physics', 'audio', 'ecosystem', 'game', 'alife', 'shader', 'particle', 'typography', 'architecture', 'vehicle', 'furniture', 'fashion', 'robotics', 'circuit', 'food', 'choreography', 'agent'];
  const weights: Record<string, number> = {};
  domains.forEach(d => weights[d] = 1 / domains.length);
  return weights;
}

function extractParams(seed: Seed): AgentParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    persona: seed.genes?.persona?.value || 'architect',
    temperature: seed.genes?.temperature?.value || 0.7,
    maxSteps: seed.genes?.maxSteps?.value || 10,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
