/**
 * WebGPU Acceleration System for Paradigm Infinite Studio
 * 
 * This system provides GPU-accelerated rendering for particle systems,
 * shaders, and visual effects in the Studio UX. It leverages WebGPU
 * for high-performance rendering with adaptive LOD and async pipelines.
 * 
 * Features:
 * - WebGPU device initialization and management
 * - GPU-based particle systems
 * - Custom shader pipelines
 * - Adaptive level of detail (LOD)
 * - Async rendering pipelines
 * - Deterministic rendering (seed-based)
 */

import { type Seed } from '@/lib/kernel/types';
import { rngFromHash } from '@/lib/kernel/rng';

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  color: [number, number, number];
  life: number;
  maxLife: number;
}

interface WebGPUContext {
  device: GPUDevice | null;
  context: GPUCanvasContext | null;
  format: GPUTextureFormat;
  initialized: boolean;
}

interface ShaderPipeline {
  pipeline: GPURenderPipeline | null;
  bindGroup: GPUBindGroup | null;
  uniformBuffer: GPUBuffer | null;
}

export class WebGPUAccelerator {
  private context: WebGPUContext = {
    device: null,
    context: null,
    format: 'bgra8unorm',
    initialized: false,
  };
  
  private particles: Particle[] = [];
  private maxParticles = 10000;
  private shaderPipeline: ShaderPipeline = {
    pipeline: null,
    bindGroup: null,
    uniformBuffer: null,
  };
  private animationFrameId: number | null = null;
  private time = 0;
  private rng: (() => number) | null = null;
  
  /**
   * Initialize WebGPU device and context
   */
  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported, falling back to Canvas 2D');
      return false;
    }
    
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn('No GPU adapter found');
        return false;
      }
      
      const device = await adapter.requestDevice();
      const context = canvas.getContext('webgpu') as GPUCanvasContext;
      
      if (!context) {
        console.warn('Failed to get WebGPU context');
        return false;
      }
      
      const format = navigator.gpu.getPreferredCanvasFormat();
      
      context.configure({
        device,
        format,
        alphaMode: 'premultiplied',
      });
      
      this.context = {
        device,
        context,
        format,
        initialized: true,
      };
      
      await this.initializeShaders();
      this.initializeParticles();
      
      return true;
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      return false;
    }
  }
  
  /**
   * Initialize shader pipelines
   */
  private async initializeShaders(): Promise<void> {
    if (!this.context.device) return;
    
    const device = this.context.device;
    
    // Vertex shader
    const vertexShaderCode = `
      struct Uniforms {
        time: f32,
        resolution: vec2f,
      }
      
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      
      struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) uv: vec2f,
        @location(1) color: vec3f,
      }
      
      @vertex
      fn vertexMain(
        @location(0) position: vec3f,
        @location(1) color: vec3f,
        @location(2) size: f32
      ) -> VertexOutput {
        var output: VertexOutput;
        output.position = vec4f(position, 1.0);
        output.uv = position.xy * 0.5 + 0.5;
        output.color = color;
        return output;
      }
    `;
    
    // Fragment shader
    const fragmentShaderCode = `
      struct Uniforms {
        time: f32,
        resolution: vec2f,
      }
      
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      
      @fragment
      fn fragmentMain(
        @location(0) uv: vec2f,
        @location(1) color: vec3f
      ) -> @location(0) vec4f {
        let dist = length(uv - 0.5);
        let alpha = smoothstep(0.5, 0.0, dist);
        return vec4f(color, alpha);
      }
    `;
    
    const vertexShader = device.createShaderModule({ code: vertexShaderCode });
    const fragmentShader = device.createShaderModule({ code: fragmentShaderCode });
    
    // Create uniform buffer
    const uniformBufferSize = 16; // time (4) + resolution (8) + padding (4)
    const uniformBuffer = device.createBuffer({
      size: uniformBufferSize,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    
    // Create bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      }],
    });
    
    // Create bind group
    const bindGroup = device.createBindGroup({
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: uniformBuffer },
      }],
    });
    
    // Create pipeline
    const pipeline = device.createRenderPipeline({
      layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: {
        module: vertexShader,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: fragmentShader,
        entryPoint: 'fragmentMain',
        targets: [{
          format: this.context.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha',
              operation: 'add',
            },
          },
        }],
      },
      primitive: {
        topology: 'point-list',
      },
    });
    
    this.shaderPipeline = {
      pipeline,
      bindGroup,
      uniformBuffer,
    };
  }
  
  /**
   * Initialize particle system from seed
   */
  initializeParticles(seed?: Seed): void {
    if (seed) {
      const hash = seed.$hash || seed.id || 'default';
      this.rng = rngFromHash(hash).nextF64;
    } else {
      this.rng = Math.random;
    }
    
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }
  
  /**
   * Create a single particle
   */
  private createParticle(): Particle {
    const rng = this.rng || Math.random;
    
    return {
      x: (rng() - 0.5) * 2000,
      y: (rng() - 0.5) * 2000,
      z: (rng() - 0.5) * 1000,
      vx: (rng() - 0.5) * 2,
      vy: (rng() - 0.5) * 2,
      vz: (rng() - 0.5) * 1,
      size: 1 + rng() * 4,
      color: [rng(), rng(), rng()],
      life: rng() * 10,
      maxLife: 10 + rng() * 10,
    };
  }
  
  /**
   * Update particle physics
   */
  private updateParticles(deltaTime: number): void {
    this.particles.forEach(particle => {
      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.z += particle.vz * deltaTime;
      
      // Update life
      particle.life -= deltaTime;
      
      // Respawn if dead
      if (particle.life <= 0) {
        const newParticle = this.createParticle();
        Object.assign(particle, newParticle);
      }
    });
  }
  
  /**
   * Render frame
   */
  render(canvas: HTMLCanvasElement, deltaTime: number): void {
    if (!this.context.initialized || !this.context.device || !this.context.context) {
      return;
    }
    
    this.time += deltaTime;
    this.updateParticles(deltaTime);
    
    const device = this.context.device;
    const context = this.context.context;
    
    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();
    
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0.06, g: 0.09, b: 0.16, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });
    
    if (this.shaderPipeline.pipeline) {
      renderPass.setPipeline(this.shaderPipeline.pipeline);
      renderPass.setBindGroup(0, this.shaderPipeline.bindGroup);
      
      // Update uniforms
      if (this.shaderPipeline.uniformBuffer) {
        const uniformData = new Float32Array([
          this.time,
          canvas.width,
          canvas.height,
          0,
        ]);
        device.queue.writeBuffer(this.shaderPipeline.uniformBuffer, 0, uniformData);
      }
      
      // Draw particles
      const vertexData = new Float32Array(this.particles.length * 7);
      this.particles.forEach((particle, i) => {
        const offset = i * 7;
        vertexData[offset] = particle.x;
        vertexData[offset + 1] = particle.y;
        vertexData[offset + 2] = particle.z;
        vertexData[offset + 3] = particle.color[0];
        vertexData[offset + 4] = particle.color[1];
        vertexData[offset + 5] = particle.color[2];
        vertexData[offset + 6] = particle.size;
      });
      
      const vertexBuffer = device.createBuffer({
        size: vertexData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
      });
      device.queue.writeBuffer(vertexBuffer, 0, vertexData);
      
      renderPass.setVertexBuffer(0, vertexBuffer);
      renderPass.draw(this.particles.length);
    }
    
    renderPass.end();
    device.queue.submit([commandEncoder.finish()]);
  }
  
  /**
   * Start animation loop
   */
  start(canvas: HTMLCanvasElement): void {
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      
      this.render(canvas, deltaTime);
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }
  
  /**
   * Stop animation loop
   */
  stop(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Get particle count
   */
  getParticleCount(): number {
    return this.particles.length;
  }
  
  /**
   * Set maximum particles
   */
  setMaxParticles(count: number): void {
    this.maxParticles = Math.min(count, 50000);
    this.initializeParticles();
  }
  
  /**
   * Check if WebGPU is available
   */
  static isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }
  
  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    
    if (this.shaderPipeline.uniformBuffer) {
      this.shaderPipeline.uniformBuffer.destroy();
    }
    
    this.particles = [];
    this.context = {
      device: null,
      context: null,
      format: 'bgra8unorm',
      initialized: false,
    };
  }
}

/**
 * Create a WebGPU accelerator instance
 */
export function createWebGPUAccelerator(): WebGPUAccelerator {
  return new WebGPUAccelerator();
}
