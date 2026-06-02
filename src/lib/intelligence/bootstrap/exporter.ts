/**
 * Dataset exporter — convert captured examples into fine-tune-ready
 * formats. JSONL is the raw store; sharegpt + alpaca are derived views.
 */
import type { BootstrapExample } from './types';

export interface ExportResult {
  format: 'jsonl' | 'sharegpt' | 'alpaca';
  count: number;
  bytes: number;
  body: string;
}

/** Plain JSONL, one example per line. Lossless. */
export function exportJsonl(examples: BootstrapExample[]): ExportResult {
  const lines = examples.map((e) => JSON.stringify(e));
  const body = lines.join('\n');
  return { format: 'jsonl', count: examples.length, bytes: body.length, body };
}

/** ShareGPT-style two-turn conversations for SFT-style fine-tunes. */
export function exportShareGpt(examples: BootstrapExample[]): ExportResult {
  const rows = examples.map((e) => ({
    conversations: [
      { from: 'human', value: e.rawUtterance },
      {
        from: 'gpt',
        value: JSON.stringify({
          intent: e.intent,
          planHash: e.planHash,
          seedHash: e.seedHash,
        }),
      },
    ],
    score: e.oracleScore,
  }));
  const body = rows.map((r) => JSON.stringify(r)).join('\n');
  return { format: 'sharegpt', count: examples.length, bytes: body.length, body };
}

/** Alpaca instruction/input/output. */
export function exportAlpaca(examples: BootstrapExample[]): ExportResult {
  const rows = examples.map((e) => ({
    instruction: 'Generate a GSPL ConstructionPlan for the user request.',
    input: e.rawUtterance,
    output: JSON.stringify({ intent: e.intent, planHash: e.planHash, seedHash: e.seedHash }),
    score: e.oracleScore,
  }));
  const body = rows.map((r) => JSON.stringify(r)).join('\n');
  return { format: 'alpaca', count: examples.length, bytes: body.length, body };
}

/** Curate a high-quality subset for the next fine-tune cycle. */
export function curate(
  examples: BootstrapExample[],
  opts: { minScore?: number; userApprovedOnly?: boolean; topPercent?: number } = {},
): BootstrapExample[] {
  let filtered = examples;
  if (opts.minScore !== undefined) {
    filtered = filtered.filter((e) => e.oracleScore >= opts.minScore!);
  }
  if (opts.userApprovedOnly) {
    filtered = filtered.filter((e) => e.userApproved === true);
  }
  if (opts.topPercent !== undefined) {
    const sorted = [...filtered].sort((a, b) => b.oracleScore - a.oracleScore);
    const cut = Math.max(1, Math.floor(sorted.length * opts.topPercent));
    filtered = sorted.slice(0, cut);
  }
  return filtered;
}
