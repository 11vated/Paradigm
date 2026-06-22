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
import { topoSortPlan, classifyArchetype, type UniversePlan, type UniversePlanNode as PlanNode } from './director';

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

/** Default per-engine outputPath shape based on observed generator conventions. */
const ENGINE_FILE_SHAPE: Record<EngineId, 'directory' | 'json-file' | 'txt-file'> = {
  form: 'directory',
  motion: 'json-file',
  sound: 'json-file',
  world: 'directory',
  mind: 'json-file',
  play: 'directory',
  story: 'directory',
  matter: 'directory',
  field: 'directory',
};

function sanitize(id: string): string {
  return id.replace(/[^a-z0-9_-]/gi, '_').slice(0, 64);
}

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function shapePath(root: string, node: PlanNode, shape: 'directory' | 'json-file' | 'txt-file' | 'html-file'): string {
  const slug = sanitize(node.id);
  switch (shape) {
    case 'directory': {
      const p = path.join(root, slug);
      ensureDir(p);
      return p;
    }
    case 'json-file': {
      ensureDir(root);
      return path.join(root, `${slug}.json`);
    }
    case 'txt-file': {
      ensureDir(root);
      return path.join(root, `${slug}.txt`);
    }
    case 'html-file': {
      ensureDir(root);
      return path.join(root, `${slug}.html`);
    }
  }
}

/** Execute a Director plan. Returns the realized UniverseManifest. */
export async function executePlan(
  plan: UniversePlan,
  seed: Seed,
  opts: ExecuteOptions,
): Promise<UniverseManifest> {
  ensureDir(opts.outputRoot);
  const ordered = topoSortPlan(plan);
  const shapeMap: Record<EngineId, 'directory' | 'json-file' | 'txt-file' | 'html-file'> = {
    ...ENGINE_FILE_SHAPE,
    ...(opts.outputShape ?? {}),
  };
  const kindOverrides = opts.kinds ?? {};
  const manifestNodes: ManifestNode[] = [];
  const t0 = 0; // wall-clock omitted to honor determinism boundary
  let durationAcc = 0;

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
    const shape = shapeMap[node.engine] ?? 'directory';
    const outputPath = shapePath(opts.outputRoot, node, shape);
    const kind = kindOverrides[node.id] ?? node.kind;
    const start = durationAcc;
    try {
      const out = await (engine.generate as (req: unknown) => Promise<unknown>)({
        kind,
        seed,
        outputPath,
      });
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
    archetype: classifyArchetype(plan.prompt),

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
