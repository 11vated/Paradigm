import { AGENT_TOOLS } from './tools.js';
import type { AgentTool } from './types.js';

export function createOpenCodeTool(tool: AgentTool) {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const [key, param] of Object.entries(tool.parameters)) {
    properties[key] = {
      type: param.type,
      description: param.description,
    };
    if (param.required) {
      required.push(key);
    }
  }

  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };
}

export function getOpenCodeTools() {
  return Object.values(AGENT_TOOLS).map(createOpenCodeTool);
}

/**
 * Executes a tool called by an OpenCode agent
 * and maps it back to our internal AgentTool inference pipeline.
 */
export async function executeOpenCodeTool(
  name: string,
  args: Record<string, any>,
  context: any
) {
  const toolEntries = Object.entries(AGENT_TOOLS) as [string, AgentTool][];
  for (const [key, tool] of toolEntries) {
    if (tool.name === name) {
      return await tool.execute(args, context);
    }
  }
  throw new Error(`Tool ${name} not found`);
}
