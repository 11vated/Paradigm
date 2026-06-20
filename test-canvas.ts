import { ensureNodeCanvas, isCanvasAvailable } from './src/lib/kernel/generators/canvas-utils';

async function main() {
  console.log('Before ensureNodeCanvas:', isCanvasAvailable());
  await ensureNodeCanvas();
  console.log('After ensureNodeCanvas:', isCanvasAvailable());
  
  // Try to create a canvas
  const { createCanvas } = await import('./src/lib/kernel/generators/canvas-utils');
  const canvas = createCanvas(100, 100);
  console.log('Canvas created:', canvas);
}

main().catch(console.error);
