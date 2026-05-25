/**
 * Multiverse Director — doctrinal headline composer.
 *
 * Takes a single prompt and grows a complete universe by composing the
 * nine substrate engines deterministically.
 *
 * Per the doctrine, a Director does NOT generate a game; it generates a
 * *universe* whose physics, matter, world, and mind cohere, then evolves
 * games (play) within that universe so every game inherits canonical reality.
 *
 * Phase 2 scaffold cut: deterministic prompt → universe-plan resolver over
 * the 9 engines. The plan is a directed graph of engine invocations + their
 * seed lineages; executing the plan produces a UniverseManifest whose every
 * artifact is bit-reproducible from the root prompt.
 *
 * Subsequent phases will add: LLM-backed prompt parser (Stage-1 of the
 * Sovereign Agent), MAP-Elites over the plan space, the Inverse Substrate
 * ingest, and the Civilizational Layer (persistent shared universes).
 *
 * Doctrine: `Documents/Paradigm-Analysis/12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md`
 * Part IV (Multiverse Director).
 */
import { Xoshiro256StarStar } from '../kernel/rng';
import { ENGINES, ENGINE_IDS, type EngineId } from './index';
import type { Seed } from '../kernel/engines';

/**
 * UniversePlan = directed graph of engine invocations whose seed lineage is
 * fully derived from the root prompt. Executing the plan yields a manifest
 * of artifacts; replaying the plan from the same prompt yields identical
 * artifact paths and hashes.
 */
export interface UniversePlanNode {
  /** Stable id within the plan, e.g. "world:0", "matter:1". */
  id: string;
  /** Which engine renders this node. */
  engine: EngineId;
  /** Which kind within that engine. Free-form; the engine validates. */
  kind: string;
  /** Stable child-seed hash derived from prompt + node id (Xoshiro256**). */
  seedHash: string;
  /** Ids of nodes whose artifacts inform this one (composition edges). */
  dependsOn: string[];
  /** Free-form parameter hints surfaced to the engine. */
  hints: Record<string, unknown>;
}

export interface UniversePlan {
  /** The original prompt that grew this plan. */
  prompt: string;
  /** Root universe seed hash. */
  rootSeedHash: string;
  /** The directed graph of engine invocations. */
  nodes: UniversePlanNode[];
  /** Plan version — bumped if the deterministic resolver changes. */
  version: '0.1.0';
}

/**
 * Genre archetypes the scaffold resolver can classify a prompt into.
 * Each archetype determines which engines are scheduled and in what order.
 */
export type UniverseArchetype =
  | 'sci-fi-hard'
  | 'sci-fi-soft'
  | 'fantasy-high'
  | 'fantasy-low'
  | 'modern'
  | 'historical'
  | 'cosmic-horror'
  | 'reality-em'
  | 'reality-quantum'
  | 'reality-cosmic'
  | 'matter-drug'
  | 'matter-material'
  | 'matter-protein'
  | 'abstract';

/**
 * Hash a string with Xoshiro256** seeded by the prompt + a salt. Deterministic.
 * Returns a 32-char hex hash suitable for use as a child seed `$hash`.
 */
function deriveSeedHash(prompt: string, salt: string): string {
  const rng = new Xoshiro256StarStar(prompt + '::' + salt);
  // 4 × 64-bit draws → 32 hex chars
  let out = '';
  for (let i = 0; i < 4; i++) {
    const n = rng.nextU64();
    out += n.toString(16).padStart(16, '0').slice(0, 8);
  }
  return out;
}

/**
 * Deterministic archetype classifier. Keyword-based; Phase 3 swaps in the
 * LLM Stage-1 parser. Returns the same archetype for the same prompt forever.
 */
export function classifyArchetype(prompt: string): UniverseArchetype {
  const p = prompt.toLowerCase();
  const hits = (words: string[]) => words.some((w) => p.includes(w));
  // Reality archetypes — checked first since physics keywords overlap with sci-fi.
  if (hits(['wavefunction', 'schr', 'hilbert', 'qubit', 'superposition', 'eigenstate'])) return 'reality-quantum';
  if (hits(['cosmolog', 'gravitational lens', 'lensing', 'dark matter', 'dark energy', 'redshift', 'curvature'])) return 'reality-cosmic';
  if (hits(['magnetar', 'em field', 'radio jet', 'microwave', 'infrared', 'ultraviolet', 'x-ray', 'gamma ray', 'plasma'])) return 'reality-em';
  if (hits(['drug', 'pharmaceut', 'molecule', 'compound', 'medicine', 'ligand', 'inhibitor', 'antibiotic'])) return 'matter-drug';
  if (hits(['material', 'alloy', 'polymer', 'composite', 'metamaterial', 'graphene', 'superconductor', 'semiconductor'])) return 'matter-material';
  if (hits(['protein', 'enzyme', 'antibody', 'peptide', 'amino acid', 'folding'])) return 'matter-protein';
  if (hits(['space', 'starship', 'orbital', 'alien', 'quantum', 'nanotech'])) return 'sci-fi-hard';
  if (hits(['cyber', 'neon', 'mech', 'android', 'dystop'])) return 'sci-fi-soft';
  if (hits(['dragon', 'wizard', 'magic', 'sword', 'rune', 'enchant'])) return 'fantasy-high';
  if (hits(['village', 'tavern', 'hedge', 'witch', 'folk'])) return 'fantasy-low';
  if (hits(['city', 'office', 'phone', 'subway', 'modern'])) return 'modern';
  if (hits(['ancient', 'roman', 'medieval', 'samurai', 'colonial'])) return 'historical';
  if (hits(['eldritch', 'lovecraft', 'void', 'unknowable', 'beyond'])) return 'cosmic-horror';
  return 'abstract';
}

/**
 * Schedule template for each archetype: which engines fire, in what order,
 * with which composition edges. The Director composes these into a plan.
 */
const SCHEDULES: Record<UniverseArchetype, Array<{ engine: EngineId; kind: string; deps?: string[] }>> = {
  'sci-fi-hard': [
    { engine: 'world', kind: 'world' },
    { engine: 'field', kind: 'electromagnetic', deps: ['world:0'] },
    { engine: 'matter', kind: 'material', deps: ['field:1'] },
    { engine: 'form', kind: 'character', deps: ['matter:2'] },
    { engine: 'mind', kind: 'agent', deps: ['form:3'] },
    { engine: 'sound', kind: 'acoustics', deps: ['world:0'] },
    { engine: 'story', kind: 'film', deps: ['mind:4', 'world:0'] },
    { engine: 'play', kind: 'fullgame', deps: ['story:6', 'form:3', 'world:0'] },
  ],
  'sci-fi-soft': [
    { engine: 'world', kind: 'world' },
    { engine: 'form', kind: 'character', deps: ['world:0'] },
    { engine: 'mind', kind: 'agent', deps: ['form:1'] },
    { engine: 'sound', kind: 'music', deps: ['world:0'] },
    { engine: 'story', kind: 'film', deps: ['mind:2'] },
    { engine: 'play', kind: 'game', deps: ['story:4', 'form:1'] },
  ],
  'fantasy-high': [
    { engine: 'world', kind: 'ecosystem' },
    { engine: 'form', kind: 'character', deps: ['world:0'] },
    { engine: 'sound', kind: 'music', deps: ['world:0'] },
    { engine: 'mind', kind: 'agent', deps: ['form:1'] },
    { engine: 'story', kind: 'narrative', deps: ['mind:3', 'world:0'] },
    { engine: 'play', kind: 'fullgame', deps: ['story:4', 'form:1', 'world:0'] },
  ],
  'fantasy-low': [
    { engine: 'world', kind: 'ecosystem' },
    { engine: 'form', kind: 'character', deps: ['world:0'] },
    { engine: 'story', kind: 'narrative', deps: ['form:1', 'world:0'] },
    { engine: 'play', kind: 'game', deps: ['story:2', 'form:1'] },
  ],
  modern: [
    { engine: 'world', kind: 'world' },
    { engine: 'form', kind: 'character', deps: ['world:0'] },
    { engine: 'mind', kind: 'agent', deps: ['form:1'] },
    { engine: 'story', kind: 'film', deps: ['mind:2', 'world:0'] },
    { engine: 'play', kind: 'game', deps: ['story:3', 'form:1'] },
  ],
  historical: [
    { engine: 'world', kind: 'world' },
    { engine: 'form', kind: 'character', deps: ['world:0'] },
    { engine: 'story', kind: 'theater', deps: ['form:1', 'world:0'] },
    { engine: 'play', kind: 'game', deps: ['story:2', 'form:1'] },
  ],
  'cosmic-horror': [
    { engine: 'field', kind: 'quantum' },
    { engine: 'world', kind: 'world', deps: ['field:0'] },
    { engine: 'form', kind: 'character', deps: ['world:1'] },
    { engine: 'sound', kind: 'acoustics', deps: ['world:1'] },
    { engine: 'story', kind: 'narrative', deps: ['form:2', 'world:1'] },
    { engine: 'play', kind: 'fullgame', deps: ['story:4', 'form:2', 'sound:3'] },
  ],
  'reality-em': [
    { engine: 'field', kind: 'electromagnetic' },
    { engine: 'matter', kind: 'material', deps: ['field:0'] },
  ],
  'reality-quantum': [
    { engine: 'field', kind: 'quantum' },
    { engine: 'matter', kind: 'molecule', deps: ['field:0'] },
  ],
  'reality-cosmic': [
    { engine: 'field', kind: 'cosmological' },
    { engine: 'world', kind: 'world', deps: ['field:0'] },
  ],
  'matter-drug': [
    { engine: 'matter', kind: 'molecule' },
  ],
  'matter-material': [
    { engine: 'matter', kind: 'material' },
  ],
  'matter-protein': [
    { engine: 'matter', kind: 'protein' },
  ],
  abstract: [
    { engine: 'form', kind: 'typography' },
    { engine: 'sound', kind: 'music' },
    { engine: 'play', kind: 'game', deps: ['form:0', 'sound:1'] },
  ],
};

/**
 * Grow a universe plan from a prompt. Pure / deterministic / replayable.
 * Same prompt → same plan, forever.
 */
export function planUniverse(prompt: string): UniversePlan {
  if (typeof prompt !== 'string' || prompt.length === 0) {
    throw new Error('planUniverse: prompt must be a non-empty string');
  }
  const archetype = classifyArchetype(prompt);
  const schedule = SCHEDULES[archetype];
  const rootSeedHash = deriveSeedHash(prompt, 'root');
  const nodes: UniversePlanNode[] = schedule.map((entry, idx) => ({
    id: `${entry.engine}:${idx}`,
    engine: entry.engine,
    kind: entry.kind,
    seedHash: deriveSeedHash(prompt, `${entry.engine}:${idx}`),
    dependsOn: entry.deps ?? [],
    hints: { archetype },
  }));
  return {
    prompt,
    rootSeedHash,
    nodes,
    version: '0.1.0',
  };
}

/**
 * Build a child Seed for a plan node. The seed's `$hash` is derived from
 * the prompt + node id, so two replays of the same plan produce identical
 * child seeds → identical artifacts.
 */
export function planNodeToSeed(node: UniversePlanNode): Seed {
  return {
    $hash: node.seedHash,
    $domain: node.engine,
    $kind: node.kind,
    $version: '1.0.0',
  } as Seed;
}

/**
 * Topological sort of a plan's node graph. Returns nodes in execution order.
 * Throws if the graph has a cycle (it shouldn't — schedules are DAGs).
 */
export function topoSortPlan(plan: UniversePlan): UniversePlanNode[] {
  const byId = new Map<string, UniversePlanNode>();
  for (const node of plan.nodes) byId.set(node.id, node);
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const out: UniversePlanNode[] = [];
  function visit(id: string): void {
    if (visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`cycle through ${id}`);
    visiting.add(id);
    const n = byId.get(id);
    if (!n) throw new Error(`dangling dependency: ${id}`);
    for (const dep of n.dependsOn) visit(dep);
    visiting.delete(id);
    visited.add(id);
    out.push(n);
  }
  for (const n of plan.nodes) visit(n.id);
  return out;
}

/**
 * Validation predicate: returns ok if every dependency resolves and every
 * engine referenced is one of the 9 ENGINE_IDS. Used as a guard before
 * plan execution.
 */
export function validatePlan(plan: UniversePlan): { ok: true } | { ok: false; reason: string } {
  const knownEngineIds = new Set<string>(ENGINE_IDS);
  const ids = new Set<string>();
  for (const n of plan.nodes) {
    if (!knownEngineIds.has(n.engine)) {
      return { ok: false, reason: `unknown engine: ${n.engine}` };
    }
    if (ids.has(n.id)) return { ok: false, reason: `duplicate node id: ${n.id}` };
    ids.add(n.id);
  }
  for (const n of plan.nodes) {
    for (const dep of n.dependsOn) {
      if (!ids.has(dep)) return { ok: false, reason: `dangling dep: ${n.id} → ${dep}` };
    }
  }
  return { ok: true };
}

/**
 * Surface the director's capability set so the registry can advertise it.
 */
export const directorCapability = Object.freeze({
  id: 'multiverse-director',
  name: 'Multiverse Director',
  version: '0.1.0',
  archetypes: Object.keys(SCHEDULES) as readonly UniverseArchetype[],
  composes: ENGINE_IDS,
});

/**
 * Convenience: deterministically grow a plan and a seed for every node.
 * Returns the plan + an array of (node, seed) tuples in execution order.
 */
export function growUniverse(prompt: string): {
  plan: UniversePlan;
  order: Array<{ node: UniversePlanNode; seed: Seed }>;
} {
  const plan = planUniverse(prompt);
  const v = validatePlan(plan);
  if (!v.ok) throw new Error('planUniverse produced invalid plan: ' + v.reason);
  const sorted = topoSortPlan(plan);
  const order = sorted.map((node) => ({ node, seed: planNodeToSeed(node) }));
  return { plan, order };
}

// Acknowledge the registry import for tree-shakers
void ENGINES;
