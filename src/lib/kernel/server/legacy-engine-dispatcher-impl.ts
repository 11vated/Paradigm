/**
 * SERVER-ONLY Legacy Heavy Dispatcher Impl
 * This file contains (or will contain) the full set of static imports for the old 100+ generators.
 * It is ONLY ever loaded from server-side code paths via dynamic import.
 * Client bundles never see this module.
 */

import type { Seed } from '../engine-dispatcher.js'; // now exported after isolation cleanup
import { Xoshiro256StarStar } from '../rng.js';

export type GeneratorFn = (seed: Seed, outputPath: string) => Promise<{ [key: string]: any }>;

// For now we provide an empty map. In a follow-up pass we can move the full 100+
// static imports here. The important thing is that these imports are no longer
// in the client-reachable engine-dispatcher.ts.
// Wire the recently upgraded rich generators (real PNG, WASM+playable, STL, Gerber, SDF) so dispatch/grow always gets rich paths.
import { generateNanobot } from '../generators/nanobot.js';
import { generateDrug } from '../generators/drug.js';
import { generateProceduralV3 } from '../generators/procedural.js';
import { generateCircuitV3 } from '../generators/circuit.js';

export const DOMAIN_MAP: Record<string, GeneratorFn> = {
  nanobot: generateNanobot,
  drug: generateDrug,
  procedural: generateProceduralV3,
  circuit: generateCircuitV3,
};

console.debug('[legacy-engine-dispatcher-impl] Server-only legacy module loaded (heavy generators isolated)');
