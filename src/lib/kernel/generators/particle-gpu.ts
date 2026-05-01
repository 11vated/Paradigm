/**
 * Particle Generator — produces GPU-ready particle systems
 * Enhanced with WebGL/WebGPU compute shaders
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface ParticleParams {
  count: number;
  emitterType: string;
  particleType: string;
  lifetime: number;
  speed: number;
  spread: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateParticleGPU(seed: Seed, outputPath: string): Promise<{ filePath: string; glslPath: string; webgpuPath: string; particleCount: number }> {
  const params = extractParams(seed);

  // Generate particle system config
  const config = {
    particleSystem: {
      count: params.count,
      emitterType: params.emitterType,
      particleType: params.particleType,
      lifetime: params.lifetime,
      speed: params.speed,
      spread: params.spread,
      quality: params.quality
    },
    emitters: generateEmitters(params),
    particles: generateParticles(params),
    gpuShaders: {
      vertex: 'particle-vertex.glsl',
      fragment: 'particle-fragment.glsl',
      compute: params.quality === 'photorealistic' ? 'particle-compute.wgsl' : undefined
    },
    qualitySettings: getQualitySettings(params.quality)
  };

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write main config
  const configPath = outputPath.replace(/\.json$/, '_gpu.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Write GLSL shaders
  const vertexPath = path.join(dir, 'particle-vertex.glsl');
  fs.writeFileSync(vertexPath, generateVertexShader());

  const fragmentPath = path.join(dir, 'particle-fragment.glsl');
  fs.writeFileSync(fragmentPath, generateFragmentShader());

  // Write WebGPU compute shader for photorealistic quality
  let webgpuPath = '';
  if (params.quality === 'photorealistic') {
    webgpuPath = path.join(dir, 'particle-compute.wgsl');
    fs.writeFileSync(webgpuPath, generateComputeShader());
  }

  return {
    filePath: configPath,
    glslPath: vertexPath,
    webgpuPath,
    particleCount: params.count
  };
}

function generateEmitters(params: ParticleParams): any[] {
  return [
    {
      type: params.emitterType,
      position: [0, 0, 0],
      rate: params.count / 100, // particles per second
      initialVelocity: [0, params.speed, 0],
      spread: params.spread
    }
  ];
}

function generateParticles(params: ParticleParams): any[] {
  const particles = [];
  for (let i = 0; i < params.count; i++) {
    particles.push({
      id: `particle_${i}`,
      position: [0, 0, 0],
      velocity: generateRandomVelocity(params.speed, params.spread),
      lifetime: params.lifetime * (0.5 + Math.random() * 0.5),
      age: 0,
      size: 0.1 + Math.random() * 0.5,
      color: generateRandomColor(params.particleType),
      alive: true
    });
  }
  return particles;
}

function generateRandomVelocity(speed: number, spread: number): number[] {
  const theta = Math.random() * Math.PI * 2;
  const phi = (Math.random() - 0.5) * spread;
  return [
    Math.cos(theta) * Math.sin(phi) * speed,
    Math.cos(phi) * speed,
    Math.sin(theta) * Math.sin(phi) * speed
  ];
}

function generateRandomColor(type: string): number[] {
  const colors: Record<string, number[]> = {
    fire: [1.0, 0.5, 0.0, 1.0],
    smoke: [0.5, 0.5, 0.5, 0.5],
    spark: [1.0, 1.0, 0.0, 1.0],
    magic: [0.5, 0.0, 1.0, 1.0],
    water: [0.0, 0.5, 1.0, 0.8]
  };
  return colors[type] || [1.0, 1.0, 1.0, 1.0];
}

function generateVertexShader(): string {
  return `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aVelocity;
in float aLifetime;
in float aAge;
in float aSize;
in vec4 aColor;

uniform mat4 uProjection;
uniform mat4 uView;
uniform float uTime;

out vec4 vColor;
out float vAlpha;

void main() {
  // Update position based on velocity and time
  vec3 position = aPosition + aVelocity * uTime;
  
  // Calculate alpha based on lifetime
  float lifeRatio = aAge / aLifetime;
  vAlpha = 1.0 - lifeRatio;
  
  // Pass color
  vColor = aColor;
  
  // Transform position
  gl_Position = uProjection * uView * vec4(position, 1.0);
  gl_PointSize = aSize * vAlpha * 100.0;
}
`;
}

function generateFragmentShader(): string {
  return `#version 300 es
precision highp float;

in vec4 vColor;
in float vAlpha;
out vec4 fragColor;

void main() {
  // Circular particle
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;
  
  // Smooth edge
  float alpha = smoothstep(0.5, 0.3, dist) * vAlpha;
  fragColor = vec4(vColor.rgb, vColor.a * alpha);
}
`;
}

function generateComputeShader(): string {
  return `// WebGPU Compute Shader for particle simulation
// Runs on GPU for massive parallelism

struct Particle {
  position: vec3<f32>,
  velocity: vec3<f32>,
  lifetime: f32,
  age: f32,
  size: f32,
  color: vec4<f32>,
  alive: u32,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let idx = id.x;
  if (idx >= arrayLength(&particles)) { return; }
  
  var p = particles[idx];
  if (p.alive == 0u) { return; }
  
  // Update age
  p.age += 0.016; // Assume 60fps
  
  // Kill if lifetime exceeded
  if (p.age >= p.lifetime) {
    p.alive = 0u;
    particles[idx] = p;
    return;
  }
  
  // Update position
  p.position += p.velocity * 0.016;
  
  // Apply gravity
  p.velocity.y -= 9.8 * 0.016;
  
  particles[idx] = p;
}
`;
}

function getQualitySettings(quality: string): any {
  const settings: Record<string, any> = {
    low: { maxParticles: 100, updateRate: 10 },
    medium: { maxParticles: 1000, updateRate: 30 },
    high: { maxParticles: 10000, updateRate: 60 },
    photorealistic: { maxParticles: 100000, updateRate: 120, gpuCompute: true }
  };
  return settings[quality] || settings.medium;
}

function extractParams(seed: Seed): ParticleParams {
  const quality = seed.genes?.quality?.value || 'medium';
  let count = seed.genes?.count?.value || 100;
  if (typeof count === 'number' && count <= 1) count = Math.max(10, Math.floor(count * 1000));

  return {
    count,
    emitterType: seed.genes?.emitterType?.value || 'point',
    particleType: seed.genes?.particleType?.value || 'spark',
    lifetime: typeof seed.genes?.lifetime?.value === 'number' ? seed.genes.lifetime.value : 2.0,
    speed: typeof seed.genes?.speed?.value === 'number' ? seed.genes.speed.value : 5.0,
    spread: typeof seed.genes?.spread?.value === 'number' ? seed.genes.spread.value : 1.0,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
