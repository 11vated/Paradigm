/**
 * Cross-environment canvas creation.
 * Browser: DOM canvas. Node: `canvas` npm package (lazy-loaded via createRequire
 * so it works under ESM "type":"module" projects).
 */
import { createRequire } from 'module';

let _nodeCanvasModule: any | null = null;
let _nodeCanvasProbed = false;

function getNodeCanvas(): any {
  if (_nodeCanvasProbed) return _nodeCanvasModule;
  _nodeCanvasProbed = true;
  try {
    const req = createRequire(import.meta.url);
    _nodeCanvasModule = req('canvas');
  } catch {
    _nodeCanvasModule = null;
  }
  return _nodeCanvasModule;
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document !== 'undefined') return document.createElement('canvas');
  const mod = getNodeCanvas();
  if (!mod) throw new Error('Canvas not available. Install/build the "canvas" package for Node.js usage.');
  return mod.createCanvas(width, height) as unknown as HTMLCanvasElement;
}

export function isBrowser(): boolean {
  return typeof document !== 'undefined';
}

export function isCanvasAvailable(): boolean {
  if (typeof document !== 'undefined') return true;
  return getNodeCanvas() !== null;
}
