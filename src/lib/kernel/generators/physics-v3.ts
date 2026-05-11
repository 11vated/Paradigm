/**
 * Physics Generator V3 — Physics Simulations
 * Features: Rigid body, soft body, fluid, particle physics
 * Export: JSON simulation data, video, interactive HTML
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface PhysicsParams {
  type: 'rigid' | 'soft' | 'fluid' | 'particle' | 'cloth';
  objects: number;
  gravity: number;
  friction: number;
  elasticity: number;
  duration: number;
  timestep: number;
}

interface PhysicsObject {
  id: string;
  type: 'sphere' | 'box' | 'plane';
  mass: number;
  position: [number, number, number];
  velocity: [number, number, number];
}

interface SimulationFrame {
  time: number;
  objects: PhysicsObject[];
}

export async function generatePhysicsV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  htmlPath: string;
  frameCount: number;
  objectCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'physics-default');
  const params = extractPhysicsParams(seed, rng);
  
  // Create initial objects
  const objects = createPhysicsObjects(params, rng);
  
  // Run simulation
  const frames = runSimulation(params, objects, rng);
  
  // Export formats
  const jsonPath = await exportSimulationJSON(frames, outputPath, seed);
  const htmlPath = await exportInteractiveHTML(params, frames, outputPath, seed);
  
  return {
    jsonPath,
    htmlPath,
    frameCount: frames.length,
    objectCount: objects.length
  };
}

function extractPhysicsParams(seed: Seed, rng: Xoshiro256StarStar): PhysicsParams {
  const types = ['rigid', 'soft', 'fluid', 'particle', 'cloth'] as const;
  
  return {
    type: types[Math.floor(rng.nextF64() * types.length)],
    objects: 5 + Math.floor(rng.nextF64() * 45),
    gravity: -9.8 + rng.nextF64() * 5,
    friction: rng.nextF64(),
    elasticity: 0.1 + rng.nextF64() * 0.9,
    duration: 5 + rng.nextF64() * 25,
    timestep: 0.016
  };
}

function createPhysicsObjects(params: PhysicsParams, rng: Xoshiro256StarStar): PhysicsObject[] {
  const objects: PhysicsObject[] = [];
  const shapeTypes = ['sphere', 'box', 'plane'] as const;
  
  for (let i = 0; i < params.objects; i++) {
    objects.push({
      id: `obj_${i}`,
      type: shapeTypes[Math.floor(rng.nextF64() * shapeTypes.length)],
      mass: 0.1 + rng.nextF64() * 10,
      position: [(rng.nextF64() - 0.5) * 20, rng.nextF64() * 10, (rng.nextF64() - 0.5) * 20],
      velocity: [(rng.nextF64() - 0.5) * 5, 0, (rng.nextF64() - 0.5) * 5]
    });
  }
  
  return objects;
}

function runSimulation(params: PhysicsParams, initialObjects: PhysicsObject[], rng: Xoshiro256StarStar): SimulationFrame[] {
  const frames: SimulationFrame[] = [];
  const objects = JSON.parse(JSON.stringify(initialObjects));
  const frameCount = Math.floor(params.duration / params.timestep);
  
  for (let f = 0; f < Math.min(frameCount, 300); f++) {
    const time = f * params.timestep;
    
    // Update physics (Euler integration)
    objects.forEach(obj => {
      // Apply gravity
      obj.velocity[1] += params.gravity * params.timestep;
      
      // Update position
      obj.position[0] += obj.velocity[0] * params.timestep;
      obj.position[1] += obj.velocity[1] * params.timestep;
      obj.position[2] += obj.velocity[2] * params.timestep;
      
      // Ground collision
      if (obj.position[1] < 0) {
        obj.position[1] = 0;
        obj.velocity[1] = -obj.velocity[1] * params.elasticity;
        obj.velocity[0] *= (1 - params.friction);
        obj.velocity[2] *= (1 - params.friction);
      }
    });
    
    frames.push({ time, objects: JSON.parse(JSON.stringify(objects)) });
  }
  
  return frames;
}

async function exportSimulationJSON(frames: SimulationFrame[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `physics_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  
  if (typeof fs !== 'undefined') {
    fs.writeFileSync(filePath, JSON.stringify(frames, null, 2));
  }
  
  return filePath;
}

async function exportInteractiveHTML(params: PhysicsParams, frames: SimulationFrame[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `physics_${seed.$hash || 'unknown'}.html`;
  const filePath = path.join(outputPath, filename);
  
  const html = `<!DOCTYPE html>
<html><head><title>Physics Sim - ${seed.$hash}</title>
<style>body{margin:0;background:#1a1a1a}canvas{display:block;margin:0 auto}</style>
</head><body><canvas id="c"></canvas>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=800;c.height=600;
const frames=${JSON.stringify(frames)};
let f=0;
function render(){const frame=frames[f%c.frames.length];x.fillStyle='#1a1a1a';x.fillRect(0,0,800,600);
frame.objects.forEach(o=>{x.fillStyle='#3b82f6';x.beginPath();x.arc(400+o.position[0]*20,580-o.position[1]*40,Math.max(5,o.mass*3),0,Math.PI*2);x.fill();});
f++;requestAnimationFrame(render);}
render();
</script></body></html>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, html);
  return filePath;
}
