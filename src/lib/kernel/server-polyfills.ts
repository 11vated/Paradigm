
import { JSDOM } from 'jsdom';

/**
 * Paradigm Absolute — Server-Side Browser Polyfills
 * This module provides JSDOM-based polyfills for browser APIs (DOM, Canvas)
 * to enable domain generators (like character-v3) to run in Node.js.
 */
export function initServerPolyfills() {
  if (typeof global.window !== 'undefined') return;

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    pretendToBeVisual: true,
    hasSubresources: false,
    resources: 'usable',
  });

  global.window = dom.window as any;
  global.document = dom.window.document;
  global.navigator = dom.window.navigator;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLCanvasElement = dom.window.HTMLCanvasElement;
  global.CanvasRenderingContext2D = dom.window.CanvasRenderingContext2D;
  global.ImageData = dom.window.ImageData;
  global.Blob = dom.window.Blob;
  global.File = dom.window.File;

  // Mock requestAnimationFrame for Three.js and animations
  global.requestAnimationFrame = (callback) => setTimeout(callback, 1000 / 60);
  global.cancelAnimationFrame = (id) => clearTimeout(id);

  // Add basic CSS support for Three.js
  (global.window as any).CSS = {
    supports: () => true,
  };

  console.log('[Polyfills] Server-side browser APIs initialized via JSDOM');
}
