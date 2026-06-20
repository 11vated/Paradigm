import { ensureNodeCanvas } from './src/lib/kernel/generators/canvas-utils';

async function main() {
  console.log('Before ensureNodeCanvas');
  await ensureNodeCanvas();
  console.log('After ensureNodeCanvas');
  
  // Check what's in the module cache
  const mod = await import('node:module');
  const req = mod.createRequire(import.meta.url);
  const canvas = req('canvas');
  console.log('Canvas module:', canvas);
}

main().catch(console.error);
