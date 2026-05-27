/**
 * `paradigm make <intent>` — Doctrine v2 Part VIII.13 Maker CLI GA.
 *
 * The single command that ties the platform together: a natural-language
 * intent in, a deterministic signed artifact out. Wired through the
 * Sovereign Agent's 6-stage pipeline, then through `growSeed`.
 *
 * Determinism gate:
 *   - Kernel clock frozen at 0 for the entire run.
 *   - LLM is MockSeedLLM (no external calls). Stage 1 / Stage 3 fall
 *     through to their deterministic heuristic paths.
 *   - Memory is freshly-allocated and ephemeral.
 *   - Output directory is content-addressed by intent hash.
 *
 * Library function: `runMake(opts)` is used by both the CLI and the
 * Vitest fixture for the determinism gate.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { setKernelClockMode } from '../../src/lib/kernel/clock';
import { growSeed, type Seed, type Artifact } from '../../src/lib/kernel/engines';
import { createSovereignAgent } from '../../src/lib/intelligence/agent/orchestrator';
import { MockSeedLLM } from '../../src/lib/intelligence/llm/base';
import { createMemoryOrchestrator } from '../../src/lib/intelligence/memory';

const CLI_VERSION = '0.1.0';
const MANIFEST_SCHEMA = 'https://paradigm.ai/schema/maker-manifest/v1';

export interface MakeOptions {
  /** Natural-language intent. */
  intent: string;
  /** Output directory. Defaults to `dist/make/<intent-hash-16>/`. */
  out?: string;
  /** Skip Stage-5 validation. Default false. */
  noValidate?: boolean;
  /**
   * Disable side-effects (file write). The manifest is still computed
   * and returned. Useful for the determinism gate.
   */
  dryRun?: boolean;
  /**
   * Print machine-readable JSON to stdout on success. Default false
   * (CLI prints a human summary).
   */
  json?: boolean;
}

export interface MakeManifest {
  schema: typeof MANIFEST_SCHEMA;
  intent: string;
  intentHash: string;
  domain: string;
  seedHash: string;
  artifactHash: string;
  /** Was the Stage-5 oracle satisfied? */
  validated: boolean;
  /** Was the seed signed? */
  signed: boolean;
  /** Stage timings (deterministic kernel-counter values, not wall-clock). */
  timings: Record<string, number>;
  cliVersion: string;
  /** Always 0 — kernel clock was frozen for the entire run. */
  createdAt: 0;
  /** Output directory (absolute path). */
  // outDir: string; // non-canonical side field
}

/**
 * Library entry point. Pure (modulo file IO if dryRun=false).
 *
 * Throws on:
 *   - empty intent
 *   - generator dispatch failure for the resolved domain
 */
export async function runMake(opts: MakeOptions): Promise<MakeManifest> {
  if (!opts.intent || !opts.intent.trim()) {
    throw new Error('paradigm make: intent is required and must be non-empty');
  }

  const intent = opts.intent.trim();
  const intentHash = sha256(intent);
  const outDir = resolve(opts.out ?? join('dist', 'make', intentHash.slice(0, 16)));

  // Freeze the kernel clock for the entire run.
  // (The cli/ tree is not under the determinism-boundary lint root, so
  // calling setKernelClockMode here is allowed.)
  const prevMode = 'wall';
  setKernelClockMode('frozen', 0);

  try {
    const llm = new MockSeedLLM({ provider: 'mock', model: 'mock-v1' });
    const memory = createMemoryOrchestrator();
    const agent = createSovereignAgent({ llm, memory });

    const report = await agent.run(intent, {
      liveContext: { enabled: false },
      skipValidate: opts.noValidate,
      ephemeral: true,
      // No feedback loop — single-shot for determinism.
    });

    const seed = report.seed;
    const seedHash = seed.$hash ?? sha256(`paradigm:seed:${intent}`);
    if (!seed.$hash) {
      (seed as { $hash?: string }).$hash = seedHash;
    }

    const artifact = await growSeed(seed);
    const artifactJson = canonicalArtifactJson(artifact);
    const artifactHash = sha256(artifactJson);

    const validated = report.validated?.passed ?? false;
    const signed = !!report.validated?.signature;

    const manifest: MakeManifest = {
      schema: MANIFEST_SCHEMA,
      intent,
      intentHash,
      domain: seed.$domain ?? 'unknown',
      seedHash,
      artifactHash,
      validated,
      signed,
      timings: report.timings,
      cliVersion: CLI_VERSION,
      createdAt: 0,
    };

    if (!opts.dryRun) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'intent.txt'), intent + '\n');
      writeFileSync(join(outDir, 'seed.json'), stableJsonStringify(seed) + '\n');
      writeFileSync(join(outDir, 'artifact.json'), artifactJson + '\n');
      writeFileSync(join(outDir, 'manifest.json'), stableJsonStringify(manifest) + '\n');
      const metadata = {
        schema: 'https://paradigm.ai/schema/maker-metadata/v1',
        outDir,
        cliVersion: CLI_VERSION,
        runtimeNode: process.version,
      };
      writeFileSync(join(outDir, 'metadata.json'), stableJsonStringify(metadata) + '\n');
    }

    return manifest;
  } finally {
    setKernelClockMode(prevMode);
  }
}

// ─── helpers ────────────────────────────────────────────────────────────────

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * Canonical JSON serialization for the Artifact. Sorts keys recursively;
 * strips fields known to be non-deterministic (none currently — growSeed
 * already runs under the frozen kernel clock — but the strip-list is the
 * single point where future drift can be neutralized).
 */
function canonicalArtifactJson(artifact: Artifact): string {
  return stableJsonStringify(stripNonDeterministicFields(artifact));
}

function stripNonDeterministicFields(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripNonDeterministicFields);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    // Keys known to vary across runs even under frozen clock.
    if (k === 'createdAt' || k === 'timestamp' || k === 'tempPath') continue;
    out[k] = stripNonDeterministicFields(v);
  }
  return out;
}

/** Deterministic JSON: object keys sorted alphabetically, 2-space indent. */
export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(value, sortedReplacer(), 2);
}

function sortedReplacer() {
  return (_key: string, val: unknown): unknown => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.keys(val as Record<string, unknown>).sort().map((k) => [k, (val as Record<string, unknown>)[k]]),
      );
    }
    return val;
  };
}

// ─── CLI wrapper ────────────────────────────────────────────────────────────

export interface CliResult {
  manifest: MakeManifest;
  /** Human-readable single-line summary. */
  summary: string;
}

export async function makeCli(args: string[]): Promise<CliResult> {
  let out: string | undefined;
  let json = false;
  let noValidate = false;
  let dryRun = false;
  const intentParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--out') { out = args[++i]; continue; }
    if (a === '--json') { json = true; continue; }
    if (a === '--no-validate') { noValidate = true; continue; }
    if (a === '--dry-run') { dryRun = true; continue; }
    if (a.startsWith('--')) {
      throw new Error(`paradigm make: unknown flag: ${a}`);
    }
    intentParts.push(a);
  }

  const intent = intentParts.join(' ').trim();
  if (!intent) {
    throw new Error('paradigm make: intent is required\n  usage: paradigm make "<intent>" [--out dir] [--no-validate] [--dry-run] [--json]');
  }

  const manifest = await runMake({ intent, out, noValidate, dryRun, json });

  const intentHash = sha256(manifest.intent);
  const outDir = resolve(out ?? join('dist', 'make', intentHash.slice(0, 16)));

  const summary = `make: ${manifest.domain.padEnd(12)}  seed=${manifest.seedHash.slice(0, 12)}…  artifact=${manifest.artifactHash.slice(0, 12)}…  → ${out ?? 'dist/make/' + manifest.intentHash.slice(0, 16)}`;
  return { manifest, summary };
}
