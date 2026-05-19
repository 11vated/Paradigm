/**
 * Paradigm Quality Contract — the formal definition of a "complete" generator.
 *
 * Every Tier-1 generator MUST conform to this contract. The contract has
 * five obligations, each independently testable:
 *
 *   1. SYNTHESIZE   — Take a seed; emit a real artifact (not random JSON).
 *   2. INVERT       — Given an artifact, reconstruct the gene values that
 *                     most likely produced it. Lossy is fine; pure → pure
 *                     is not.
 *   3. RATE         — Given an artifact, return a quality score in [0, 1]
 *                     plus a structured breakdown. Used as the fitness
 *                     function for evolutionary search.
 *   4. CURATE       — Provide a curated library of at least 3 high-quality
 *                     starter seeds. These are the "designer references"
 *                     for the domain.
 *   5. BE-DETERMINISTIC — Same input → byte-identical output. No
 *                          Math.random, no Date.now, no entropy of any
 *                          kind. Conformance is verified by running the
 *                          generator twice and comparing the artifact.
 *
 * A generator that passes all five clauses is *canonical* for its domain.
 * A generator that passes 1+5 only is *operational* but not canonical.
 *
 * Phase 2 (1/n) — Generator Renaissance.
 * See Documents/Paradigm-Vision/05_GENERATOR_RENAISSANCE.md.
 */

import { createHash } from 'crypto';

// ─── Contract interface ──────────────────────────────────────────────────────

/**
 * The contract every Tier-1 generator must fulfill.
 *
 * `TSeed` is the generator's seed shape.
 * `TArtifact` is what `synthesize` produces.
 * `TGenes` is what `invert` reconstructs (typically a subset of `TSeed`).
 */
export interface QualityContract<TSeed, TArtifact, TGenes> {
  /** Human-readable id, e.g. 'sprite', 'music', 'narrative'. */
  readonly domain: string;

  /** Semver — bump when output bytes change. */
  readonly version: string;

  /** Clause 1: synthesize an artifact from a seed. */
  synthesize(seed: TSeed): Promise<TArtifact> | TArtifact;

  /** Clause 2: best-effort inverse — reconstruct genes from an artifact. */
  invert(artifact: TArtifact): Promise<TGenes> | TGenes;

  /** Clause 3: quality score in [0, 1], plus a structured breakdown. */
  rate(artifact: TArtifact): Promise<QualityReport> | QualityReport;

  /** Clause 4: curated starter library. ≥ 3 examples. */
  curated(): readonly CuratedSeed<TSeed>[];

  /**
   * Optional: produce a deterministic hash of the artifact's content for
   * the determinism check. If absent, the contract runner uses a default
   * JSON-canonicalize + SHA-256.
   */
  hashArtifact?(artifact: TArtifact): string;
}

export interface QualityReport {
  /** Overall quality, [0, 1]. */
  score: number;
  /** Per-axis breakdown — names are domain-specific. */
  axes: Record<string, number>;
  /** Optional issues / warnings the generator wants surfaced. */
  notes?: string[];
}

export interface CuratedSeed<TSeed> {
  /** Stable id within the curated library. */
  id: string;
  /** Display name. */
  name: string;
  /** The seed itself. */
  seed: TSeed;
  /** Why this is in the curated library — design intent. */
  intent: string;
  /** Tags for filtering (e.g. ['playful', 'low-fi']). */
  tags?: readonly string[];
}

// ─── Conformance runner ──────────────────────────────────────────────────────

export interface ConformanceOptions {
  /** Override the minimum number of curated seeds. */
  minCurated?: number;
  /** Override the minimum quality the curated seeds must score. */
  minCuratedScore?: number;
  /** Number of synthesize-twice determinism checks. */
  determinismTrials?: number;
}

export interface ConformanceResult {
  domain: string;
  version: string;
  passed: boolean;
  clauses: {
    synthesize: ClauseResult;
    invert: ClauseResult;
    rate: ClauseResult;
    curate: ClauseResult;
    deterministic: ClauseResult;
  };
  summary: string;
  durationMs: number;
}

export interface ClauseResult {
  passed: boolean;
  detail: string;
  /** Optional structured evidence for the report. */
  evidence?: Record<string, unknown>;
}

const DEFAULT_OPTS: Required<ConformanceOptions> = {
  minCurated: 3,
  minCuratedScore: 0.6,
  determinismTrials: 2,
};

/**
 * Run the full conformance suite against a contract. Returns a structured
 * report; never throws. The `summary` string is intended for printing.
 */
export async function runConformance<TSeed, TArtifact, TGenes>(
  contract: QualityContract<TSeed, TArtifact, TGenes>,
  options: ConformanceOptions = {},
): Promise<ConformanceResult> {
  const opts = { ...DEFAULT_OPTS, ...options };
  const t0 = Date.now();

  const clauses: ConformanceResult['clauses'] = {
    synthesize: { passed: false, detail: '' },
    invert: { passed: false, detail: '' },
    rate: { passed: false, detail: '' },
    curate: { passed: false, detail: '' },
    deterministic: { passed: false, detail: '' },
  };

  // We need at least one curated seed to exercise synth/invert/rate/det.
  let firstCurated: CuratedSeed<TSeed> | undefined;
  let firstArtifact: TArtifact | undefined;

  // Clause 4 first — curate (needed to exercise the others)
  try {
    const lib = contract.curated();
    if (!Array.isArray(lib)) {
      clauses.curate.detail = 'curated() did not return an array';
    } else if (lib.length < opts.minCurated) {
      clauses.curate.detail = `curated() has ${lib.length} entries, requires ≥ ${opts.minCurated}`;
    } else {
      const ids = new Set(lib.map((c) => c.id));
      if (ids.size !== lib.length) {
        clauses.curate.detail = `curated() has duplicate ids`;
      } else {
        clauses.curate.passed = true;
        clauses.curate.detail = `${lib.length} curated entries`;
        clauses.curate.evidence = { count: lib.length, ids: [...ids] };
        firstCurated = lib[0];
      }
    }
  } catch (e: any) {
    clauses.curate.detail = `curated() threw: ${e.message ?? String(e)}`;
  }

  if (!firstCurated) {
    return finalize(contract, clauses, t0);
  }

  // Clause 1: synthesize
  try {
    firstArtifact = await contract.synthesize(firstCurated.seed);
    if (firstArtifact === undefined || firstArtifact === null) {
      clauses.synthesize.detail = 'synthesize() returned null/undefined';
    } else {
      clauses.synthesize.passed = true;
      clauses.synthesize.detail = `synthesized "${firstCurated.name}"`;
    }
  } catch (e: any) {
    clauses.synthesize.detail = `synthesize() threw: ${e.message ?? String(e)}`;
  }

  if (firstArtifact === undefined) {
    return finalize(contract, clauses, t0);
  }

  // Clause 2: invert
  try {
    const genes = await contract.invert(firstArtifact);
    if (genes === undefined || genes === null) {
      clauses.invert.detail = 'invert() returned null/undefined';
    } else if (typeof genes !== 'object') {
      clauses.invert.detail = `invert() must return an object, got ${typeof genes}`;
    } else {
      clauses.invert.passed = true;
      clauses.invert.detail = `inverted to ${Object.keys(genes).length} gene(s)`;
      clauses.invert.evidence = { keys: Object.keys(genes) };
    }
  } catch (e: any) {
    clauses.invert.detail = `invert() threw: ${e.message ?? String(e)}`;
  }

  // Clause 3: rate
  let curatedScores: number[] = [];
  try {
    const report = await contract.rate(firstArtifact);
    if (!report || typeof report.score !== 'number' || report.score < 0 || report.score > 1) {
      clauses.rate.detail = `rate() must return { score: 0..1 }; got ${JSON.stringify(report)}`;
    } else if (!report.axes || typeof report.axes !== 'object') {
      clauses.rate.detail = `rate() must include an axes breakdown`;
    } else {
      clauses.rate.passed = true;
      clauses.rate.detail = `score=${report.score.toFixed(3)} axes=${Object.keys(report.axes).length}`;
      clauses.rate.evidence = { score: report.score, axes: report.axes };

      // Bonus: verify all curated seeds beat minCuratedScore.
      curatedScores = [report.score];
      const lib = contract.curated();
      for (let i = 1; i < lib.length; i++) {
        const art = await contract.synthesize(lib[i].seed);
        const r = await contract.rate(art);
        curatedScores.push(r.score);
      }
      const minScore = Math.min(...curatedScores);
      if (minScore < opts.minCuratedScore) {
        clauses.rate.passed = false;
        clauses.rate.detail = `curated min score ${minScore.toFixed(3)} < required ${opts.minCuratedScore}`;
        clauses.rate.evidence = { scores: curatedScores };
      } else {
        clauses.rate.evidence = { score: report.score, axes: report.axes, curatedMin: minScore };
      }
    }
  } catch (e: any) {
    clauses.rate.detail = `rate() threw: ${e.message ?? String(e)}`;
  }

  // Clause 5: deterministic
  try {
    const hash = contract.hashArtifact ?? defaultHashArtifact;
    const reference = hash(firstArtifact);
    const mismatches: string[] = [];
    for (let i = 1; i < opts.determinismTrials; i++) {
      const again = await contract.synthesize(firstCurated.seed);
      const h = hash(again);
      if (h !== reference) {
        mismatches.push(`trial ${i}: ${h} ≠ ${reference}`);
        break;
      }
    }
    if (mismatches.length === 0) {
      clauses.deterministic.passed = true;
      clauses.deterministic.detail = `${opts.determinismTrials}× synth → byte-identical`;
      clauses.deterministic.evidence = { hash: reference.slice(0, 16) };
    } else {
      clauses.deterministic.detail = `non-determinism detected: ${mismatches.join('; ')}`;
    }
  } catch (e: any) {
    clauses.deterministic.detail = `determinism check threw: ${e.message ?? String(e)}`;
  }

  return finalize(contract, clauses, t0);
}

function finalize<TSeed, TArtifact, TGenes>(
  contract: QualityContract<TSeed, TArtifact, TGenes>,
  clauses: ConformanceResult['clauses'],
  t0: number,
): ConformanceResult {
  const passed = Object.values(clauses).every((c) => c.passed);
  const passedCount = Object.values(clauses).filter((c) => c.passed).length;
  return {
    domain: contract.domain,
    version: contract.version,
    passed,
    clauses,
    summary: `${contract.domain}@${contract.version}: ${passedCount}/5 clauses${passed ? ' — ✅ canonical' : ' — ⚠ not yet canonical'}`,
    durationMs: Date.now() - t0,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function defaultHashArtifact(artifact: unknown): string {
  return createHash('sha256').update(canonicalJson(artifact)).digest('hex');
}

function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  // Buffers + typed arrays — fingerprint their bytes
  if (v instanceof Uint8Array) return JSON.stringify({ __bytes: Buffer.from(v).toString('base64') });
  if (Buffer.isBuffer(v)) return JSON.stringify({ __bytes: v.toString('base64') });
  const keys = Object.keys(v as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson((v as Record<string, unknown>)[k])).join(',') + '}';
}

// ─── Registry — every contract self-registers here ───────────────────────────

const REGISTRY = new Map<string, QualityContract<any, any, any>>();

export function registerContract<TSeed, TArtifact, TGenes>(
  c: QualityContract<TSeed, TArtifact, TGenes>,
): void {
  REGISTRY.set(c.domain, c);
}

export function getContract(domain: string): QualityContract<any, any, any> | undefined {
  return REGISTRY.get(domain);
}

export function listContracts(): QualityContract<any, any, any>[] {
  return Array.from(REGISTRY.values());
}

/**
 * Run conformance against all registered contracts. Returns a leaderboard.
 */
export async function runAllConformance(opts: ConformanceOptions = {}): Promise<ConformanceResult[]> {
  const out: ConformanceResult[] = [];
  for (const c of REGISTRY.values()) {
    out.push(await runConformance(c, opts));
  }
  // Sort: passed first, then by clause-count, then by domain alphabetically.
  out.sort((a, b) => {
    if (a.passed !== b.passed) return a.passed ? -1 : 1;
    const aPassed = Object.values(a.clauses).filter((c) => c.passed).length;
    const bPassed = Object.values(b.clauses).filter((c) => c.passed).length;
    if (aPassed !== bPassed) return bPassed - aPassed;
    return a.domain.localeCompare(b.domain);
  });
  return out;
}

/**
 * Pretty-print the leaderboard. Returns a multi-line string suitable for
 * console output or CI logs.
 */
export function formatLeaderboard(results: ConformanceResult[]): string {
  if (results.length === 0) return '(no contracts registered)';
  const lines: string[] = [];
  const header = `┌─ Generator Quality Contract — ${results.length} contract(s) ─────────────────────────────`;
  lines.push(header);
  lines.push(`│ ${'domain'.padEnd(18)} ${'ver'.padEnd(8)} S I R C D  score  detail`);
  lines.push(`├${'─'.repeat(header.length - 1)}`);
  for (const r of results) {
    const c = r.clauses;
    const flags = [c.synthesize, c.invert, c.rate, c.curate, c.deterministic]
      .map((cl) => (cl.passed ? '✓' : '·')).join(' ');
    const score = (c.rate.evidence as any)?.score;
    const scoreStr = typeof score === 'number' ? score.toFixed(3) : '  -  ';
    const detail = r.passed ? '' : firstFailure(r);
    lines.push(`│ ${r.domain.padEnd(18)} ${r.version.padEnd(8)} ${flags}  ${scoreStr}  ${detail}`);
  }
  lines.push(`└${'─'.repeat(header.length - 1)}`);
  return lines.join('\n');
}

function firstFailure(r: ConformanceResult): string {
  for (const [name, cl] of Object.entries(r.clauses)) {
    if (!cl.passed) return `${name}: ${cl.detail}`;
  }
  return '';
}
