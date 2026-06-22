/**
 * Paradigm Substrate — The Nine Engines
 *
 * Per `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`:
 * the 282 generators collapse into 9 substrate engines. Every domain is a typed
 * recipe composing engines. Engines own the rendering algorithms; domains own
 * the genome semantics. This is the doctrinal layer — additive on top of the
 * existing `generators/` tree during Phase 0, with progressive migration.
 *
 * The Nine:
 *   form    — geometry, mesh, topology, surface, volume
 *   motion  — kinematics, dynamics, simulation, integration, constraints
 *   sound   — synthesis, DSP, spatialization, mixing
 *   world  — terrain, atmosphere, ecosystem, weather, time-of-day
 *   mind    — agents, behavior, decision, learning, dialogue
 *   play    — game loops, mechanics, balance, progression, win-conditions
 *   story   — narrative, scene, structure, dialogue, arc
 *   matter  — chemistry, biology, materials, molecules, drugs
 *   field   — EM/quantum/gauge fields, the Unseen Renderer
 */
export * as form   from './form';
export * as motion from './motion';
export * as sound  from './sound';
export * as world  from './world';
export * as mind   from './mind';
export * as play   from './play';
export * as story  from './story';
export * as matter from './matter';
export * as field  from './field';

export type { Engine, EngineCapability, EngineContract } from './types';
