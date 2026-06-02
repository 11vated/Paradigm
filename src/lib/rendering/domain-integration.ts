/**
 * Photorealistic Rendering Integration Across Domain Engines
 * Provides rendering capabilities for all 27+ domain engines in Paradigm
 */

import { PhotorealisticRenderer, createPhotorealisticRenderer, type RenderScene } from './photorealistic-renderer.js';
import type { PBRMaterial } from '../asset_pipeline/material_generator.js';
import { TextureSynthesisEngine, type TextureMapSet } from './texture-synthesis.js';
import { generateMaterial } from '../asset_pipeline/material_generator.js';
import type { Seed as SeedType, Artifact } from '../kernel/types.js';
import type { ExportAsset, ExportMaterial } from './export-pipeline.js';

export interface DomainRenderingConfig {
  enablePathTracing: boolean;
  enableAIEnhancement: boolean;
  quality: 'low' | 'medium' | 'high' | 'ultra';
  textureResolution: number;
}

export class DomainRenderingIntegration {
  private renderer: PhotorealisticRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private config: DomainRenderingConfig;

  constructor(config: Partial<DomainRenderingConfig> = {}) {
    this.config = {
      enablePathTracing: config.enablePathTracing ?? false,
      enableAIEnhancement: config.enableAIEnhancement ?? false,
      quality: config.quality || 'high',
      textureResolution: config.textureResolution || 2048,
    };
  }

  /**
   * Initialize rendering system with canvas
   */
  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;
    this.renderer = createPhotorealisticRenderer(canvas, {
      pathTracer: {
        maxBounces: 4,
        samplesPerPixel: 4,
        resolution: { width: 512, height: 512 },
        enableDirectLighting: true,
        enableIndirectLighting: true,
        enableShadows: true,
      },
      quality: this.config.quality,
    });
    await this.renderer.initialize();
  }

  /**
   * Generate photorealistic materials for character domain
   */
  generateCharacterMaterials(seed: SeedType): PBRMaterial {
    const material = generateMaterial(seed, { generateTextures: false });
    
    // Character-specific material properties
    material.roughness = 0.4;
    material.metallic = 0.0;
    material.clearcoat = 0.2;
    material.sheen = 0.3;
    
    return material;
  }

  /**
   * Generate photorealistic materials for architecture domain
   */
  generateArchitectureMaterials(seed: SeedType): PBRMaterial {
    const material = generateMaterial(seed, { generateTextures: false });
    
    // Architecture-specific material properties
    material.roughness = 0.8;
    material.metallic = 0.1;
    material.clearcoat = 0.0;
    material.sheen = 0.0;
    
    return material;
  }

  /**
   * Generate photorealistic materials for vehicle domain
   */
  generateVehicleMaterials(seed: SeedType): PBRMaterial {
    const material = generateMaterial(seed, { generateTextures: false });
    
    // Vehicle-specific material properties
    material.roughness = 0.2;
    material.metallic = 0.8;
    material.clearcoat = 0.9;
    material.clearcoatRoughness = 0.1;
    
    return material;
  }

  /**
   * Generate photorealistic materials for fashion domain
   */
  generateFashionMaterials(seed: SeedType): PBRMaterial {
    const material = generateMaterial(seed, { generateTextures: false });
    
    // Fashion-specific material properties
    material.roughness = 0.9;
    material.metallic = 0.0;
    material.sheen = 0.5;
    material.sheenColor = [1, 0.9, 0.8];
    material.transmission = 0.3;
    
    return material;
  }

  /**
   * Generate photorealistic materials for robotics domain
   */
  generateRoboticsMaterials(seed: SeedType): PBRMaterial {
    const material = generateMaterial(seed, { generateTextures: false });
    
    // Robotics-specific material properties
    material.roughness = 0.3;
    material.metallic = 0.9;
    material.clearcoat = 0.7;
    material.anisotropy = 0.5;
    
    return material;
  }

  /**
   * Generate photorealistic materials for food domain
   */
  generateFoodMaterials(seed: SeedType): PBRMaterial {
    const material = generateMaterial(seed, { generateTextures: false });
    
    // Food-specific material properties
    material.roughness = 0.7;
    material.metallic = 0.0;
    material.transmission = 0.5;
    material.ior = 1.4;
    
    return material;
  }

  /**
   * Generate photorealistic materials for furniture domain
   */
  generateFurnitureMaterials(seed: SeedType): PBRMaterial {
    const material = generateMaterial(seed, { generateTextures: false });
    
    // Furniture-specific material properties
    material.roughness = 0.6;
    material.metallic = 0.0;
    material.clearcoat = 0.3;
    
    return material;
  }

  /**
   * Generate photorealistic materials for procedural/abstract domain
   */
  generateProceduralMaterials(seed: SeedType): PBRMaterial {
    const material = generateMaterial(seed, { generateTextures: false });
    
    // Procedural-specific material properties
    material.roughness = 0.5;
    material.metallic = 0.5;
    material.transmission = 0.2;
    material.emissiveFactor = [0.1, 0.1, 0.1];
    
    return material;
  }

  /**
   * Generate photorealistic materials for circuit/electronics domain
   */
  generateCircuitMaterials(seed: SeedType): PBRMaterial {
    const material = generateMaterial(seed, { generateTextures: false });
    
    // Circuit-specific material properties
    material.roughness = 0.2;
    material.metallic = 0.95;
    material.clearcoat = 0.8;
    material.emissiveFactor = [0.2, 0.1, 0.0];
    
    return material;
  }

  /**
   * Generate photorealistic materials for nature/ecosystem domain
   */
  generateNatureMaterials(seed: SeedType): PBRMaterial {
    const material = generateMaterial(seed, { generateTextures: false });
    
    // Nature-specific material properties
    material.roughness = 0.8;
    material.metallic = 0.0;
    material.transmission = 0.1;
    
    return material;
  }

  /**
   * Generate texture maps for domain-specific artifacts
   */
  generateDomainTextures(seed: SeedType, domain: string): TextureMapSet | null {
    const engine = new TextureSynthesisEngine();
    const pattern = this.getDomainPattern(domain);

    if (pattern) {
      return engine.generateTextureMaps(pattern);
    }

    return null;
  }

  /**
   * Get domain-specific texture pattern
   */
  private getDomainPattern(domain: string): any {
    const patterns: Record<string, any> = {
      character: { type: 'fractal', scale: 2, octaves: 6, persistence: 0.5, lacunarity: 2 },
      architecture: { type: 'checker', scale: 4, octaves: 2, persistence: 0.3, lacunarity: 2 },
      vehicle: { type: 'gradient', scale: 8, octaves: 3, persistence: 0.4, lacunarity: 2 },
      fashion: { type: 'cellular', scale: 3, octaves: 4, persistence: 0.6, lacunarity: 2 },
      robotics: { type: 'noise', scale: 1, octaves: 8, persistence: 0.3, lacunarity: 2 },
      food: { type: 'voronoi', scale: 2, octaves: 3, persistence: 0.5, lacunarity: 2 },
      furniture: { type: 'stripe', scale: 4, octaves: 2, persistence: 0.4, lacunarity: 2 },
      procedural: { type: 'radial', scale: 6, octaves: 5, persistence: 0.5, lacunarity: 2 },
      circuit: { type: 'noise', scale: 0.5, octaves: 10, persistence: 0.2, lacunarity: 2 },
      nature: { type: 'fractal', scale: 3, octaves: 7, persistence: 0.6, lacunarity: 2 },
    };

    return patterns[domain] || { type: 'noise', scale: 1, octaves: 4, persistence: 0.5, lacunarity: 2 };
  }

  /**
   * Render domain artifact with photorealistic quality
   */
  async renderDomainArtifact(
    artifact: Artifact,
    domain: string
  ): Promise<Float32Array | null> {
    if (!this.renderer || !this.canvas) {
      return null;
    }

    // Generate materials for domain
    const seed = { $id: artifact.seed_hash, domain } as SeedType;
    const material = this.generateDomainMaterial(domain, seed);
    
    // Generate textures if enabled
    if (this.config.enableAIEnhancement) {
      const textureMaps = this.generateDomainTextures(seed, domain);
      if (textureMaps) {
        material.textureMaps = textureMaps;
      }
    }

    // Create render scene
    const scene: RenderScene = {
      meshes: [], // Would be populated from artifact geometry
      lights: [
        {
          type: 'directional',
          position: [0.5, -1, 0.5],
        },
        {
          type: 'point',
          position: [2, 3, 2],
        },
      ],
      camera: {
        position: [0, 2, 5],
        target: [0, 0, 0],
        fov: 45,
      },
    };

    // Render scene
    return await this.renderer.render(scene);
  }

  /**
   * Generate domain-specific material
   */
  private generateDomainMaterial(domain: string, seed: SeedType): PBRMaterial {
    const materialGenerators: Record<string, (seed: SeedType) => PBRMaterial> = {
      character: this.generateCharacterMaterials,
      architecture: this.generateArchitectureMaterials,
      vehicle: this.generateVehicleMaterials,
      fashion: this.generateFashionMaterials,
      robotics: this.generateRoboticsMaterials,
      food: this.generateFoodMaterials,
      furniture: this.generateFurnitureMaterials,
      procedural: this.generateProceduralMaterials,
      circuit: this.generateCircuitMaterials,
      ecosystem: this.generateNatureMaterials,
      alife: this.generateNatureMaterials,
      particle: this.generateProceduralMaterials,
      geometry3d: this.generateProceduralMaterials,
    };

    const generator = materialGenerators[domain] || this.generateProceduralMaterials;
    return generator.call(this, seed);
  }

  /**
   * Convert PBRMaterial to ExportMaterial format
   */
  private convertToExportMaterial(material: PBRMaterial): ExportMaterial {
    return {
      name: material.name,
      baseColor: new Float32Array(material.baseColor),
      metallic: material.metallic,
      roughness: material.roughness,
      metallicRoughnessTexture: material.textureMaps ? {
        name: 'metallicRoughness',
        data: new Float32Array(this.config.textureResolution * this.config.textureResolution),
        width: this.config.textureResolution,
        height: this.config.textureResolution,
        format: 'rg8' as const,
        srgb: false,
      } : undefined,
      normalTexture: material.textureMaps ? {
        name: 'normal',
        data: new Float32Array(this.config.textureResolution * this.config.textureResolution * 3),
        width: this.config.textureResolution,
        height: this.config.textureResolution,
        format: 'rgb8' as const,
        srgb: false,
      } : undefined,
      emissive: material.emissiveFactor ? new Float32Array(material.emissiveFactor) : new Float32Array([0, 0, 0]),
      occlusionTexture: material.textureMaps ? {
        name: 'occlusion',
        data: new Float32Array(this.config.textureResolution * this.config.textureResolution),
        width: this.config.textureResolution,
        height: this.config.textureResolution,
        format: 'r8' as const,
        srgb: false,
      } : undefined,
      clearcoat: material.clearcoat,
      clearcoatRoughness: material.clearcoatRoughness,
      transmission: material.transmission,
      thickness: material.thickness,
      ior: material.ior,
    };
  }

  /**
   * Export domain artifact with photorealistic materials
   */
  async exportDomainArtifact(
    artifact: Artifact,
    domain: string,
    format: 'gltf' | 'glb' = 'glb'
  ): Promise<Uint8Array | null> {
    if (!this.renderer) {
      return null;
    }

    const seed = { $id: artifact.seed_hash, domain } as SeedType;
    const material = this.generateDomainMaterial(domain, seed);
    const textureMaps = this.generateDomainTextures(seed, domain);

    const exportMaterial = this.convertToExportMaterial(material);

    const exportAsset: ExportAsset = {
      meshes: [], // Would be populated from artifact geometry
      materials: [exportMaterial],
      animations: [],
      textures: textureMaps ? Object.entries(textureMaps).map(([name, data]) => ({
        name,
        data,
        width: this.config.textureResolution,
        height: this.config.textureResolution,
        format: 'rgba8' as const,
        srgb: name === 'albedo',
      })) : [],
    };

    return await this.renderer.exportScene(exportAsset, {
      format,
      binary: true,
      compress: true,
      compressionLevel: 6,
      includeAnimations: false,
      includeMaterials: true,
      embedTextures: true,
    });
  }

  /**
   * Get available domains
   */
  getAvailableDomains(): string[] {
    return [
      'character',
      'sprite',
      'music',
      'visual2d',
      'narrative',
      'ui',
      'game',
      'geometry3d',
      'animation',
      'shader',
      'particle',
      'ecosystem',
      'procedural',
      'fullgame',
      'typography',
      'architecture',
      'vehicle',
      'furniture',
      'fashion',
      'robotics',
      'circuit',
      'food',
      'choreography',
      'alife',
      'agent',
      'physics',
      'audio',
    ];
  }

  /**
   * Update rendering configuration
   */
  updateConfig(config: Partial<DomainRenderingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): DomainRenderingConfig {
    return { ...this.config };
  }
}

/**
 * Create a domain rendering integration instance
 */
export function createDomainRenderingIntegration(
  config?: Partial<DomainRenderingConfig>
): DomainRenderingIntegration {
  return new DomainRenderingIntegration(config);
}

/**
 * Helper function to render any domain artifact with photorealistic quality
 */
export async function renderArtifactWithPhotorealisticQuality(
  artifact: Artifact,
  domain: string,
  canvas: HTMLCanvasElement,
  config?: Partial<DomainRenderingConfig>
): Promise<Float32Array | null> {
  const integration = createDomainRenderingIntegration(config);
  await integration.initialize(canvas);
  return await integration.renderDomainArtifact(artifact, domain);
}
