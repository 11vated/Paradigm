/**
 * Engine: mind
 *
 * Phase 0 scaffolding. See `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part III for the substrate role of this engine and the migration plan from
 * existing `generators/` modules.
 *
 * Status: contract surface only. Adapters to existing generators land in Phase 1.
 */
import type { Engine, EngineCapability } from './types';

export const capability: EngineCapability = {
  id: 'mind',
  name: 'Mind Engine',
  version: '0.1.0',
  outputs: [],
  composesWith: [],
};

// Engine implementations will be migrated in Phase 1 per the doctrine.
// Until then, this surface advertises the contract; do not import from here in
// production code paths yet — keep using `src/lib/kernel/generators/` directly.
export type MindEngine = Engine<unknown, unknown>;
