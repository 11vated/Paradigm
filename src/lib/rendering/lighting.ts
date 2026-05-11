/**
 * Lighting System — HDRI Environment, Area Lights, Volumetric
 */

import * as THREE from 'three';

export interface HDRIConfig {
  url?: string;
  intensity: number;
  rotation: number;
  blur: number;
}

export interface AreaLightConfig {
  position: [number, number, number];
  size: [number, number];
  intensity: number;
  color: [number, number, number];
  samples: number;
}

export interface VolumetricConfig {
  enabled: boolean;
  density: number;
  scattering: number;
  absorption: number;
}

export class LightingSystem {
  private scene: THREE.Scene;
  private hdriConfig: HDRIConfig;
  private areaLights: AreaLightConfig[];
  private volumetricConfig: VolumetricConfig;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.hdriConfig = {
      intensity: 1.0,
      rotation: 0,
      blur: 0
    };
    this.areaLights = [];
    this.volumetricConfig = {
      enabled: false,
      density: 0.1,
      scattering: 0.5,
      absorption: 0.1
    };
  }

  /**
   * Setup HDRI environment lighting
   */
  setupHDRI(config: HDRIConfig): void {
    this.hdriConfig = { ...this.hdriConfig, ...config };

    if (config.url) {
      const loader = new THREE.CubeTextureLoader();
      loader.load([config.url], (texture) => {
        this.scene.environment = texture;
        this.scene.background = texture;
        texture.mapping = THREE.EquirectangularReflectionMapping as any;
      });
    }

    this.scene.environmentIntensity = config.intensity;
    this.scene.backgroundIntensity = config.intensity;
  }

  /**
   * Add area light to scene
   */
  addAreaLight(config: AreaLightConfig): THREE.Mesh {
    this.areaLights.push(config);

    const geometry = new THREE.PlaneGeometry(config.size[0], config.size[1]);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(...config.color),
    });

    const light = new THREE.Mesh(geometry, material);
    light.position.set(...config.position);
    this.scene.add(light);

    const pointLight = new THREE.PointLight(
      new THREE.Color(...config.color),
      config.intensity,
      100
    );
    pointLight.position.set(...config.position);
    this.scene.add(pointLight);

    return light;
  }

  /**
   * Setup volumetric lighting
   */
  setupVolumetrics(config: VolumetricConfig): void {
    this.volumetricConfig = { ...this.volumetricConfig, ...config };

    if (config.enabled) {
      // Add fog for volumetric effect approximation
      this.scene.fog = new THREE.FogExp2(0x000000, config.density);
    } else {
      this.scene.fog = null;
    }
  }

  /**
   * Get all lights in scene
   */
  getLights(): Array<{ position: [number, number, number]; color: [number, number, number]; intensity: number }> {
    const lights: Array<{ position: [number, number, number]; color: [number, number, number]; intensity: number }> = [];

    this.scene.traverse((object) => {
      if (object instanceof THREE.Light) {
        lights.push({
          position: [object.position.x, object.position.y, object.position.z],
          color: [object.color.r, object.color.g, object.color.b],
          intensity: object.intensity
        });
      }
    });

    return lights;
  }

  /**
   * Update light intensity
   */
  updateLightIntensity(light: THREE.Light, intensity: number): void {
    light.intensity = intensity;
  }

  /**
   * Update HDRI rotation
   */
  updateHDRIRotation(rotation: number): void {
    this.hdriConfig.rotation = rotation;
    if (this.scene.environment) {
      (this.scene.environment as any).rotation.z = rotation;
    }
    if (this.scene.background) {
      (this.scene.background as any).rotation.z = rotation;
    }
  }

  /**
   * Get lighting configuration
   */
  getConfig(): {
    hdri: HDRIConfig;
    areaLights: AreaLightConfig[];
    volumetric: VolumetricConfig;
  } {
    return {
      hdri: this.hdriConfig,
      areaLights: this.areaLights,
      volumetric: this.volumetricConfig
    };
  }
}

/**
 * Create lighting system instance
 */
export function createLightingSystem(scene: THREE.Scene): LightingSystem {
  return new LightingSystem(scene);
}

/**
 * Setup three-point lighting rig
 */
export function setupThreePointLighting(
  scene: THREE.Scene,
  position: [number, number, number]
): { key: THREE.SpotLight; fill: THREE.PointLight; rim: THREE.SpotLight } {
  // Key light (main, strongest)
  const keyLight = new THREE.SpotLight(0xffffff, 2.0);
  keyLight.position.set(position[0] + 5, position[1] + 5, position[2] + 5);
  keyLight.angle = Math.PI / 6;
  keyLight.penumbra = 0.5;
  scene.add(keyLight);

  // Fill light (softer, from opposite side)
  const fillLight = new THREE.PointLight(0xffffff, 0.5);
  fillLight.position.set(position[0] - 5, position[1], position[2] + 3);
  scene.add(fillLight);

  // Rim light (backlight for edge definition)
  const rimLight = new THREE.SpotLight(0xffffff, 1.0);
  rimLight.position.set(position[0], position[1] + 3, position[2] - 5);
  rimLight.angle = Math.PI / 6;
  rimLight.penumbra = 0.5;
  scene.add(rimLight);

  return { key: keyLight, fill: fillLight, rim: rimLight };
}
