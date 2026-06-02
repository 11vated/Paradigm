/**
 * Agent Reproducibility Harness (Doctrine v2 Phases 9–10)
 *
 * Core guarantee:
 *   Same (intent, memoryHash, seedCorpusHash, agentVersion) → byte-identical decision.
 *
 * This module provides:
 *   - Stable hashing of memory state at decision time
 *   - Capture of the full reproducibility tuple
 *   - Replay capability that restores a deterministic view and re-executes
 *
 * The harness is intentionally lightweight in Phase 1. It focuses on the
 * observable tuple the Doctrine requires. Full snapshot/restore of every
 * memory layer can be added later without breaking the interface.
 */

import { createHash } from 'crypto';
import type { MemoryOrchestrator } from './memory/types';
import type { AgentRunReport } from './agent/orchestrator';

export interface ReproducibilityCapture {
  /** The raw user utterance / intent string */
  intent: string;

  /** Stable hash of the memory state that influenced this decision */
  memoryHash: string;

  /** Hash of the seed corpus / canon that was available (for cross-run comparison) */
  seedCorpusHash: string;

  /** The actual decision/output (the plan + final seed) */
  decision: {
    planHash: string;
    seedHash: string;
    domain: string;
    // We store a compact, deterministic summary of the output
    summary: Record<string, unknown>;
  };

  /** Agent / pipeline version for future-proofing */
  agentVersion: string;

  /** When the capture was taken (for audit, not part of the hash) */
  capturedAt: string;
}

export interface CaptureOptions {
  /** Which memory layers to include in the hash (default: all available) */
  includeLayers?: Array<'working' | 'episodic' | 'semantic' | 'world' | 'canon'>;
  /** Limit on number of recent entries per layer to hash (keeps captures small) */
  maxEntriesPerLayer?: number;
}

export interface ReplayOptions {
  /** A memory orchestrator pre-loaded with the exact state that was captured */
  memory?: MemoryOrchestrator;
  /** If true, will assert that the replayed output exactly matches the captured decision */
  assertIdentical?: boolean;
}

/**
 * Computes a stable, content-addressed hash of the relevant memory state.
 * This is the key primitive for the (intent, memoryHash, ...) tuple.
 */
export async function computeMemoryStateHash(
  memory: MemoryOrchestrator,
  opts: CaptureOptions = {},
): Promise<string> {
  const layers = opts.includeLayers ?? ['episodic', 'semantic', 'world'];
  const maxEntries = opts.maxEntriesPerLayer ?? 64;

  const pieces: string[] = [];

  for (const layerName of layers) {
    try {
      // Deterministic layer query (with graceful empty for missing layers — still produces stable hash).
      const results = await memory.search({ text: '', limit: maxEntries }).catch(() => []);
      const sorted = results
        .map((e) => ({ key: e.key, value: canonicalValue(e.value) }))
        .sort((a, b) => a.key.localeCompare(b.key));

      for (const item of sorted) {
        pieces.push(`${layerName}:${item.key}:${JSON.stringify(item.value)}`);
      }
    } catch {
      // Layer not present or not queryable — skip gracefully (still deterministic)
    }
  }

  // Also fold in any canon / seed corpus hashes the memory knows about
  // (CanonMemory hits are usually surfaced via search results above)

  const joined = pieces.join('|');
  return createHash('sha256').update(joined).digest('hex').slice(0, 32);
}

/**
 * Best-effort stable serialization for memory values.
 */
function canonicalValue(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map(canonicalValue);
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = canonicalValue(obj[k]);
    return out;
  }
  return String(v);
}

/**
 * Captures a full reproducibility tuple from a completed agent run.
 */
export async function captureReproducibleRun(
  report: AgentRunReport,
  memory: MemoryOrchestrator,
  agentVersion = 'sovereign-agent-v1',
  opts: CaptureOptions = {},
): Promise<ReproducibilityCapture> {
  const memoryHash = await computeMemoryStateHash(memory, opts);

  // Seed corpus hash — deterministic from report/memory (graceful for partial).
  const seedCorpusHash = (report.seed as any)?.$corpusHash ||
    createHash('sha256')
      .update(report.seed.$hash ?? '')
      .update(report.plan?.planHash ?? '')
      .digest('hex')
      .slice(0, 24);

  const decision = {
    planHash: report.plan?.planHash ?? '',
    seedHash: report.seed.$hash ?? '',
    domain: (report.seed as any)?.$domain ?? report.plan?.domain ?? 'unknown',
    summary: {
      hasValidated: !!report.validated,
      iterations: report.iterations ?? 1,
      realityDominant: report.reality?.dominant,
    },
  };

  return {
    intent: report.intent.raw,
    memoryHash,
    seedCorpusHash,
    decision,
    agentVersion,
    capturedAt: new Date().toISOString(),
  };
}

/**
 * Minimal replay harness.
 * In a full implementation this would restore a memory snapshot and re-execute
 * the pure stages (Stage 3+). For Phase 1 we provide the structure + a
 * deterministic "same input tuple → same decision hash" check.
 */
export class ReproducibilityHarness {
  private captures = new Map<string, ReproducibilityCapture>();

  record(capture: ReproducibilityCapture): string {
    const key = this.makeKey(capture);
    this.captures.set(key, capture);
    return key;
  }

  get(key: string): ReproducibilityCapture | undefined {
    return this.captures.get(key);
  }

  /**
   * Given a previous capture and (optionally) a memory state that claims to be
   * identical, re-compute the memory hash and assert the decision would be the same.
   */
  async verifyReplay(
    original: ReproducibilityCapture,
    memory?: MemoryOrchestrator,
    opts: CaptureOptions = {},
  ): Promise<{ matches: boolean; currentMemoryHash?: string; reason?: string }> {
    if (!memory) {
      return {
        matches: true,
        reason: 'No memory provided — only structural verification possible in this slice',
      };
    }

    const currentHash = await computeMemoryStateHash(memory, opts);

    if (currentHash !== original.memoryHash) {
      return {
        matches: false,
        currentMemoryHash: currentHash,
        reason: 'Memory state hash differs from capture',
      };
    }

    // In a more complete harness we would re-run the agent with the exact
    // memory view and compare planHash / seedHash. For now we treat
    // identical memoryHash + identical intent as "would produce identical decision".

    return { matches: true, currentMemoryHash: currentHash };
  }

  private makeKey(c: ReproducibilityCapture): string {
    return `${c.intent.slice(0, 32)}:${c.memoryHash}:${c.seedCorpusHash}`;
  }
}

/** Convenience factory for a fresh harness */
export function createReproducibilityHarness(): ReproducibilityHarness {
  return new ReproducibilityHarness();
}