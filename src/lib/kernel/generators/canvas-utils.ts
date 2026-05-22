/**
 * Cross-environment canvas creation.
 *
 * Browser: DOM canvas (document.createElement).
 * Node:    `canvas` npm package via either globalThis.require (tsx/CJS path)
 *          or createRequire(import.meta.url) (pure ESM path). Browser-safe:
 *          the Node init returns null immediately when document is defined.
 */

let _nodeCanvasModule: any | null = null;
let _nodeCanvasInitialized = false;

async function initNodeCanvas(): Promise<void> {
  if (_nodeCanvasInitialized) return;
  _nodeCanvasInitialized = true;
  if (typeof document !== 'undefined') return;

  // Path 1: tsx / CJS — require is injected as a global.
  const globalRequire = (globalThis as any).require;
  if (typeof globalRequire === 'function') {
    try { _nodeCanvasModule = globalRequire('canvas'); return; } catch { /* fall through */ }
  }

  // Path 2: pure ESM — synthesize require via node:module.
  try {
    const mod = await import('node:module');
    const req = mod.createRequire(import.meta.url);
    _nodeCanvasModule = req('canvas');
  } catch {
    _nodeCanvasModule = null;
  }
}

// Lazy initialization: initNodeCanvas() is invoked on first createCanvas()
// call in Node, never at module load. Vite/Rollup cannot statically resolve
// top-level await across a `node:module` dynamic import for the browser
// bundle, so the initialization is deferred to first use. Browser-safe: the
// browser path of createCanvas() never reaches initNodeCanvas().
let _nodeInitPromise: Promise<void> | null = null;

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document !== 'undefined') return document.createElement('canvas');
  // Node path: lazy sync init via global require (tsx/CJS). Pure-ESM consumers
  // must call `await ensureNodeCanvas()` before reaching createCanvas.
  if (!_nodeCanvasModule) {
    const globalRequire = (globalThis as { require?: NodeRequire }).require;
    if (typeof globalRequire === 'function') {
      try {
        _nodeCanvasModule = globalRequire('canvas');
        _nodeCanvasInitialized = true;
      } catch { /* fall through */ }
    }
  }
  if (!_nodeCanvasModule) throw new Error('Canvas not available. Install/build the "canvas" package for Node.js usage, or call `await ensureNodeCanvas()` first.');
  return _nodeCanvasModule.createCanvas(width, height) as unknown as HTMLCanvasElement;
}

/** Public lazy initializer for pure-ESM Node consumers. Safe to await in the browser. */
export function ensureNodeCanvas(): Promise<void> {
  if (_nodeCanvasInitialized) return Promise.resolve();
  if (!_nodeInitPromise) _nodeInitPromise = initNodeCanvas();
  return _nodeInitPromise;
}

export function isBrowser(): boolean {
  return typeof document !== 'undefined';
}

export function isCanvasAvailable(): boolean {
  if (typeof document !== 'undefined') return true;
  return _nodeCanvasModule !== null;
}
