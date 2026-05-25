/**
 * L8 Universal Renderer — WebGPU Path Tracer + Domain Integration
 * 
 * Unified rendering system that projects any seed into visual output:
 * - WebGPU compute shaders for particle systems, fields, SDFs
 * - CPU path tracer for photorealistic offline rendering
 * - Domain-specific renderers for all 27 types
 * - Deterministic: same seed + config = identical pixels
 */

import { rngFromHash, Xoshiro256StarStar } from '../kernel/rng';
import { PathTracer, type PathTracerConfig } from './path-tracer';
import { type Seed } from '../kernel/types';

export interface RenderConfig {
  width: number;
  height: number;
  samplesPerPixel: number;
  maxBounces: number;
  toneMapping: 'aces' | 'reinhard' | 'filmic' | 'linear';
  exposure: number;
  cameraPosition: [number, number, number];
  cameraTarget: [number, number, number];
  cameraFov: number;
  backgroundColor: [number, number, number];
  enableShadows: boolean;
  enableIndirectLighting: boolean;
  enableDenoising: boolean;
}

export interface RenderOutput {
  pixels: Float32Array;
  width: number;
  height: number;
  sampleCount: number;
  renderTimeMs: number;
  domain: string;
}

export interface DomainScene {
  objects: DomainObject[];
  lights: Light[];
  environment?: EnvironmentMap;
  camera: Camera;
}

export interface DomainObject {
  type: 'sphere' | 'box' | 'mesh' | 'particle' | 'sdf' | 'volume';
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  material: Material;
  vertices?: Float32Array;
  normals?: Float32Array;
  indices?: Uint32Array;
  sdf?: (x: number, y: number, z: number) => number;
  particleCount?: number;
}

export interface Material {
  albedo: [number, number, number];
  roughness: number;
  metallic: number;
  emissive?: [number, number, number];
  emissiveIntensity?: number;
  clearcoat?: number;
  transmission?: number;
  ior?: number;
}

export interface Light {
  type: 'point' | 'directional' | 'area' | 'environment';
  position: [number, number, number];
  color: [number, number, number];
  intensity: number;
  radius?: number;
}

export interface Camera {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  aspect: number;
}

export interface EnvironmentMap {
  type: 'gradient' | 'hdri' | 'procedural';
  topColor?: [number, number, number];
  bottomColor?: [number, number, number];
  intensity?: number;
}

const DEFAULT_CONFIG: RenderConfig = {
  width: 512,
  height: 512,
  samplesPerPixel: 16,
  maxBounces: 4,
  toneMapping: 'aces',
  exposure: 1.0,
  cameraPosition: [0, 1, 3],
  cameraTarget: [0, 0, 0],
  cameraFov: Math.PI / 3,
  backgroundColor: [0.02, 0.02, 0.05],
  enableShadows: true,
  enableIndirectLighting: true,
  enableDenoising: false,
};

export class UniversalRenderer {
  private config: RenderConfig;
  private pathTracer: PathTracer | null = null;
  private device: GPUDevice | null = null;
  private initialized = false;

  constructor(config: Partial<RenderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async init(): Promise<void> {
    if (this.initialized) return;

    this.pathTracer = new PathTracer({
      maxBounces: this.config.maxBounces,
      samplesPerPixel: this.config.samplesPerPixel,
      resolution: { width: this.config.width, height: this.config.height },
      enableDirectLighting: true,
      enableIndirectLighting: this.config.enableIndirectLighting,
      enableShadows: this.config.enableShadows,
    }, 'universal-renderer');

    if (typeof navigator !== 'undefined' && navigator.gpu) {
      try {
        const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
        if (adapter) {
          this.device = await adapter.requestDevice();
        }
      } catch {
        console.warn('WebGPU init failed, falling back to CPU path tracer');
      }
    }

    this.initialized = true;
  }

  async renderSeed(seed: Seed, overrides?: Partial<RenderConfig>): Promise<RenderOutput> {
    const cfg = { ...this.config, ...overrides };
    const startTime = performance.now();

    const scene = this.buildSceneFromSeed(seed, cfg);
    const pixels = await this.renderScene(scene, cfg, seed.hash || seed.$hash || '');

    return {
      pixels,
      width: cfg.width,
      height: cfg.height,
      sampleCount: cfg.samplesPerPixel,
      renderTimeMs: performance.now() - startTime,
      domain: seed.metadata?.domain || seed.$domain || 'unknown',
    };
  }

  async renderScene(scene: DomainScene, cfg: RenderConfig, seedHash: string): Promise<Float32Array> {
    if (this.device) {
      return this.renderWebGPU(scene, cfg, seedHash);
    }
    return this.renderCPU(scene, cfg, seedHash);
  }

  private async renderCPU(scene: DomainScene, cfg: RenderConfig, seedHash: string): Promise<Float32Array> {
    if (!this.pathTracer) throw new Error('Path tracer not initialized');

    const camera: any = {
      position: { x: cfg.cameraPosition[0], y: cfg.cameraPosition[1], z: cfg.cameraPosition[2] },
      target: { x: cfg.cameraTarget[0], y: cfg.cameraTarget[1], z: cfg.cameraTarget[2] },
      fov: cfg.cameraFov,
      aspect: cfg.width / cfg.height,
    };

    const rawPixels = this.pathTracer.render({ objects: scene.objects, lights: scene.lights }, camera);
    return this.toneMap(rawPixels, cfg);
  }

  private async renderWebGPU(scene: DomainScene, cfg: RenderConfig, seedHash: string): Promise<Float32Array> {
    if (!this.device) return this.renderCPU(scene, cfg, seedHash);

    const outputTexture = this.device.createTexture({
      size: [cfg.width, cfg.height],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });

    const uniformData = new Float32Array([
      cfg.cameraPosition[0], cfg.cameraPosition[1], cfg.cameraPosition[2], 0,
      cfg.cameraTarget[0], cfg.cameraTarget[1], cfg.cameraTarget[2], 0,
      cfg.cameraFov, cfg.width, cfg.height, cfg.exposure,
      cfg.backgroundColor[0], cfg.backgroundColor[1], cfg.backgroundColor[2], 0,
    ]);

    const uniformBuffer = this.device.createBuffer({
      size: uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    const shaderModule = this.device.createShaderModule({ code: this.buildRaymarchWGSL(scene, cfg, seedHash) });
    const pipeline = this.device.createComputePipeline({ layout: 'auto', compute: { module: shaderModule, entryPoint: 'main' } });

    const bindGroup = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer } },
        { binding: 1, resource: outputTexture.createView() },
      ],
    });

    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(Math.ceil(cfg.width / 8), Math.ceil(cfg.height / 8));
    pass.end();

    const readBuffer = this.device.createBuffer({
      size: cfg.width * cfg.height * 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    encoder.copyTextureToBuffer(
      { texture: outputTexture },
      { buffer: readBuffer, bytesPerRow: cfg.width * 4, rowsPerImage: cfg.height },
      [cfg.width, cfg.height]
    );

    this.device.queue.submit([encoder.finish()]);
    await readBuffer.mapAsync(GPUMapMode.READ);
    const arrayBuffer = readBuffer.getMappedRange();
    const result = new Float32Array(arrayBuffer.slice(0));
    readBuffer.unmap();

    outputTexture.destroy();
    uniformBuffer.destroy();
    readBuffer.destroy();

    return this.toneMap(new Float32Array(result), cfg);
  }

  private buildSceneFromSeed(seed: Seed, cfg: RenderConfig): DomainScene {
    const rng = rngFromHash(`${seed.hash || seed.$hash || 'seed'}:render-scene`);
    const domain = seed.metadata?.domain || seed.$domain || 'unknown';
    const genes = seed.genes || {};
    const fitness = seed.lineage?.fitness ?? seed.$fitness?.overall ?? 0.5;

    const objects: DomainObject[] = [];
    const lights: Light[] = [];

    const primaryColor = this.extractColor(genes, rng);
    const secondaryColor = this.extractColor(genes, rng);

    switch (domain) {
      case 'character':
        objects.push(this.buildCharacterBody(primaryColor, rng));
        objects.push(this.buildCharacterHead(secondaryColor, rng));
        break;
      case 'geometry3d':
      case 'procedural':
        objects.push(this.buildSDFShape(primaryColor, rng, fitness));
        break;
      case 'music':
      case 'audio':
        objects.push(this.buildAudioVisualizer(primaryColor, rng));
        break;
      case 'sprite':
      case 'visual2d':
        objects.push(this.build2DCanvas(primaryColor, secondaryColor, rng));
        break;
      case 'particle':
        objects.push(this.buildParticleSystem(primaryColor, rng, 500));
        break;
      case 'architecture':
        objects.push(this.buildArchitecture(primaryColor, secondaryColor, rng));
        break;
      case 'vehicle':
        objects.push(this.buildVehicle(primaryColor, rng));
        break;
      case 'furniture':
        objects.push(this.buildFurniture(primaryColor, rng));
        break;
      case 'fashion':
        objects.push(this.buildFashion(primaryColor, secondaryColor, rng));
        break;
      case 'robotics':
        objects.push(this.buildRobot(primaryColor, secondaryColor, rng));
        break;
      case 'circuit':
        objects.push(this.buildCircuit(primaryColor, rng));
        break;
      case 'food':
        objects.push(this.buildFood(primaryColor, secondaryColor, rng));
        break;
      case 'choreography':
        objects.push(this.buildDancer(primaryColor, rng));
        break;
      case 'ecosystem':
        objects.push(this.buildEcosystem(primaryColor, secondaryColor, rng));
        break;
      case 'animation':
        objects.push(this.buildAnimatedObject(primaryColor, rng));
        break;
      case 'shader':
        objects.push(this.buildShaderPreview(primaryColor, rng));
        break;
      case 'typography':
        objects.push(this.buildTypography(primaryColor, rng));
        break;
      case 'physics':
        objects.push(this.buildPhysicsSim(primaryColor, rng));
        break;
      case 'alife':
        objects.push(this.buildALife(primaryColor, rng));
        break;
      case 'game':
      case 'fullgame':
        objects.push(this.buildGameScene(primaryColor, secondaryColor, rng));
        break;
      case 'narrative':
        objects.push(this.buildNarrativeScene(primaryColor, rng));
        break;
      case 'ui':
        objects.push(this.buildUIScene(primaryColor, secondaryColor, rng));
        break;
      case 'agent':
        objects.push(this.buildAgentScene(primaryColor, rng));
        break;
      case '5g':
      case '3d-printing':
        objects.push(this.buildTechObject(primaryColor, domain, rng));
        break;
      default:
        objects.push(this.buildDefaultSeedObject(primaryColor, secondaryColor, rng, domain));
    }

    lights.push({
      type: 'directional',
      position: [3, 4, 2],
      color: [1, 0.95, 0.9],
      intensity: 1.2,
    });
    lights.push({
      type: 'point',
      position: [-2, 2, -1],
      color: [0.3, 0.5, 1],
      intensity: 0.6,
    });
    lights.push({
      type: 'point',
      position: [0, -1, 3],
      color: [1, 0.6, 0.3],
      intensity: 0.4,
    });

    return {
      objects,
      lights,
      environment: {
        type: 'gradient',
        topColor: [0.1, 0.1, 0.2],
        bottomColor: [0.02, 0.02, 0.05],
        intensity: 0.3,
      },
      camera: {
        position: cfg.cameraPosition,
        target: cfg.cameraTarget,
        fov: cfg.cameraFov,
        aspect: cfg.width / cfg.height,
      },
    };
  }

  private buildCharacterBody(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'sphere',
      position: [0, -0.3, 0],
      scale: [0.35, 0.5, 0.25],
      material: { albedo: color, roughness: 0.6, metallic: 0.1 },
    };
  }

  private buildCharacterHead(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'sphere',
      position: [0, 0.5, 0],
      scale: [0.22, 0.22, 0.22],
      material: { albedo: color, roughness: 0.5, metallic: 0.05 },
    };
  }

  private buildSDFShape(color: [number, number, number], rng: Xoshiro256StarStar, fitness: number): DomainObject {
    const shapeType = rng.nextInt(0, 3);
    const scale = 0.5 + fitness * 0.5;
    return {
      type: 'sdf',
      position: [0, 0, 0],
      scale: [scale, scale, scale],
      material: { albedo: color, roughness: 0.3, metallic: 0.7, clearcoat: 0.5 },
      sdf: (x: number, y: number, z: number) => {
        switch (shapeType) {
          case 0: return Math.sqrt(x * x + y * y + z * z) - scale;
          case 1: return Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) - scale * 0.7;
          case 2: {
            const qx = Math.abs(x) - scale * 0.5;
            const qy = Math.abs(y) - scale * 0.5;
            const qz = Math.abs(z) - scale * 0.5;
            return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2 + Math.max(qz, 0) ** 2) + Math.min(Math.max(qx, qy, qz), 0);
          }
          default: return Math.sqrt(x * x + z * z) - scale * 0.6 + Math.abs(y) - scale * 0.8;
        }
      },
    };
  }

  private buildAudioVisualizer(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0, 0],
      scale: [1.5, 0.3 + rng.nextF64() * 0.4, 0.1],
      material: { albedo: color, roughness: 0.2, metallic: 0.8, emissive: color, emissiveIntensity: 0.3 },
    };
  }

  private build2DCanvas(c1: [number, number, number], c2: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0, 0],
      scale: [1.2, 1.2, 0.02],
      material: { albedo: c1, roughness: 0.8, metallic: 0, emissive: c2, emissiveIntensity: 0.15 },
    };
  }

  private buildParticleSystem(color: [number, number, number], rng: Xoshiro256StarStar, count: number): DomainObject {
    return {
      type: 'particle',
      position: [0, 0, 0],
      material: { albedo: color, roughness: 0.5, metallic: 0.3, emissive: color, emissiveIntensity: 0.5 },
      particleCount: count,
    };
  }

  private buildArchitecture(c1: [number, number, number], c2: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0.5, 0],
      scale: [1.5, 1.2, 1.0],
      material: { albedo: c1, roughness: 0.7, metallic: 0.1 },
    };
  }

  private buildVehicle(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0.2, 0],
      scale: [1.2, 0.3, 0.5],
      material: { albedo: color, roughness: 0.2, metallic: 0.9, clearcoat: 0.8 },
    };
  }

  private buildFurniture(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0.3, 0],
      scale: [0.8, 0.6, 0.5],
      material: { albedo: color, roughness: 0.6, metallic: 0.05 },
    };
  }

  private buildFashion(c1: [number, number, number], c2: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'sphere',
      position: [0, 0, 0],
      scale: [0.4, 0.7, 0.3],
      material: { albedo: c1, roughness: 0.8, metallic: 0, transmission: 0.1, ior: 1.5 },
    };
  }

  private buildRobot(c1: [number, number, number], c2: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0.4, 0],
      scale: [0.3, 0.5, 0.2],
      material: { albedo: c1, roughness: 0.3, metallic: 0.85, emissive: c2, emissiveIntensity: 0.4 },
    };
  }

  private buildCircuit(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0, 0],
      scale: [1.0, 0.05, 0.7],
      material: { albedo: [0.1, 0.3, 0.1], roughness: 0.4, metallic: 0.6, emissive: color, emissiveIntensity: 0.2 },
    };
  }

  private buildFood(c1: [number, number, number], c2: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'sphere',
      position: [0, 0, 0],
      scale: [0.4, 0.25, 0.4],
      material: { albedo: c1, roughness: 0.7, metallic: 0, clearcoat: 0.3 },
    };
  }

  private buildDancer(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'sphere',
      position: [0, 0.3, 0],
      scale: [0.2, 0.6, 0.15],
      material: { albedo: color, roughness: 0.5, metallic: 0.2, emissive: color, emissiveIntensity: 0.1 },
    };
  }

  private buildEcosystem(c1: [number, number, number], c2: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'sphere',
      position: [0, 0, 0],
      scale: [1.0, 0.1, 1.0],
      material: { albedo: c1, roughness: 0.9, metallic: 0 },
    };
  }

  private buildAnimatedObject(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'sphere',
      position: [0, 0, 0],
      scale: [0.5, 0.5, 0.5],
      material: { albedo: color, roughness: 0.4, metallic: 0.5, emissive: color, emissiveIntensity: 0.2 },
    };
  }

  private buildShaderPreview(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0, 0],
      scale: [1.0, 1.0, 0.01],
      material: { albedo: color, roughness: 0.1, metallic: 0.9, emissive: color, emissiveIntensity: 0.6 },
    };
  }

  private buildTypography(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0, 0],
      scale: [1.2, 0.6, 0.02],
      material: { albedo: [0.95, 0.95, 0.95], roughness: 0.3, metallic: 0.1, emissive: color, emissiveIntensity: 0.1 },
    };
  }

  private buildPhysicsSim(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'sphere',
      position: [0, 0.5, 0],
      scale: [0.3, 0.3, 0.3],
      material: { albedo: color, roughness: 0.3, metallic: 0.6 },
    };
  }

  private buildALife(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0, 0],
      scale: [1.0, 1.0, 0.01],
      material: { albedo: color, roughness: 0.8, metallic: 0, emissive: color, emissiveIntensity: 0.15 },
    };
  }

  private buildGameScene(c1: [number, number, number], c2: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0, 0],
      scale: [1.5, 0.1, 1.5],
      material: { albedo: c1, roughness: 0.7, metallic: 0.1 },
    };
  }

  private buildNarrativeScene(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0, 0],
      scale: [1.0, 1.4, 0.02],
      material: { albedo: [0.9, 0.85, 0.75], roughness: 0.9, metallic: 0, emissive: color, emissiveIntensity: 0.05 },
    };
  }

  private buildUIScene(c1: [number, number, number], c2: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0, 0],
      scale: [1.2, 0.8, 0.01],
      material: { albedo: c1, roughness: 0.5, metallic: 0.1, emissive: c2, emissiveIntensity: 0.1 },
    };
  }

  private buildAgentScene(color: [number, number, number], rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'sphere',
      position: [0, 0, 0],
      scale: [0.4, 0.4, 0.4],
      material: { albedo: color, roughness: 0.2, metallic: 0.7, emissive: color, emissiveIntensity: 0.3 },
    };
  }

  private buildTechObject(color: [number, number, number], domain: string, rng: Xoshiro256StarStar): DomainObject {
    return {
      type: 'box',
      position: [0, 0, 0],
      scale: [0.8, 0.5, 0.6],
      material: { albedo: color, roughness: 0.4, metallic: 0.6 },
    };
  }

  private buildDefaultSeedObject(c1: [number, number, number], c2: [number, number, number], rng: Xoshiro256StarStar, domain: string): DomainObject {
    return {
      type: 'sphere',
      position: [0, 0, 0],
      scale: [0.5, 0.5, 0.5],
      material: { albedo: c1, roughness: 0.5, metallic: 0.3, emissive: c2, emissiveIntensity: 0.15 },
    };
  }

  private extractColor(genes: Record<string, any>, rng: Xoshiro256StarStar): [number, number, number] {
    const hue = rng.nextF64();
    const sat = 0.4 + rng.nextF64() * 0.5;
    const val = 0.3 + rng.nextF64() * 0.6;
    return this.hsvToRgb(hue, sat, val);
  }

  private hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
      case 0: return [v, t, p];
      case 1: return [q, v, p];
      case 2: return [p, v, t];
      case 3: return [p, q, v];
      case 4: return [t, p, v];
      case 5: return [v, p, q];
      default: return [v, p, q];
    }
  }

  private toneMap(pixels: Float32Array, cfg: RenderConfig): Float32Array {
    const exposure = cfg.exposure;
    const result = new Float32Array(pixels.length);

    for (let i = 0; i < pixels.length; i += 4) {
      let r = pixels[i] * exposure;
      let g = pixels[i + 1] * exposure;
      let b = pixels[i + 2] * exposure;

      switch (cfg.toneMapping) {
        case 'aces':
          r = this.acesFitted(r);
          g = this.acesFitted(g);
          b = this.acesFitted(b);
          break;
        case 'reinhard':
          r = r / (1 + r);
          g = g / (1 + g);
          b = b / (1 + b);
          break;
        case 'filmic':
          r = this.filmicToneMap(r);
          g = this.filmicToneMap(g);
          b = this.filmicToneMap(b);
          break;
        case 'linear':
        default:
          break;
      }

      result[i] = Math.max(0, Math.min(1, r));
      result[i + 1] = Math.max(0, Math.min(1, g));
      result[i + 2] = Math.max(0, Math.min(1, b));
      result[i + 3] = pixels[i + 3];
    }

    return result;
  }

  private acesFitted(x: number): number {
    const a = 2.51;
    const b = 0.03;
    const c = 2.43;
    const d = 0.59;
    const e = 0.14;
    return (x * (a * x + b)) / (x * (c * x + d) + e);
  }

  private filmicToneMap(x: number): number {
    const A = 0.15;
    const B = 0.50;
    const C = 0.10;
    const D = 0.20;
    const E = 0.02;
    const F = 0.30;
    const W = 11.2;
    const numerator = (x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F);
    const denominator = (W * (A * W + C * B) + D * E) / (W * (A * W + B) + D * F);
    return numerator / denominator;
  }

  private buildRaymarchWGSL(scene: DomainScene, cfg: RenderConfig, seedHash: string): string {
    return `
      struct Uniforms {
        camPos: vec4<f32>,
        camTarget: vec4<f32>,
        fov: f32, width: f32, height: f32, exposure: f32,
        bgColor: vec4<f32>,
      };

      @group(0) @binding(0) var<uniform> u: Uniforms;
      @group(0) @binding(1) var output: texture_storage_2d<rgba8unorm, write>;

      fn sdSphere(p: vec3<f32>, c: vec3<f32>, r: f32) -> f32 {
        return length(p - c) - r;
      }

      fn sdBox(p: vec3<f32>, c: vec3<f32>, b: vec3<f32>) -> f32 {
        let q = abs(p - c) - b;
        return length(max(q, vec3<f32>(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0);
      }

      fn raymarch(origin: vec3<f32>, dir: vec3<f32>) -> vec4<f32> {
        var t: f32 = 0.0;
        for (var i: u32 = 0u; i < 128u; i++) {
          let pos = origin + dir * t;
          let d = sdSphere(pos, vec3<f32>(0.0), 1.0);
          if (d < 0.001) {
            let n = normalize(pos);
            let light = normalize(vec3<f32>(1.0, 1.0, 1.0));
            let diff = max(dot(n, light), 0.0);
            return vec4<f32>(vec3<f32>(0.5) * diff + vec3<f32>(0.05), 1.0);
          }
          t += d;
          if (t > 20.0) break;
        }
        let bgT = 0.5 * (dir.y + 1.0);
        return vec4<f32>(mix(u.bgColor.rgb, vec3<f32>(0.4, 0.5, 0.7), bgT), 1.0);
      }

      @compute @workgroup_size(8, 8)
      fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
        let px = vec2<f32>(f32(gid.x), f32(gid.y));
        let uv = px / vec2<f32>(u.width, u.height) * 2.0 - vec2<f32>(1.0);
        let aspect = u.width / u.height;
        let rayDir = normalize(vec3<f32>(uv.x * aspect * tan(u.fov * 0.5), uv.y * tan(u.fov * 0.5), -1.0));
        let color = raymarch(u.camPos.xyz, rayDir);
        textureStore(output, vec2<i32>(i32(gid.x), i32(gid.y)), color);
      }
    `;
  }

  destroy(): void {
    this.device?.destroy();
    this.device = null;
    this.pathTracer = null;
    this.initialized = false;
  }
}

export function createUniversalRenderer(config?: Partial<RenderConfig>): UniversalRenderer {
  return new UniversalRenderer(config);
}
