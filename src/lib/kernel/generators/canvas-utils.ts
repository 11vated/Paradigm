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

// Eagerly initialize at module load. Browser-safe: returns immediately when
// document is defined. Vite/Rollup's static analyzer handles the dynamic
// import gracefully (it's preserved as a runtime import).
await initNodeCanvas();

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document !== 'undefined') return document.createElement('canvas');
  if (!_nodeCanvasModule) throw new Error('Canvas not available. Install/build the "canvas" package for Node.js usage.');
  return _nodeCanvasModule.createCanvas(width, height) as unknown as HTMLCanvasElement;
}

export function isBrowser(): boolean {
  return typeof document !== 'undefined';
}

export function isCanvasAvailable(): boolean {
  if (typeof document !== 'undefined') return true;
  return _nodeCanvasModule !== null;
}
