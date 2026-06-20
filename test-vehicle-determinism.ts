import { generateVehicle } from './src/lib/kernel/generators/vehicle.ts';
import { ensureNodeCanvas } from './src/lib/kernel/generators/canvas-utils.ts';
import { promises as fs } from 'fs';
import path from 'path';

async function main() {
  await ensureNodeCanvas();
  
  const seed = { $domain: 'vehicle', $name: 'test', $hash: 'vehicle-test-001', genes: {} };
  
  const dir1 = '/tmp/vehicle-test-1';
  const dir2 = '/tmp/vehicle-test-2';
  await fs.mkdir(dir1, { recursive: true });
  await fs.mkdir(dir2, { recursive: true });

  const r1 = await generateVehicle({ $domain: 'vehicle', $name: 'test', $hash: 'vehicle-test-001', genes: {} }, dir1);
  const r2 = await generateVehicle({ $domain: 'vehicle', $name: 'test', $hash: 'vehicle-test-001', genes: {} }, dir2);

  const gltf1 = await fs.readFile(r1.gltfPath, 'utf8');
  const gltf2 = await fs.readFile(r2.gltfPath, 'utf8');
  console.log('Gltf match:', gltf1 === gltf2);
  console.log('Length:', gltf1.length, gltf2.length);
}

main().catch(console.error);
