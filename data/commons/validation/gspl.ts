// seed-commons/validation/_shared/gspl.ts
//
// Thin Deno wrapper over the GSPL compiler WASM build. Loads the compiler
// once per process and exposes `grow(sourcePath, rngSeed)` that returns a
// fully populated seed payload (not yet signed).
//
// The WASM binary is produced by `tools/gspl-compiler/build-wasm.sh` and
// checked into `tools/gspl-compiler/gspl.wasm` with a pinned SHA-256 digest
// verified on load so a tampered compiler cannot slip through CI.

import { canonicalize, canonicalHash } from "./canonical.ts";

const WASM_PATH = new URL(
  "../../../tools/gspl-compiler/gspl.wasm",
  import.meta.url,
);
const EXPECTED_WASM_SHA256 =
  "sha256:PLACEHOLDER_PIN_AFTER_FIRST_BUILD_DO_NOT_HAND_EDIT";

let compilerInstance: GsplCompiler | null = null;

export interface GsplCompiler {
  grow(source: string, opts: GrowOptions): Promise<GrowResult>;
  version(): string;
}

export interface GrowOptions {
  rngSeed: string;
  moduleRoots: string[];
  /** If set, the compiler refuses to make any side-effectful call. */
  pure: boolean;
  /** If set, the compiler refuses to import any non-allowlisted module. */
  importAllowlist?: string[];
}

export interface GrowResult {
  /** The fully populated JSON payload ready for JCS canonicalization. */
  payload: unknown;
  /** All modules the compilation actually touched (for lineage). */
  importsUsed: string[];
  /** The compiler version string, embedded in the grow result. */
  compilerVersion: string;
}

/** Load the GSPL compiler once and return the shared instance. */
export async function loadCompiler(): Promise<GsplCompiler> {
  if (compilerInstance) return compilerInstance;

  const wasmBytes = await Deno.readFile(WASM_PATH);
  const actualHash = await canonicalHash(
    // hash the raw bytes by wrapping as a "string" value
    Array.from(wasmBytes),
  );
  if (actualHash !== EXPECTED_WASM_SHA256) {
    throw new CompilerIntegrityError(
      `gspl.wasm hash mismatch: expected ${EXPECTED_WASM_SHA256}, got ${actualHash}`,
    );
  }

  const module = await WebAssembly.compile(wasmBytes);
  const inst = await WebAssembly.instantiate(module, {});
  compilerInstance = wrapInstance(inst);
  return compilerInstance;
}

/** Grow a `.gspl` file deterministically. */
export async function grow(
  sourcePath: string,
  opts: GrowOptions,
): Promise<GrowResult> {
  const compiler = await loadCompiler();
  const source = await Deno.readTextFile(sourcePath);
  return compiler.grow(source, opts);
}

/**
 * Grow the same file twice and return true iff the two canonicalized
 * payloads are byte-identical. This is the core determinism check.
 */
export async function growTwiceIdentical(
  sourcePath: string,
  opts: GrowOptions,
): Promise<boolean> {
  const a = await grow(sourcePath, opts);
  const b = await grow(sourcePath, opts);
  return canonicalize(a.payload) === canonicalize(b.payload);
}

export class CompilerIntegrityError extends Error {}
export class CompilerNotBuiltError extends Error {}

// ---------- private ----------

function wrapInstance(
  _inst: WebAssembly.Instance,
): GsplCompiler {
  // The WASM ABI is documented in tools/gspl-compiler/ABI.md. This wrapper is
  // a placeholder stub — the runtime wiring lands when the compiler ships.
  return {
    grow(_source: string, _opts: GrowOptions): Promise<GrowResult> {
      throw new CompilerNotBuiltError(
        "GSPL compiler WASM build not yet available; see tools/gspl-compiler/build-wasm.sh",
      );
    },
    version(): string {
      return "gspl-compiler@stub";
    },
  };
}
