/**
 * Browser compatibility for server-adjacent modules that still reach the UI
 * graph during the Phase 1/Surface GA split.
 *
 * This is intentionally narrow. It exists so modules that only inspect
 * `process.env` or measure non-contract metadata can evaluate in the browser
 * without crashing React. Server-only behavior must still live behind routes
 * or throw through the existing Node shims when invoked.
 */
interface BrowserProcessShim {
  readonly browser: true;
  readonly env: Record<string, string | undefined>;
  readonly versions: Record<string, string | undefined>;
  readonly platform: string;
  readonly argv: readonly string[];
  readonly pid: number;
  readonly version: string;
  cwd: () => string;
  exit: (code?: number) => never;
  readonly hrtime: {
    bigint: () => bigint;
  };
}

declare global {
  interface Window {
    process?: BrowserProcessShim;
  }

  // Some browser-evaluated modules refer to the global identifier directly.
  // The assignment below creates the matching global property before React
  // imports the rest of the application tree.
  // NOTE: We do NOT re-declare `var process` here to avoid "subsequent declaration"
  // conflicts with bundler/Vite-injected Node Process types under "DOM" + "strict" lib.
  // Runtime globalThis + window assignment still provides the shim for direct `process.env` reads.
}

const BROWSER_ENV: Record<string, string | undefined> = {
  // import.meta.env.MODE can be string | boolean | undefined in some Vite env resolutions;
  // narrow explicitly to satisfy Record<string, string | undefined> without `any`.
  NODE_ENV: typeof import.meta.env.MODE === 'string' ? import.meta.env.MODE : undefined,
  PARADIGM_QC_VERBOSE: undefined,
};

function createBrowserProcessShim(): BrowserProcessShim {
  return {
    browser: true,
    env: BROWSER_ENV,
    versions: {},
    platform: 'browser',
    argv: [],
    pid: 0,
    version: 'browser',
    cwd: () => '/',
    exit: (code = 0): never => {
      throw new Error(`[browser-process-shim] process.exit(${code}) is server-only.`);
    },
    hrtime: {
      bigint: () => 0n,
    },
  };
}

// Narrow globalThis.process at read time to our shim type (or undefined).
// Use `unknown` intermediate per TS 2352 guidance to safely bridge the Process
// type that globalThis may carry (from bundler/DOM lib + strict) vs our BrowserProcessShim.
// Justification: runtime is always the shim or real (in Node); this is a type-level
// compatibility shim only. No `any`, no silent failure.
const existingProcess: BrowserProcessShim | undefined =
  (globalThis as unknown as { process?: BrowserProcessShim }).process;

const browserProcess = existingProcess ?? createBrowserProcessShim();

// Assign back via the same narrowed view (unknown intermediate). Runtime behavior
// unchanged (provides process.env etc. for modules evaluated in browser graph
// before full Node shims load).
(globalThis as unknown as { process?: BrowserProcessShim }).process = browserProcess;

if (typeof window !== 'undefined') {
  (window as Window & { process?: BrowserProcessShim }).process = browserProcess;
}

export {};
