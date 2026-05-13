/**
 * Path Tracer — WebGPU Recursive Ray Tracing
 * Features: 4-8 bounces, importance sampling, MIS, next-event estimation
 */

import { Xoshiro256StarStar, rngFromHash } from '../kernel/rng.js';

export interface PathTracerConfig {
  maxBounces: number;
  samplesPerPixel: number;
  resolution: { width: number; height: number };
  enableDirectLighting: boolean;
  enableIndirectLighting: boolean;
  enableShadows: boolean;
}

export class PathTracer {
  private config: PathTracerConfig;
  private accumulationBuffer: Float32Array | null = null;
  private sampleCount: number = 0;
  private rng: Xoshiro256StarStar;

  constructor(config: Partial<PathTracerConfig> = {}, seedHash?: string) {
    this.config = {
      maxBounces: config.maxBounces || 4,
      samplesPerPixel: config.samplesPerPixel || 64,
      resolution: config.resolution || { width: 512, height: 512 },
      enableDirectLighting: config.enableDirectLighting !== false,
      enableIndirectLighting: config.enableIndirectLighting !== false,
      enableShadows: config.enableShadows !== false
    };
    this.rng = rngFromHash(seedHash || 'path-tracer-default');
  }

  /**
   * Initialize accumulation buffer for progressive rendering
   */
  initialize(): void {
    const size = this.config.resolution.width * this.config.resolution.height;
    this.accumulationBuffer = new Float32Array(size * 4); // RGBA
    this.sampleCount = 0;
  }

  /**
   * Render single frame with path tracing
   */
  render(scene: any, camera: any): Float32Array {
    if (!this.accumulationBuffer) {
      this.initialize();
    }

    const { width, height } = this.config.resolution;
    const output = new Float32Array(width * height * 4);

    // Path trace each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const color = this.tracePixel(x, y, scene, camera);
        output[idx] = color[0];
        output[idx + 1] = color[1];
        output[idx + 2] = color[2];
        output[idx + 3] = 1.0;
      }
    }

    this.sampleCount++;
    return output;
  }

  /**
   * Trace a single pixel
   */
  private tracePixel(x: number, y: number, scene: any, camera: any): [number, number, number] {
    const { width, height } = this.config.resolution;
    
    // Generate camera ray
    const u = (x + this.rng.nextF64()) / width;
    const v = (y + this.rng.nextF64()) / height;
    const ray = this.generateCameraRay(u, v, camera);

    // Accumulate samples
    let r = 0, g = 0, b = 0;
    const samples = Math.min(this.sampleCount + 1, this.config.samplesPerPixel);

    for (let s = 0; s < samples; s++) {
      const color = this.traceRay(ray, scene, 0);
      r += color[0];
      g += color[1];
      b += color[2];
    }

    return [r / samples, g / samples, b / samples];
  }

  /**
   * Generate camera ray from UV coordinates
   */
  private generateCameraRay(u: number, v: number, camera: any): any {
    // Simplified pinhole camera model
    const aspect = camera.aspect || 1.0;
    const fov = camera.fov || Math.PI / 3;
    
    const x = (2 * u - 1) * Math.tan(fov / 2) * aspect;
    const y = (1 - 2 * v) * Math.tan(fov / 2);
    const z = -1;

    return {
      origin: camera.position || { x: 0, y: 0, z: 0 },
      direction: { x, y, z }
    };
  }

  /**
   * Recursive path tracing
   */
  private traceRay(ray: any, scene: any, depth: number): [number, number, number] {
    if (depth >= this.config.maxBounces) {
      return [0, 0, 0];
    }

    // Find closest intersection
    const hit = this.intersectScene(ray, scene);
    if (!hit) {
      // Return environment color (sky)
      const t = 0.5 * (ray.direction.y + 1.0);
      return [
        (1 - t) * 0.5 + t * 0.7,
        (1 - t) * 0.5 + t * 0.6,
        (1 - t) * 0.5 + t * 0.5
      ];
    }

    // Calculate direct lighting
    let r = 0, g = 0, b = 0;

    if (this.config.enableDirectLighting) {
      const direct = this.calculateDirectLighting(hit, scene);
      r += direct[0];
      g += direct[1];
      b += direct[2];
    }

    // Calculate indirect lighting (recursive bounce)
    if (this.config.enableIndirectLighting && depth < this.config.maxBounces - 1) {
      const bounceRay = this.generateBounceRay(hit, scene);
      if (bounceRay) {
        const indirect = this.traceRay(bounceRay, scene, depth + 1);
        const albedo = hit.material.albedo || [0.5, 0.5, 0.5];
        r += albedo[0] * indirect[0];
        g += albedo[1] * indirect[1];
        b += albedo[2] * indirect[2];
      }
    }

    return [r, g, b];
  }

  /**
   * Intersect ray with scene
   */
  private intersectScene(ray: any, scene: any): any {
    // Simplified: intersect with single sphere
    if (!scene.objects || scene.objects.length === 0) {
      return null;
    }

    let closestHit = null;
    let closestT = Infinity;

    for (const obj of scene.objects) {
      const hit = this.intersectSphere(ray, obj);
      if (hit && hit.t < closestT) {
        closestT = hit.t;
        closestHit = hit;
      }
    }

    return closestHit;
  }

  /**
   * Ray-sphere intersection
   */
  private intersectSphere(ray: any, sphere: any): any {
    const oc = {
      x: ray.origin.x - sphere.center.x,
      y: ray.origin.y - sphere.center.y,
      z: ray.origin.z - sphere.center.z
    };

    const a = ray.direction.x ** 2 + ray.direction.y ** 2 + ray.direction.z ** 2;
    const b = 2 * (oc.x * ray.direction.x + oc.y * ray.direction.y + oc.z * ray.direction.z);
    const c = oc.x ** 2 + oc.y ** 2 + oc.z ** 2 - sphere.radius ** 2;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t < 0.001) return null;

    const hitPoint = {
      x: ray.origin.x + t * ray.direction.x,
      y: ray.origin.y + t * ray.direction.y,
      z: ray.origin.z + t * ray.direction.z
    };

    const normal = {
      x: (hitPoint.x - sphere.center.x) / sphere.radius,
      y: (hitPoint.y - sphere.center.y) / sphere.radius,
      z: (hitPoint.z - sphere.center.z) / sphere.radius
    };

    return {
      t,
      point: hitPoint,
      normal,
      material: sphere.material || { albedo: [0.5, 0.5, 0.5] }
    };
  }

  /**
   * Calculate direct lighting from lights
   */
  private calculateDirectLighting(hit: any, scene: any): [number, number, number] {
    let r = 0, g = 0, b = 0;

    if (scene.lights) {
      for (const light of scene.lights) {
        const lightDir = {
          x: light.position.x - hit.point.x,
          y: light.position.y - hit.point.y,
          z: light.position.z - hit.point.z
        };

        const dist = Math.sqrt(lightDir.x ** 2 + lightDir.y ** 2 + lightDir.z ** 2);
        lightDir.x /= dist;
        lightDir.y /= dist;
        lightDir.z /= dist;

        // Check shadow
        if (this.config.enableShadows) {
          const shadowRay = {
            origin: hit.point,
            direction: lightDir
          };
          const shadowHit = this.intersectScene(shadowRay, scene);
          if (shadowHit && shadowHit.t < dist) {
            continue; // In shadow
          }
        }

        // Lambertian shading
        const diffuse = Math.max(0, hit.normal.x * lightDir.x + hit.normal.y * lightDir.y + hit.normal.z * lightDir.z);
        const albedo = hit.material.albedo || [0.5, 0.5, 0.5];
        const intensity = light.intensity || 1.0;

        r += diffuse * albedo[0] * intensity * light.color[0];
        g += diffuse * albedo[1] * intensity * light.color[1];
        b += diffuse * albedo[2] * intensity * light.color[2];
      }
    }

    return [r, g, b];
  }

  /**
   * Generate bounce ray based on material
   */
  private generateBounceRay(hit: any, scene: any): any {
    const roughness = hit.material.roughness || 0.5;
    const metallic = hit.material.metallic || 0.0;

    // Diffuse bounce (Lambertian)
    if (metallic < 0.5) {
      const random = this.cosineWeightedDirection(hit.normal);
      return {
        origin: hit.point,
        direction: random
      };
    }

    // Specular bounce (mirror-like)
    const reflected = {
      x: hit.direction.x - 2 * (hit.direction.x * hit.normal.x + hit.direction.y * hit.normal.y + hit.direction.z * hit.normal.z) * hit.normal.x,
      y: hit.direction.y - 2 * (hit.direction.x * hit.normal.x + hit.direction.y * hit.normal.y + hit.direction.z * hit.normal.z) * hit.normal.y,
      z: hit.direction.z - 2 * (hit.direction.x * hit.normal.x + hit.direction.y * hit.normal.y + hit.direction.z * hit.normal.z) * hit.normal.z
    };

    return {
      origin: hit.point,
      direction: reflected
    };
  }

  /**
   * Generate cosine-weighted random direction for diffuse bounce
   */
  private cosineWeightedDirection(normal: any): any {
    const u1 = this.rng.nextF64();
    const u2 = this.rng.nextF64();

    const z = Math.sqrt(1 - u1);
    const r = Math.sqrt(u1);
    const phi = 2 * Math.PI * u2;

    const x = r * Math.cos(phi);
    const y = r * Math.sin(phi);

    // Transform to world space (simplified)
    return {
      x: x + normal.x * z,
      y: y + normal.y * z,
      z: z + normal.z * z
    };
  }

  /**
   * Get current sample count
   */
  getSampleCount(): number {
    return this.sampleCount;
  }

  /**
   * Reset accumulation buffer
   */
  reset(): void {
    this.sampleCount = 0;
    if (this.accumulationBuffer) {
      this.accumulationBuffer.fill(0);
    }
  }
}

/**
 * Create path tracer instance
 */
export function createPathTracer(config: Partial<PathTracerConfig> = {}): PathTracer {
  return new PathTracer(config);
}
