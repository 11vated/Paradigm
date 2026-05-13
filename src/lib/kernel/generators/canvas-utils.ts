/**
 * Cross-environment canvas creation.
 * Uses node-canvas in Node.js, DOM canvas in browser.
 */

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  if (typeof document !== 'undefined') {
    return document.createElement('canvas');
  }
  try {
    const mod = require('canvas') as any;
    const c = mod.createCanvas(width, height);
    return c as unknown as HTMLCanvasElement;
  } catch {
    throw new Error('Canvas not available. Install the "canvas" package for Node.js usage.');
  }
}

export function isBrowser(): boolean {
  return typeof document !== 'undefined';
}
