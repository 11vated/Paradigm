/**
 * Stage 5 — VALIDATE (pure)
 *
 * Runs the assembled seed through the oracle to score it, then signs
 * it with the user's sovereignty key if available.
 *
 * Pure function on (seed, oracle, signer). No LLM. No network.
 */

import type { AssembledOutput, OracleReport, ValidatedSeed } from '../types';
import { kernelNow } from '../../../kernel/clock';

export interface Oracle {
  evaluate(seed: AssembledOutput['seed']): Promise<OracleReport>;
}

export interface Signer {
  sign(payload: string): Promise<{ sigHex: string; pubKeyHex: string }>;
}

export interface ValidateOptions {
  oracle: Oracle;
  signer?: Signer;
  /** Threshold below which the seed is marked failed */
  passThreshold?: number;
}

export async function validate(
  out: AssembledOutput,
  opts: ValidateOptions,
): Promise<ValidatedSeed> {
  const oracle = await opts.oracle.evaluate(out.seed);
  const threshold = opts.passThreshold ?? 0.55;
  const passed = oracle.overall >= threshold;

  let signature: ValidatedSeed['signature'];
  if (opts.signer && passed) {
    const payload = `${out.seed.$hash}:${oracle.overall.toFixed(4)}:${oracle.conformsTo}`;
    const sig = await opts.signer.sign(payload);
    signature = { ...sig, signedAt: kernelNow() };
  }

  return { seed: out.seed, oracle, passed, signature };
}

/**
 * Trivial default oracle — returns a baseline score of 0.6 with a
 * "novelty" axis driven by how many specs were set vs the genesis
 * defaults. Real domains plug in their own oracle (see
 * src/lib/game/oracle.ts for the reference implementation).
 */
export const defaultOracle: Oracle = {
  async evaluate(seed): Promise<OracleReport> {
    const numericPaths = collectNumericPaths(seed.genes ?? {});
    const novelty = Math.min(1, numericPaths.length / 24);
    return {
      overall: 0.6 + 0.2 * novelty,
      axes: { coherence: 0.6, novelty, fidelity: 0.6, expressivity: 0.55 },
      notes: [],
      conformsTo: `${seed.$domain}@default-oracle`,
    };
  },
};

function collectNumericPaths(obj: unknown, prefix = ''): string[] {
  const out: string[] = [];
  if (obj === null || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('$')) continue;
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number') out.push(full);
    else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      out.push(...collectNumericPaths(v, full));
    }
  }
  return out;
}
