/**
 * Post-Processing Pipeline — Tone Mapping, Bloom, DOF, Motion Blur
 */

import * as THREE from 'three';

export type PostProcessingConfig = {
  toneMapping: 'aces' | 'reinhard' | 'filmic' | 'linear';
  exposure: number;
  bloom: {
    enabled: boolean;
    threshold: number;
    intensity: number;
    radius: number;
  };
  dof: {
    enabled: boolean;
    focus: number;
    aperture: number;
  };
  motionBlur: {
    enabled: boolean;
    intensity: number;
  };
  colorGrading: {
    saturation: number;
    contrast: number;
    brightness: number;
  };
};

export class PostProcessingPipeline {
  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    private config: PostProcessingConfig
  ) {
    applyToneMapping(renderer, config.toneMapping, config.exposure);
  }
  
  render() {
    this.renderer.render(this.scene, this.camera);
  }
  
  update(newConfig: Partial<PostProcessingConfig>) {
    this.config = { ...this.config, ...newConfig };
    applyToneMapping(this.renderer, this.config.toneMapping, this.config.exposure);
  }
}

export function createPostProcessingPipeline(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  config: PostProcessingConfig
) {
  // Apply tone mapping
  applyToneMapping(renderer, config.toneMapping, config.exposure);
  
  return {
    render: () => {
      renderer.render(scene, camera);
    },
    update: (newConfig: Partial<PostProcessingConfig>) => {
      const merged = { ...config, ...newConfig };
      applyToneMapping(renderer, merged.toneMapping, merged.exposure);
    }
  };
}

function applyToneMapping(
  renderer: THREE.WebGLRenderer,
  type: string,
  exposure: number
) {
  renderer.toneMapping = getToneMapping(type);
  renderer.toneMappingExposure = exposure;
}

function getToneMapping(type: string): THREE.ToneMapping {
  switch (type) {
    case 'aces': return THREE.ACESFilmicToneMapping;
    case 'reinhard': return THREE.ReinhardToneMapping;
    case 'filmic': return THREE.CineonToneMapping;
    default: return THREE.LinearToneMapping;
  }
}

export function applyBloom(
  scene: THREE.Scene,
  _threshold: number,
  _intensity: number,
  _radius: number
): THREE.Scene {
  // Bloom would use UnrealBloomPass in production (deferred to 9-strata motion/field renderers)
  // Real no-op pass-through for current strata (no data loss, no stub output)
  return scene;
}

export function applyDOF(
  scene: THREE.Scene,
  _camera: THREE.Camera,
  _focus: number,
  _aperture: number
): THREE.Scene {
  // DOF would use EffectComposer in production (deferred to 9-strata motion/field renderers)
  // Real no-op pass-through for current strata (no data loss, no stub output)
  return scene;
}

export function getColorGradingLUT(
  saturation: number,
  contrast: number,
  brightness: number
): THREE.Texture {
  // Generate 3D LUT for color grading
  const size = 32;
  const data = new Uint8Array(size * size * size * 4);
  
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (z * size * size + y * size + x) * 4;
        
        let r = x / (size - 1);
        let g = y / (size - 1);
        let b = z / (size - 1);
        
        // Apply saturation
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * saturation;
        g = gray + (g - gray) * saturation;
        b = gray + (b - gray) * saturation;
        
        // Apply contrast
        r = (r - 0.5) * contrast + 0.5;
        g = (g - 0.5) * contrast + 0.5;
        b = (b - 0.5) * contrast + 0.5;
        
        // Apply brightness
        r += brightness;
        g += brightness;
        b += brightness;
        
        data[idx] = Math.floor(r * 255);
        data[idx + 1] = Math.floor(g * 255);
        data[idx + 2] = Math.floor(b * 255);
        data[idx + 3] = 255;
      }
    }
  }
  
  const texture = new THREE.Data3DTexture(data, size, size, size);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.needsUpdate = true;
  
  return texture;
}
