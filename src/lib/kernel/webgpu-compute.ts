/**
 * PARADIGM WEBGPU COMPUTE SYSTEM
 * 
 * GPU-accelerated seed generation for:
 * - Particle systems
 * - Shader compilation  
 * - Neural network inference
 * - Parallel fitness evaluation
 */

export interface WebGPUDevice {
  adapter: GPUAdapter;
  device: GPUDevice;
  queue: GPUQueue;
}

export interface ComputePipeline {
  pipeline: GPUComputePipeline;
  bindGroup: GPUBindGroup;
}

/**
 * Initialize WebGPU with fallback to CPU
 */
export async function initWebGPU(): Promise<WebGPUDevice | null> {
  if (!navigator.gpu) {
    console.warn('WebGPU not supported, using CPU fallback');
    return null;
  }
  
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.warn('No GPU adapter available');
      return null;
    }
    
    const device = await adapter.requestDevice();
    const queue = device.queue;
    
    console.log('WebGPU initialized successfully');
    
    return { adapter, device, queue };
  } catch (error) {
    console.error('WebGPU initialization failed:', error);
    return null;
  }
}

/**
 * Particle System Compute Shader (WGSL)
 */
export const PARTICLE_COMPUTE_SHADER = `
struct Particle {
  position: vec3f,
  velocity: vec3f,
  color: vec4f,
  life: f32,
  mass: f32,
}

struct SimulationParams {
  deltaTime: f32,
  gravity: f32,
  drag: f32,
  count: u32,
  seed: u32,
}

@group(0) @binding(0) var<storage, read> particlesIn: array<Particle>;
@group(0) @binding(1) var<storage, read_write> particlesOut: array<Particle>;
@group(0) @binding(2) var<uniform> params: SimulationParams;

// Simple hash for determinism
fn hash(n: u32) -> u32 {
  var x = n;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = (x >> 16) ^ x;
  return x;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.count) { return; }
  
  var p = particlesIn[idx];
  
  // Apply gravity
  p.velocity.y -= params.gravity * params.deltaTime;
  
  // Apply drag
  p.velocity *= (1.0 - params.drag * params.deltaTime);
  
  // Update position
  p.position += p.velocity * params.deltaTime;
  
  // Reduce life
  p.life -= params.deltaTime;
  
  // Add some turbulence based on seed
  let noise = hash(idx + params.seed * 1000) % 1000 / 1000.0;
  p.velocity.x += (noise - 0.5) * 0.1;
  
  // Clamp position to bounds
  p.position = clamp(p.position, vec3f(-10.0), vec3f(10.0));
  
  // Store output
  particlesOut[idx] = p;
}
`;

/**
 * Seed Fitness Evaluation Compute Shader
 */
export const FITNESS_COMPUTE_SHADER = `
struct Seed {
  genes: array<f32, 32>,  // 32 gene values
  fitness: f32,
}

struct FitnessParams {
  populationSize: u32,
  geneCount: u32,
  targetFitness: f32,
  seed: u32,
}

@group(0) @binding(0) var<storage, read> seedsIn: array<Seed>;
@group(0) @binding(1) var<storage, read_write> seedsOut: array<Seed>;
@group(0) @binding(2) var<uniform> params: FitnessParams;

// Simple fitness function (customize per domain)
fn evaluateFitness(genes: array<f32, 32>) -> f32 {
  var sum: f32 = 0.0;
  
  // Example: maximize variance while keeping values in range
  for (var i: u32 = 0; i < params.geneCount; i++) {
    let g = genes[i];
    // Balance between extremes
    sum += abs(g - 0.5) * 2.0;
  }
  
  return sum / f32(params.geneCount);
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let idx = global_id.x;
  if (idx >= params.populationSize) { return; }
  
  var seed = seedsIn[idx];
  
  // Evaluate fitness
  seed.fitness = evaluateFitness(seed.genes);
  
  seedsOut[idx] = seed;
}
`;

/**
 * WebGPU Compute Manager Class
 */
export class WebGPUComputeManager {
  private device: WebGPUDevice | null = null;
  private pipelines: Map<string, ComputePipeline> = new Map();
  
  constructor() {
    this.init();
  }
  
  private async init() {
    this.device = await initWebGPU();
  }
  
  async createPipeline(name: string, shaderCode: string, _workgroupSize: number = 64): Promise<ComputePipeline | null> {
    if (!this.device) return null;
    
    try {
      const shaderModule = this.device.device.createShaderModule({
        code: shaderCode,
      });
      
      const pipeline = this.device.device.createComputePipeline({
        layout: 'auto',
        compute: {
          module: shaderModule,
          entryPoint: 'main',
        },
      });
      
      // Create bind group (placeholder - would need proper buffers)
      const bindGroup = this.device.device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [],
      });
      
      const computePipeline = { pipeline, bindGroup };
      this.pipelines.set(name, computePipeline);
      
      return computePipeline;
    } catch (error) {
      console.error(`Failed to create pipeline ${name}:`, error);
      return null;
    }
  }
  
  async runParticleSimulation(
    particles: Float32Array,
    params: { deltaTime: number; gravity: number; drag: number; seed: number }
  ): Promise<Float32Array | null> {
    if (!this.device) return null;
    
    const pipeline = this.pipelines.get('particle');
    if (!pipeline) return null;
    
    // Create buffers
    const particleBuffer = this.device.device.createBuffer({
      size: particles.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    
    // Write initial data
    this.device.queue.writeBuffer(particleBuffer, 0, particles);
    
    // Create output buffer
    const outputBuffer = this.device.device.createBuffer({
      size: particles.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    
    // Create uniform buffer
    const uniformData = new ArrayBuffer(20);
    const uniformView = new DataView(uniformData);
    uniformView.setFloat32(0, params.deltaTime, true);
    uniformView.setFloat32(4, params.gravity, true);
    uniformView.setFloat32(8, params.drag, true);
    uniformView.setUint32(12, particles.length / 8); // particle count
    uniformView.setUint32(16, params.seed, true);
    
    const uniformBuffer = this.device.device.createBuffer({
      size: 20,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    this.device.queue.writeBuffer(uniformBuffer, 0, uniformData);
    
    // Create bind groups for ping-pong
    const bindGroup1 = this.device.device.createBindGroup({
      layout: pipeline.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: particleBuffer } },
        { binding: 1, resource: { buffer: outputBuffer } },
        { binding: 2, resource: { buffer: uniformBuffer } },
      ],
    });
    
    // Run compute
    const commandEncoder = this.device.device.createCommandEncoder();
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(pipeline.pipeline);
    passEncoder.setBindGroup(0, bindGroup1);
    passEncoder.dispatchWorkgroups(Math.ceil(particles.length / 8 / 64));
    passEncoder.end();
    
    this.device.queue.submit([commandEncoder.finish()]);
    
    // Read back result
    const readBuffer = this.device.device.createBuffer({
      size: particles.byteLength,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
    
    const copyEncoder = this.device.device.createCommandEncoder();
    copyEncoder.copyBufferToBuffer(outputBuffer, 0, readBuffer, 0, particles.byteLength);
    this.device.queue.submit([copyEncoder.finish()]);
    
    await readBuffer.mapAsync(GPUMapMode.READ);
    const result = new Float32Array(readBuffer.getMappedRange());
    
    readBuffer.unmap();
    
    return result;
  }
  
  isAvailable(): boolean {
    return this.device !== null;
  }
}

// Singleton instance
export const gpuCompute = new WebGPUComputeManager();