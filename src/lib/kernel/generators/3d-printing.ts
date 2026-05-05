/**
 * 3D Printing Generator — produces 3D printing systems
 * FDM, SLA, SLS, metal printing
 * $0.3T market: 3D Printing
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface Printing3DParams {
  technology: 'fdm' | 'sla' | 'sls' | 'metal';
  buildVolume: number; // liters
  resolution: number; // microns
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generate3DPrinting(seed: Seed, outputPath: string): Promise<{ filePath: string; modelPath: string; technology: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate actual 3D model (simplified geometric shape based on tech)
  const model = generate3DModel(params, rng);

  const config = {
    printing3D: { technology: params.technology, buildVolume: params.buildVolume, resolution: params.resolution, quality: params.quality },
    materials: { type: params.technology === 'metal' ? ['stainless_steel', 'titanium', 'aluminum'][rng.nextInt(0, 2)] : ['pla', 'abs', 'resin', 'nylon'][rng.nextInt(0, 3)], spoolCost: rng.nextF64() * 100 + 20 },
    speed: { printSpeed: rng.nextF64() * 200 + 50, layerHeight: rng.nextF64() * 0.2 + 0.1, raft: rng.nextF64() > 0.5 },
    economics: { machineCost: rng.nextF64() * 10000 + 500, operatingCost: rng.nextF64() * 10 + 1, roi: rng.nextF64() * 3 + 1 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_3d_printing.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // Write binary STL (80 byte header + triangle count + triangle data)
  const stlBuffer = buildBinarySTL(model);
  const modelPath = outputPath.replace(/\.json$/, '.stl');
  fs.writeFileSync(modelPath, stlBuffer);

  return { filePath: jsonPath, modelPath, technology: params.technology };
}

interface Triangle { normal: [number, number, number]; v1: [number, number, number]; v2: [number, number, number]; v3: [number, number, number] }

function generate3DModel(params: Printing3DParams, rng: Xoshiro256StarStar): Triangle[] {
  const triangles: Triangle[] = [];
  const { buildVolume } = params;
  const scale = Math.pow(buildVolume, 1/3) * 10; // Rough size in mm

  if (params.technology === 'fdm' || params.technology === 'sla') {
    // Generate a simple cube with rounded edges
    const size = scale * 0.8;
    const steps = Math.floor(rng.nextF64() * 20) + 10;
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        const x = (i / steps - 0.5) * size;
        const y = (j / steps - 0.5) * size;
        const z = rng.nextF64() * size - size/2;
        // Create two triangles per quad
        if (i < steps - 1 && j < steps - 1) {
          triangles.push({
            normal: [0, 0, 1],
            v1: [x, y, z],
            v2: [x + size/steps, y, z],
            v3: [x, y + size/steps, z]
          });
          triangles.push({
            normal: [0, 0, 1],
            v1: [x + size/steps, y, z],
            v2: [x + size/steps, y + size/steps, z],
            v3: [x, y + size/steps, z]
          });
        }
      }
    }
  } else {
    // Metal/SLS: generate a cylinder
    const radius = scale * 0.3;
    const height = scale * 0.6;
    const segments = Math.floor(rng.nextF64() * 30) + 16;
    for (let i = 0; i < segments; i++) {
      const angle1 = (i / segments) * Math.PI * 2;
      const angle2 = ((i + 1) / segments) * Math.PI * 2;
      const x1 = Math.cos(angle1) * radius;
      const y1 = Math.sin(angle1) * radius;
      const x2 = Math.cos(angle2) * radius;
      const y2 = Math.sin(angle2) * radius;
      triangles.push({
        normal: [Math.cos(angle1), Math.sin(angle1), 0],
        v1: [x1, y1, -height/2],
        v2: [x2, y2, -height/2],
        v3: [x1, y1, height/2]
      });
      triangles.push({
        normal: [Math.cos(angle1), Math.sin(angle1), 0],
        v1: [x2, y2, -height/2],
        v2: [x2, y2, height/2],
        v3: [x1, y1, height/2]
      });
    }
  }
  return triangles;
}

function buildBinarySTL(triangles: Triangle[]): Buffer {
  const buffer = Buffer.alloc(80 + 4 + triangles.length * 50); // 50 bytes per triangle
  // Header (80 bytes)
  Buffer.from('Paradigm GSPL Beyond Omega 3D Print').copy(buffer, 0);
  // Triangle count (4 bytes, little-endian)
  buffer.writeUInt32LE(triangles.length, 80);

  triangles.forEach((tri, idx) => {
    const offset = 84 + idx * 50;
    // Normal vector (3 x 4 bytes)
    buffer.writeFloatLE(tri.normal[0], offset);
    buffer.writeFloatLE(tri.normal[1], offset + 4);
    buffer.writeFloatLE(tri.normal[2], offset + 8);
    // Vertex 1
    buffer.writeFloatLE(tri.v1[0], offset + 12);
    buffer.writeFloatLE(tri.v1[1], offset + 16);    buffer.writeFloatLE(tri.v1[2], offset + 20);
    // Vertex 2
    buffer.writeFloatLE(tri.v2[0], offset + 24);    buffer.writeFloatLE(tri.v2[1], offset + 28);    buffer.writeFloatLE(tri.v2[2], offset + 32);
    // Vertex 3
    buffer.writeFloatLE(tri.v3[0], offset + 36);    buffer.writeFloatLE(tri.v3[1], offset + 40);    buffer.writeFloatLE(tri.v3[2], offset + 44);
    // Attribute byte count (2 bytes, usually 0)
    buffer.writeUInt16LE(0, offset + 48);
  });

  return buffer;
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): Printing3DParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    technology: seed.genes?.technology?.value || ['fdm', 'sla', 'sls', 'metal'][rng.nextInt(0, 3)],
    buildVolume: Math.floor(((seed.genes?.buildVolume?.value as number || rng.nextF64()) * 990) + 10),
    resolution: Math.floor(((seed.genes?.resolution?.value as number || rng.nextF64()) * 190) + 10),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
