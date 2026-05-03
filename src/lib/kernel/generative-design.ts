/**
 * Generative Design Workflow — Orchestrates multi-step generative processes
 *
 * Enables complex workflows like:
 * - Natural language → seed → artifact → export
 * - Iterative refinement
 * - Batch generation
 */

import type { Seed, GeneratorOutput } from '../engines';
import type { SeedLLM } from './seed-llm';
import type { AIAgentTool } from './ai-agent';
import { createSeedTools, executeTool } from './ai-agent';
import { growSeed } from '../engines';
import { executeGspl } from './gspl-interpreter';
import { encodeGseed, createGseed } from './binary-format';
import { buildC2PAManifest } from './c2pa-manifest';

/**
 * Workflow step result
 */
export interface WorkflowStep {
  step: string;
  input?: unknown;
  output?: unknown;
  error?: string;
}

/**
 * Workflow execution context
 */
export interface WorkflowContext {
  llm: SeedLLM;
  tools: AIAgentTool[];
  seed?: Seed;
  output?: GeneratorOutput;
  gspl?: string;
  gseed?: Uint8Array;
  history: WorkflowStep[];
}

/**
 * Execute the "Natural Language → Artifact" workflow
 */
export async function workflowNaturalLanguageToArtifact(
  context: WorkflowContext,
  prompt: string
): Promise<WorkflowContext> {
  const { llm, tools } = context;

  // Step 1: Generate seed
  context.history.push({ step: 'generate_seed', input: prompt });
  try {
    const seedResult = await executeTool(tools, 'generate_seed', { prompt });
    if (seedResult.error) throw new Error(seedResult.error);

    const seedData = seedResult.result as { phrase: string; hash: string };
    context.seed = {
      phrase: seedData.phrase,
      hash: seedData.hash,
      rng: null as any, // Will be set below
    } as Seed;

    // Reconstruct RNG from phrase
    const { rngFromHash } = await import('./rng');
    context.seed.rng = rngFromHash(context.seed.phrase);

    context.history[context.history.length - 1].output = seedData;
  } catch (err) {
    context.history[context.history.length - 1].error = String(err);
    return context;
  }

  // Step 2: Generate GSPL program
  context.history.push({ step: 'write_gspl', input: prompt });
  try {
    const gsplResult = await executeTool(tools, 'write_gspl', {
      description: prompt,
      seed_phrase: context.seed.phrase,
    });
    if (gsplResult.error) throw new Error(gsplResult.error);

    context.gspl = (gsplResult.result as { gspl: string }).gspl;
    context.history[context.history.length - 1].output = { gspl: context.gspl };
  } catch (err) {
    context.history[context.history.length - 1].error = String(err);
    return context;
  }

  // Step 3: Execute GSPL
  context.history.push({ step: 'execute_gspl', input: context.gspl });
  try {
    context.output = await executeGspl(context.gspl!);
    context.history[context.history.length - 1].output = {
      type: context.output.type,
      format: context.output.format,
    };
  } catch (err) {
    context.history[context.history.length - 1].error = String(err);
    return context;
  }

  // Step 4: Export as .gseed
  context.history.push({ step: 'export_gseed', input: context.seed.hash });
  try {
    const exportResult = await executeTool(tools, 'export_gseed', {
      seed_hash: context.seed.hash,
      title: prompt.slice(0, 50),
    });
    if (exportResult.error) throw new Error(exportResult.error);

    context.history[context.history.length - 1].output = exportResult.result;
  } catch (err) {
    context.history[context.history.length - 1].error = String(err);
  }

  return context;
}

/**
 * Execute the "Iterative Refinement" workflow
 */
export async function workflowIterativeRefinement(
  context: WorkflowContext,
  feedback: string
): Promise<WorkflowContext> {
  if (!context.seed) {
    throw new Error('No seed to refine');
  }

  context.history.push({ step: 'refine_seed', input: feedback });

  try {
    const refineResult = await executeTool(context.tools, 'refine_seed', {
      seed_phrase: context.seed.phrase,
      feedback,
    });

    if (refineResult.error) throw new Error(refineResult.error);

    const refinedData = refineResult.result as { refined: string; newHash: string };
    context.seed = {
      phrase: refinedData.refined,
      hash: refinedData.newHash,
      rng: null as any,
    } as Seed;

    // Reconstruct RNG
    const { rngFromHash } = await import('./rng');
    context.seed.rng = rngFromHash(context.seed.phrase);

    context.history[context.history.length - 1].output = refinedData;

    // Regenerate artifact
    context.output = await growSeed(context.seed);
  } catch (err) {
    context.history[context.history.length - 1].error = String(err);
  }

  return context;
}

/**
 * Execute the "Batch Generation" workflow
 */
export async function workflowBatchGeneration(
  context: WorkflowContext,
  count: number
): Promise<Seed[]> {
  if (!context.llm) {
    throw new Error('No LLM provided');
  }

  const variations = await context.llm.generateVariations(context.seed!, count);
  return variations;
}

/**
 * Create a new workflow context
 */
export function createWorkflowContext(llm: SeedLLM): WorkflowContext {
  const tools = createSeedTools(llm);
  return {
    llm,
    tools,
    history: [],
  };
}

/**
 * Print workflow history
 */
export function printWorkflowHistory(context: WorkflowContext): void {
  console.log('\n=== WORKFLOW HISTORY ===');
  context.history.forEach((step, i) => {
    const status = step.error ? '✗' : '✓';
    console.log(`${i + 1}. [${status}] ${step.step}`);
    if (step.error) {
      console.log(`   Error: ${step.error}`);
    }
  });
}
