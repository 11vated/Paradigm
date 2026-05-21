/**
 * Stage 6 — ARCHIVE (pure side-effect, fire-and-forget)
 *
 * Writes the ValidatedSeed (or AssembledOutput when validate was
 * skipped) into the user's memory stack:
 *
 *   • Layer 2 (episodic) — "agent.run produced seed X at time T"
 *     event, encrypted with the user's sovereignty key.
 *   • Layer 3 (semantic) — full seed entry tagged 'seed:<domain>',
 *     keyed by seedHash. Used by future Stage-0 live-context lookups
 *     and SubAgent.worldFact().
 *   • Canon (optional) — when a CanonMemory instance is supplied,
 *     the seed is embedded + indexed for semantic RAG recall.
 *
 * Deterministic w.r.t. inputs. No LLM. No network. Idempotent — a
 * second archive of the same seed updates `updatedAt` but does not
 * duplicate entries.
 */

import { kernelNow } from '../../../kernel/clock';
import type { ValidatedSeed, AssembledOutput } from '../types';
import type { MemoryEntry, MemoryLayer } from '../../memory/types';
import type { CanonMemory } from '../../memory/canon';

export interface ArchiveOptions {
  /** Episodic memory layer (Layer 2). When omitted, no event is written. */
  episodic?: MemoryLayer;
  /** Semantic memory layer (Layer 3). When omitted, no seed entry is written. */
  semantic?: MemoryLayer;
  /** Canon RAG layer. When supplied, the seed is embedded + indexed. */
  canon?: CanonMemory;
  /** Caller identity for the episodic event. Default 'sovereign-agent'. */
  agentId?: string;
  /** Skip the canon embed (saves an embedder call). */
  skipCanon?: boolean;
}

export interface ArchiveReceipt {
  seedHash: string;
  wroteEpisodic: boolean;
  wroteSemantic: boolean;
  wroteCanon: boolean;
  timestamp: number;
}

/** Write the agent's output into the four memory layers. */
export async function archive(
  output: ValidatedSeed | AssembledOutput,
  opts: ArchiveOptions,
): Promise<ArchiveReceipt> {
  const seed = output.seed;
  const seedHash = seed.$hash ?? 'unhashed';
  const timestamp = kernelNow();
  const agentId = opts.agentId ?? 'sovereign-agent';

  let wroteEpisodic = false;
  if (opts.episodic) {
    const event: MemoryEntry = {
      key: `event:${seedHash}:${timestamp}`,
      topic: 'agent:produced',
      source: agentId,
      createdAt: timestamp,
      updatedAt: timestamp,
      value: {
        kind: 'agent.produced',
        seedHash,
        domain: seed.$domain ?? '',
        name: seed.$name ?? '',
        oracleScore: 'oracle' in output ? output.oracle.overall : undefined,
        signedBy: 'signature' in output ? output.signature?.pubKeyHex : undefined,
      },
    };
    await opts.episodic.put(event);
    wroteEpisodic = true;
  }

  let wroteSemantic = false;
  if (opts.semantic) {
    const entry: MemoryEntry = {
      key: `seed:${seedHash}`,
      topic: `seed:${seed.$domain ?? 'misc'}`,
      source: agentId,
      createdAt: timestamp,
      updatedAt: timestamp,
      value: seed,
    };
    await opts.semantic.put(entry);
    wroteSemantic = true;
  }

  let wroteCanon = false;
  if (opts.canon && !opts.skipCanon) {
    await opts.canon.ingest(seed);
    wroteCanon = true;
  }

  return { seedHash, wroteEpisodic, wroteSemantic, wroteCanon, timestamp };
}
