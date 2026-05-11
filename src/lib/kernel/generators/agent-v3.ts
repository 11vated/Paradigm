/**
 * Agent Generator V3 — AI Agent Configuration
 * Features: Personality, memory, reasoning, tool use
 * Export: JSON config, conversation logs, behavior trees
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface AgentParams {
  role: 'assistant' | 'companion' | 'expert' | 'creative' | 'analyst';
  personality: Record<string, number>;
  memory: 'short' | 'medium' | 'long' | 'persistent';
  reasoning: 'fast' | 'balanced' | 'deep';
  tools: string[];
}

interface AgentConfig {
  id: string;
  name: string;
  role: string;
  personality: Record<string, number>;
  capabilities: string[];
  constraints: string[];
  memoryConfig: any;
  reasoningConfig: any;
  tools: string[];
}

export async function generateAgentV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  configPath: string;
  logPath: string;
  config: AgentConfig;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'agent-default');
  const params = extractAgentParams(seed, rng);
  
  // Generate agent configuration
  const config = generateAgentConfig(params, rng);
  
  // Generate sample conversations
  const conversations = generateConversations(config, params, rng);
  
  // Generate behavior tree
  const behaviorTree = generateBehaviorTree(config, rng);
  
  // Export
  const jsonPath = await exportAgentJSON({ params, config, behaviorTree }, outputPath, seed);
  const configPath = await exportAgentConfig(config, outputPath, seed);
  const logPath = await exportConversationLogs(conversations, outputPath, seed);
  
  return {
    jsonPath,
    configPath,
    logPath,
    config
  };
}

function extractAgentParams(seed: Seed, rng: Xoshiro256StarStar): AgentParams {
  const roles = ['assistant', 'companion', 'expert', 'creative', 'analyst'] as const;
  const memories = ['short', 'medium', 'long', 'persistent'] as const;
  const reasonings = ['fast', 'balanced', 'deep'] as const;
  const toolList = ['search', 'calculator', 'calendar', 'email', 'code', 'file', 'browser', 'api'];
  
  const numTools = 2 + Math.floor(rng.nextF64() * 4);
  const tools: string[] = [];
  for (let i = 0; i < numTools; i++) {
    const t = toolList[Math.floor(rng.nextF64() * toolList.length)];
    if (!tools.includes(t)) tools.push(t);
  }
  
  return {
    role: roles[Math.floor(rng.nextF64() * roles.length)],
    personality: {
      openness: 0.3 + rng.nextF64() * 0.7,
      conscientiousness: 0.3 + rng.nextF64() * 0.7,
      extraversion: 0.3 + rng.nextF64() * 0.7,
      agreeableness: 0.3 + rng.nextF64() * 0.7,
      neuroticism: rng.nextF64() * 0.5
    },
    memory: memories[Math.floor(rng.nextF64() * memories.length)],
    reasoning: reasonings[Math.floor(rng.nextF64() * reasonings.length)],
    tools
  };
}

function generateAgentConfig(params: AgentParams, rng: Xoshiro256StarStar): AgentConfig {
  const names = ['Aura', 'Nexus', 'Prism', 'Echo', 'Vertex', 'Lumina', 'Cipher', 'Nova'];
  const capabilities = ['conversation', 'analysis', 'creation', 'planning', 'learning'];
  const constraints = ['no-harm', 'honesty', 'privacy', 'transparency', 'consent'];
  
  return {
    id: `agent_${Date.now()}_${Math.floor(rng.nextF64() * 10000)}`,
    name: names[Math.floor(rng.nextF64() * names.length)],
    role: params.role,
    personality: params.personality,
    capabilities: capabilities.slice(0, 2 + Math.floor(rng.nextF64() * 3)),
    constraints: constraints.slice(0, 2 + Math.floor(rng.nextF64() * 3)),
    memoryConfig: {
      type: params.memory,
      capacity: params.memory === 'short' ? 10 : params.memory === 'medium' ? 50 : params.memory === 'long' ? 200 : 1000,
      retention: params.memory === 'persistent' ? 'forever' : 'session'
    },
    reasoningConfig: {
      mode: params.reasoning,
      depth: params.reasoning === 'fast' ? 1 : params.reasoning === 'balanced' ? 3 : 5,
      timeout: params.reasoning === 'fast' ? 1000 : params.reasoning === 'balanced' ? 5000 : 15000
    },
    tools: params.tools
  };
}

function generateConversations(config: AgentConfig, params: AgentParams, rng: Xoshiro256StarStar): any[] {
  const conversations: any[] = [];
  const numConversations = 3 + Math.floor(rng.nextF64() * 3);
  
  const userQueries = [
    'Can you help me with...',
    'What do you think about...',
    'I need assistance with...',
    'Tell me about...',
    'How do I...'
  ];
  
  const topics = ['programming', 'science', 'art', 'philosophy', 'daily life', 'technology'];
  
  for (let c = 0; c < numConversations; c++) {
    const messages: any[] = [];
    const numExchanges = 3 + Math.floor(rng.nextF64() * 5);
    
    for (let e = 0; e < numExchanges; e++) {
      messages.push({
        role: 'user',
        content: `${userQueries[Math.floor(rng.nextF64() * userQueries.length)]} ${topics[Math.floor(rng.nextF64() * topics.length)]}?`,
        timestamp: Date.now() - (numExchanges - e) * 60000
      });
      
      messages.push({
        role: 'assistant',
        content: `Based on my ${config.role} capabilities, I can help you with that. Let me think about this...`,
        timestamp: Date.now() - (numExchanges - e) * 60000 + 1000
      });
    }
    
    conversations.push({
      id: `conv_${c}`,
      messages,
      duration: numExchanges * 60,
      satisfaction: 0.6 + rng.nextF64() * 0.4
    });
  }
  
  return conversations;
}

function generateBehaviorTree(config: AgentConfig, rng: Xoshiro256StarStar): any {
  const nodes = ['sequence', 'selector', 'parallel', 'condition', 'action'];
  const actions = ['listen', 'process', 'reason', 'respond', 'remember', 'learn', 'tool_use'];
  
  const tree: any = { root: { type: 'sequence', name: 'main_loop', children: [] } };
  const numNodes = 4 + Math.floor(rng.nextF64() * 4);
  
  for (let i = 0; i < numNodes; i++) {
    const nodeType = nodes[Math.floor(rng.nextF64() * nodes.length)];
    tree.root.children.push({
      type: nodeType,
      name: nodeType === 'action' ? actions[Math.floor(rng.nextF64() * actions.length)] : `node_${i}`,
      priority: Math.floor(rng.nextF64() * 10),
      conditions: nodeType === 'condition' ? [`is_${['ready', 'busy', 'idle', 'error'][Math.floor(rng.nextF64() * 4)]}`] : []
    });
  }
  
  return tree;
}

async function exportAgentJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `agent_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportAgentConfig(config: AgentConfig, outputPath: string, seed: Seed): Promise<string> {
  const filename = `agent_${seed.$hash || 'unknown'}_config.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
  return filePath;
}

async function exportConversationLogs(conversations: any[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `agent_${seed.$hash || 'unknown'}_logs.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(conversations, null, 2));
  return filePath;
}
