/**
 * Tool Layer — public barrel.
 *
 * The sub-agent tool-use surface for the Sovereign Agent. Air-gap by
 * default; network and filesystem tools are explicit opt-in.
 */

export * from './types';
export { StandardToolHarness, type HarnessOptions } from './harness';
export {
  BUILTIN_TOOLS,
  archetypeLookupTool,
  resonanceScoreTool,
  harmonicScoreTool,
  geneDiffTool,
  nameGeneratorTool,
  paletteGenTool,
  signatureForTool,
  kernelNowTool,
  makeWorldLookupTool,
} from './built-in';

import { StandardToolHarness, type HarnessOptions } from './harness';
import { BUILTIN_TOOLS, makeWorldLookupTool } from './built-in';
import type { MemoryOrchestrator } from '../memory/types';

/** Convenience: build a harness with all built-ins + world_lookup pre-registered. */
export function createStandardHarness(memory: MemoryOrchestrator, opts: HarnessOptions = {}): StandardToolHarness {
  const harness = new StandardToolHarness(opts);
  for (const t of BUILTIN_TOOLS) harness.registry.register(t);
  harness.registry.register(makeWorldLookupTool(memory));
  return harness;
}
