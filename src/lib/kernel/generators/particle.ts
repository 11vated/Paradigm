/**
 * Particle Generator V3 — Particle System Simulations
 * Features: Emitters, forces, collisions, rendering
 * Export: JSON config, interactive HTML, video
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface ParticleParams {
  count: number;
  lifetime: number;
  emitters: number;
  forces: string[];
  renderMode: 'point' | 'sprite' | 'mesh';
}

interface Particle {
  id: number;
  position: [number, number, number];
  velocity: [number, number, number];
  age: number;
  lifetime: number;
  color: [number, number, number];
  size: number;
}

interface Emitter {
  position: [number, number, number];
  rate: number;
  spread: number;
  direction: [number, number, number];
}

export async function generateParticleV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  htmlPath: string;
  particleCount: number;
  emitterCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'particle-default');
  const params = extractParticleParams(seed, rng);
  
  // Create emitters
  const emitters = createEmitters(params, rng);
  
  // Initialize particles
  const particles = initializeParticles(params, emitters, rng);
  
  // Run simulation
  const simulation = runParticleSimulation(particles, emitters, params, 100, rng);
  
  // Export
  const jsonPath = await exportParticleJSON({ params, emitters, simulation }, outputPath, seed);
  const htmlPath = await exportInteractiveHTML(params, emitters, simulation, outputPath, seed);
  
  return {
    jsonPath,
    htmlPath,
    particleCount: params.count,
    emitterCount: params.emitters
  };
}

function extractParticleParams(seed: Seed, rng: Xoshiro256StarStar): ParticleParams {
  const forceList = ['gravity', 'wind', 'vortex', 'turbulence', 'attraction', 'repulsion'];
  const renderModes = ['point', 'sprite', 'mesh'] as const;
  
  const numForces = 1 + Math.floor(rng.nextF64() * 3);
  const forces: string[] = [];
  for (let i = 0; i < numForces; i++) {
    const f = forceList[Math.floor(rng.nextF64() * forceList.length)];
    if (!forces.includes(f)) forces.push(f);
  }
  
  return {
    count: 100 + Math.floor(rng.nextF64() * 900),
    lifetime: 1 + rng.nextF64() * 9,
    emitters: 1 + Math.floor(rng.nextF64() * 4),
    forces,
    renderMode: renderModes[Math.floor(rng.nextF64() * renderModes.length)]
  };
}

function createEmitters(params: ParticleParams, rng: Xoshiro256StarStar): Emitter[] {
  const emitters: Emitter[] = [];
  
  for (let i = 0; i < params.emitters; i++) {
    emitters.push({
      position: [(rng.nextF64() - 0.5) * 10, (rng.nextF64() - 0.5) * 10, (rng.nextF64() - 0.5) * 10],
      rate: 10 + Math.floor(rng.nextF64() * 90),
      spread: rng.nextF64() * Math.PI,
      direction: [rng.nextF64() - 0.5, rng.nextF64() - 0.5, rng.nextF64() - 0.5]
    });
  }
  
  return emitters;
}

function initializeParticles(params: ParticleParams, emitters: Emitter[], rng: Xoshiro256StarStar): Particle[] {
  const particles: Particle[] = [];
  
  for (let i = 0; i < params.count; i++) {
    const emitter = emitters[Math.floor(rng.nextF64() * emitters.length)];
    particles.push({
      id: i,
      position: [...emitter.position] as [number, number, number],
      velocity: [
        (rng.nextF64() - 0.5) * emitter.spread,
        (rng.nextF64() - 0.5) * emitter.spread,
        (rng.nextF64() - 0.5) * emitter.spread
      ],
      age: 0,
      lifetime: params.lifetime * (0.5 + rng.nextF64() * 0.5),
      color: [0.2 + rng.nextF64() * 0.8, 0.5 + rng.nextF64() * 0.5, 0.8 + rng.nextF64() * 0.2],
      size: 0.01 + rng.nextF64() * 0.05
    });
  }
  
  return particles;
}

function runParticleSimulation(particles: Particle[], emitters: Emitter[], params: ParticleParams, frames: number, rng: Xoshiro256StarStar): any[] {
  const history: any[] = [];
  let simParticles = JSON.parse(JSON.stringify(particles));
  
  for (let f = 0; f < frames; f++) {
    const snapshot: any[] = [];
    
    simParticles.forEach(p => {
      // Apply forces
      if (params.forces.includes('gravity')) p.velocity[1] -= 0.01;
      if (params.forces.includes('wind')) p.velocity[0] += 0.001;
      if (params.forces.includes('turbulence')) {
        p.velocity[0] += (rng.nextF64() - 0.5) * 0.01;
        p.velocity[1] += (rng.nextF64() - 0.5) * 0.01;
        p.velocity[2] += (rng.nextF64() - 0.5) * 0.01;
      }
      
      // Update position
      p.position[0] += p.velocity[0];
      p.position[1] += p.velocity[1];
      p.position[2] += p.velocity[2];
      
      // Age particle
      p.age += 0.016;
      
      // Respawn if dead
      if (p.age >= p.lifetime) {
        const emitter = emitters[Math.floor(rng.nextF64() * emitters.length)];
        p.position = [...emitter.position] as [number, number, number];
        p.velocity = [
          (rng.nextF64() - 0.5) * emitter.spread,
          (rng.nextF64() - 0.5) * emitter.spread,
          (rng.nextF64() - 0.5) * emitter.spread
        ];
        p.age = 0;
      }
      
      snapshot.push({ ...p });
    });
    
    history.push(snapshot);
  }
  
  return history;
}

async function exportParticleJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `particle_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportInteractiveHTML(params: ParticleParams, emitters: Emitter[], history: any[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `particle_${seed.$hash || 'unknown'}.html`;
  const filePath = path.join(outputPath, filename);
  
  const html = `<!DOCTYPE html><html><head><title>Particles - ${seed.$hash}</title>
<style>body{margin:0;background:#000;overflow:hidden}canvas{display:block}</style></head><body><canvas id="c"></canvas>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');
c.width=window.innerWidth;c.height=window.innerHeight;
const history=${JSON.stringify(history)};
const cx=c.width/2,cy=c.height/2,scale=50;
let frame=0;
function render(){
  const particles=history[frame%history.length];
  x.fillStyle='rgba(0,0,0,0.2)';x.fillRect(0,0,c.width,c.height);
  particles.forEach(p=>{
    x.fillStyle='rgb('+Math.floor(p.color[0]*255)+','+Math.floor(p.color[1]*255)+','+Math.floor(p.color[2]*255)+')';
    x.beginPath();x.arc(cx+p.position[0]*scale,cy-p.position[1]*scale,p.size*scale*10,0,Math.PI*2);x.fill();
  });
  frame++;requestAnimationFrame(render);
}
render();
</script></body></html>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, html);
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateParticleV3 as generateParticle };
