/**
 * Plan executor — walks a Director UniversePlan, dispatches to engines,
 * collects a UniverseManifest.
 *
 * Activates the Director from planner into actual universe-grower.
 * Determinism: executor adds no entropy. Same seed + same plan + same
 * outputPaths → same manifest forever. Dispatch order is the topo-sort
 * from director.topoSortPlan.
 *
 * Doctrine: 12_PARADIGM_INFINITE_COMPLETION_DOCTRINE.md Part III + IV.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Seed } from '../kernel/engines';
import { ENGINES, type EngineId } from './index';
import { normalizeForEngine } from './outputpath';
import { topoSortPlan, classifyArchetype, type UniversePlan, type UniversePlanNode as PlanNode } from './director';
import { createRealitySeed, type UnseenChannel } from '../../seeds/reality-seed';
import { renderReality } from './reality';

export interface ExecuteOptions {
  /** Output root. Each node writes into a per-node subdir or file derived
   *  from this root. Must exist or be creatable. */
  outputRoot: string;
  /** Optional per-engine outputPath shape override. Defaults to engineFileShape map below. */
  outputShape?: Partial<Record<EngineId, 'directory' | 'json-file' | 'txt-file' | 'html-file'>>;
  /** Optional kind override per node id. Defaults to the plan's kind. */
  kinds?: Record<string, string>;
  /** Continue executing remaining nodes on failure? Default false. */
  continueOnError?: boolean;
}

export interface ManifestNode {
  id: string;
  engine: EngineId;
  kind: string;
  status: 'ok' | 'error';
  primaryPath?: string;
  auxPaths?: string[];
  durationMs: number;
  error?: { message: string };
  metrics?: Record<string, unknown>;
}

export interface UniverseManifest {
  prompt: string;
  archetype: string;
  totalDurationMs: number;
  nodeCount: number;
  okCount: number;
  errorCount: number;
  nodes: ManifestNode[];
}

function sanitize(id: string): string {
  return id.replace(/[^a-z0-9_-]/gi, '_').slice(0, 64);
}

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

/** Execute a Director plan. Returns the realized UniverseManifest. */

/**
 * Map a reality-* archetype to a default UnseenChannel for this universe.
 * Used when the executor encounters a field node under a reality archetype
 * and needs to derive a RealitySeed automatically.
 */
function archetypeToRealityChannel(archetype: string): UnseenChannel {
  if (archetype === 'reality-quantum') return 'quantum-wavefunction';
  if (archetype === 'reality-cosmic') return 'cosmological-curvature';
  return 'electromagnetic-visible';
}

export async function executePlan(
  plan: UniversePlan,
  seed: Seed,
  opts: ExecuteOptions,
): Promise<UniverseManifest> {
  ensureDir(opts.outputRoot);
  const ordered = topoSortPlan(plan);
  const kindOverrides = opts.kinds ?? {};
  const manifestNodes: ManifestNode[] = [];
  const t0 = 0; // wall-clock omitted to honor determinism boundary
  let durationAcc = 0;

  const archetype = classifyArchetype(plan.prompt);
  for (const node of ordered) {
    const engine = ENGINES[node.engine];
    if (!engine) {
      const m: ManifestNode = {
        id: node.id, engine: node.engine, kind: node.kind, status: 'error',
        durationMs: 0, error: { message: `unknown engine: ${node.engine}` },
      };
      manifestNodes.push(m);
      if (!opts.continueOnError) break;
      continue;
    }
    const outputPath = normalizeForEngine(node.engine, node.kind, path.join(opts.outputRoot, sanitize(node.id)));
    const kind = kindOverrides[node.id] ?? node.kind;
    const start = durationAcc;
    try {
      let out: unknown;
      if (node.engine === 'field' && typeof archetype === 'string' && archetype.startsWith('reality-')) {
        const realitySeed = createRealitySeed({
          prompt: plan.prompt,
          channel: archetypeToRealityChannel(archetype),
        });
        const rr = await renderReality(realitySeed, path.dirname(outputPath));
        out = {
          primaryPath: rr.primaryPath,
          auxPaths: rr.auxPaths,
          metrics: {
            ...(rr.metrics ?? {}),
            channel: rr.channel,
            dimensions: rr.dimensions,
            fieldKind: rr.fieldKind,
            counterfactual: rr.counterfactual,
          },
        };
      } else {
        out = await (engine.generate as (req: unknown) => Promise<unknown>)({
          kind,
          seed,
          outputPath,
        });
      }
      const o = out as { primaryPath?: string; auxPaths?: string[]; metrics?: Record<string, unknown> };
      manifestNodes.push({
        id: node.id, engine: node.engine, kind, status: 'ok',
        primaryPath: o.primaryPath,
        auxPaths: o.auxPaths,
        metrics: o.metrics,
        durationMs: 0,
      });
    } catch (e) {
      const err = e as Error;
      manifestNodes.push({
        id: node.id, engine: node.engine, kind, status: 'error',
        durationMs: 0,
        error: { message: err.message },
      });
      if (!opts.continueOnError) break;
    }
    durationAcc = start;
  }

  const okCount = manifestNodes.filter((n) => n.status === 'ok').length;
  const errorCount = manifestNodes.filter((n) => n.status === 'error').length;
  return {
    prompt: plan.prompt,
    archetype,

    totalDurationMs: 0,
    nodeCount: manifestNodes.length,
    okCount,
    errorCount,
    nodes: manifestNodes,
  };
}

/** Persist a manifest to disk as canonical JSON. */
export function writeManifest(manifest: UniverseManifest, outputRoot: string): string {
  ensureDir(outputRoot);
  const p = path.join(outputRoot, 'universe-manifest.json');
  fs.writeFileSync(p, JSON.stringify(manifest, null, 2));
  return p;
}
