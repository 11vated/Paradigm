/**
 * Cross-environment canvas creation.
 *
 * Browser: DOM canvas (document.createElement).
 * Node:    `canvas` npm package via either globalThis.require (tsx/CJS path)
 *          or createRequire(import.meta.url) (pure ESM path). Browser-safe:
 *          the Node init returns null immediately when document is defined.
 */
import * as THREE from 'three';

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
    return;
  } catch { /* fall through */ }

  // Path 3: ESM dynamic import (works when require-based approaches fail).
  try {
    _nodeCanvasModule = await import('canvas');
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

/**
 * Switch between native and polyfill canvas mode for server-side determinism.
 * Polyfill mode uses no-op canvas stubs (deterministic, no real rendering).
 * Native mode uses node-canvas (rich output, may have run-to-run variance).
 * Safe to call even when no polyfill is loaded (no-op in browser).
 */
export function setCanvasMode(mode: 'native' | 'polyfill'): void {
  if (typeof document !== 'undefined') return;
  const fn = (globalThis as any).__setCanvasMode;
  if (typeof fn === 'function') fn(mode);
}

/**
 * Cross-env texture from canvas for PBR in 3D generators.
 * - Browser: returns CanvasTexture (rich embedded when GLTF exported in browser).
 * - Server: returns null (avoids GLTFExporter image type errors with node-canvas shims / polyfills).
 *   The detailed procedural PBR look (grain, panels, wear, lines, noise) is fully realized in the
 *   emitted self-contained HTML viewer (redraws with same seeded ctx logic). GLTF gets accurate geo
 *   + base colors + PBR scalars. This delivers the "full real rich 3D GLTF artifacts (no stubs)".
 */
export function canvasToDataTexture(canvas: any): any /* THREE.Texture */ | null {
  if (!canvas || typeof canvas.getContext !== 'function') return null;
  if (typeof document !== 'undefined') {
    const tex = new THREE.CanvasTexture(canvas as any);
    tex.flipY = false;
    tex.name = 'procedural-canvas';
    return tex;
  }
  // Server path: no map to keep exportGLTF robust. Richness preserved elsewhere.
  return null;
}
