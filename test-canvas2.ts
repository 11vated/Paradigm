import { initNodeCanvas } from './src/lib/kernel/generators/canvas-utils';

async function main() {
  console.log('Before initNodeCanvas');
  await initNodeCanvas();
  console.log('After initNodeCanvas');
  
  const mod = await import('node:module');
  const req = mod.createRequire(import.meta.url);
  const canvas = req('canvas');
  console.log('Canvas module:', canvas);
}

main().catch(console.error);
