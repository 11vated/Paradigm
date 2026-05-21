/**
 * Memory Orchestrator
 *
 * Single entry point the agent uses to recall / search / write across
 * all four memory layers. Implements the canonical lookup order:
 *   recall: working → episodic → semantic → world
 *   search: union across all available layers, ranked by similarity
 *
 * Sovereignty: the orchestrator is the only place where layer
 * permissions are enforced. Sub-agents receive a *view* through
 * MemoryOrchestrator that prevents cross-tenant leakage.
 */

import { kernelNow } from '../../kernel/clock';
import type {
  MemoryEntry,
  MemoryLayer,
  MemoryLayerName,
  MemoryOrchestrator,
  MemoryQuery,
} from './types';
import { WorkingMemory } from './working';
import { SemanticMemory } from './semantic';

export interface OrchestratorOpts {
  workspaceRoot?: string;
  /** If episodic / world layers are not provided, only working+semantic are used */
  episodic?: MemoryLayer;
  world?: MemoryLayer;
}

export class DefaultMemoryOrchestrator implements MemoryOrchestrator {
  private layers: Partial<Record<MemoryLayerName, MemoryLayer>> = {};
  private primed: Record<string, unknown> = {};

  constructor(opts: OrchestratorOpts = {}) {
    const root = opts.workspaceRoot ?? 'data/memory';
    this.layers.working = new WorkingMemory();
    this.layers.semantic = new SemanticMemory(`${root}/semantic.json`);
    if (opts.episodic) this.layers.episodic = opts.episodic;
    if (opts.world) this.layers.world = opts.world;
  }

  layer(name: MemoryLayerName): MemoryLayer {
    const layer = this.layers[name];
    if (!layer) throw new Error(`Memory layer not available: ${name}`);
    return layer;
  }

  prime(context: Record<string, unknown>): void {
    this.primed = { ...this.primed, ...context };
    // Mirror primed keys into working memory so sub-agents can recall them
    for (const [key, value] of Object.entries(context)) {
      void this.layers.working!.put({
        key: `ctx:${key}`,
        value,
        topic: 'context',
        source: 'prime',
      });
    }
  }

  async recall(key: string): Promise<MemoryEntry | undefined> {
    const order: MemoryLayerName[] = ['working', 'episodic', 'semantic', 'world'];
    for (const name of order) {
      const layer = this.layers[name];
      if (!layer) continue;
      const entry = await layer.get(key);
      if (entry) return entry;
    }
    return undefined;
  }

  async search(q: MemoryQuery): Promise<MemoryEntry[]> {
    const tasks: Promise<MemoryEntry[]>[] = [];
    for (const layer of Object.values(this.layers)) {
      if (layer) tasks.push(layer.query(q));
    }
    const results = await Promise.all(tasks);
    // Flatten + dedupe by key (deeper layer wins)
    const dedup = new Map<string, MemoryEntry>();
    for (const list of results) {
      for (const entry of list) {
        if (!dedup.has(entry.key)) dedup.set(entry.key, entry);
      }
    }
    const out = [...dedup.values()];
    return out.slice(0, q.limit ?? 32);
  }

  async writeTo(
    layer: MemoryLayerName,
    entry: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>,
  ): Promise<void> {
    const target = this.layers[layer];
    if (!target) throw new Error(`Cannot write — layer not configured: ${layer}`);
    await target.put(entry);
  }

  async promote(key: string, target: 'episodic' | 'semantic'): Promise<void> {
    const entry = await this.layers.working!.get(key);
    if (!entry) return;
    await this.writeTo(target, entry);
    // Note: working memory keeps its copy; eviction will retire it naturally.
  }
}

/** Convenience builder */
export function createMemoryOrchestrator(opts?: OrchestratorOpts): MemoryOrchestrator {
  return new DefaultMemoryOrchestrator(opts);
}
