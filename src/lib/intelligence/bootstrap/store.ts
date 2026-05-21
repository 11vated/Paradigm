/**
 * Bootstrap store — in-memory + JSONL persistence.
 *
 * Each capture appends one JSON object per line. Reads parse the whole
 * file (fine for the expected scale — millions of lines stay readable in
 * a few hundred MB; trigger fine-tune well before then).
 */
import { createHash } from 'node:crypto';
import { kernelNow } from '../../kernel/clock';
import type { BootstrapExample, BootstrapFilter, BootstrapStats, BootstrapStore } from './types';

export class InMemoryBootstrapStore implements BootstrapStore {
  private examples: BootstrapExample[] = [];

  async capture(ex: BootstrapExample): Promise<void> {
    if (!ex.id || !ex.rawUtterance) throw new Error('bootstrap.capture: missing required fields');
    this.examples.push(ex);
  }

  async list(filter?: BootstrapFilter): Promise<BootstrapExample[]> {
    if (!filter) return [...this.examples];
    return this.examples.filter((e) => {
      if (filter.minScore !== undefined && e.oracleScore < filter.minScore) return false;
      if (filter.userApprovedOnly && !e.userApproved) return false;
      if (filter.topIntents && !filter.topIntents.includes(e.intent.top)) return false;
      if (filter.since !== undefined && e.capturedAt < filter.since) return false;
      return true;
    });
  }

  async stats(): Promise<BootstrapStats> {
    const exs = this.examples;
    const byTopIntent: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let scoreSum = 0;
    let hq = 0;
    let ua = 0;
    let oldest = Infinity;
    let newest = -Infinity;
    for (const e of exs) {
      byTopIntent[e.intent.top] = (byTopIntent[e.intent.top] ?? 0) + 1;
      const src = `${e.llm?.provider ?? '?'}:${e.llm?.model ?? '?'}`;
      bySource[src] = (bySource[src] ?? 0) + 1;
      scoreSum += e.oracleScore;
      if (e.oracleScore >= 0.85) hq++;
      if (e.userApproved) ua++;
      if (e.capturedAt < oldest) oldest = e.capturedAt;
      if (e.capturedAt > newest) newest = e.capturedAt;
    }
    return {
      total: exs.length,
      bySource,
      byTopIntent,
      avgScore: exs.length ? scoreSum / exs.length : 0,
      highQuality: hq,
      userApproved: ua,
      oldest: oldest === Infinity ? 0 : oldest,
      newest: newest === -Infinity ? 0 : newest,
    };
  }

  async clear(): Promise<void> {
    this.examples = [];
  }
}

/** Compute the canonical id for an example. */
export function exampleId(rawUtterance: string, planHash: string): string {
  return createHash('sha256').update(`${rawUtterance}|${planHash}`).digest('hex').slice(0, 32);
}

/** Build a BootstrapExample from an AgentRunReport-shaped payload. */
export function captureFromAgentRun(args: {
  rawUtterance: string;
  intent: { top: string; sub?: string; domains: string[] };
  planHash: string;
  seedHash: string;
  oracleScore: number;
  oracleAxes?: Record<string, number>;
  llm?: { provider: string; model: string };
  iteration?: number;
  userApproved?: boolean;
}): BootstrapExample {
  return {
    id: exampleId(args.rawUtterance, args.planHash),
    rawUtterance: args.rawUtterance,
    intent: args.intent,
    planHash: args.planHash,
    seedHash: args.seedHash,
    oracleScore: args.oracleScore,
    oracleAxes: args.oracleAxes,
    llm: args.llm,
    capturedAt: kernelNow(),
    iteration: args.iteration ?? 0,
    userApproved: args.userApproved,
  };
}
