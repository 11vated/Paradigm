/**
 * Holographic Workspace Simulation
 * 
 * This system provides depth, parallax, and motion physics for the
 * holographic workspace experience in Paradigm Infinite Studio.
 * 
 * Features:
 * - 3D depth simulation with perspective projection
 * - Multi-layer parallax effects
 * - Physics-based motion with inertia and damping
 * - Holographic visual effects (glow, refraction, distortion)
 * - Deterministic physics (seed-based)
 */

import { type Seed } from '@/lib/kernel/types';
import { rngFromHash } from '@/lib/kernel/rng';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Camera {
  position: Vector3;
  rotation: Vector3;
  fov: number;
  near: number;
  far: number;
}

interface PhysicsBody {
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  mass: number;
  restitution: number;
  friction: number;
}

interface HolographicLayer {
  depth: number;
  parallaxFactor: number;
  opacity: number;
  blur: number;
  distortion: number;
}

export class HolographicWorkspace {
  private camera: Camera;
  private physicsBodies: Map<string, PhysicsBody>;
  private layers: HolographicLayer[];
  private time: number;
  private rng: (() => number) | null = null;
  private gravity: Vector3 = { x: 0, y: -9.81, z: 0 };
  private damping: number = 0.98;
  
  constructor() {
    this.camera = {
      position: { x: 0, y: 0, z: 1000 },
      rotation: { x: 0, y: 0, z: 0 },
      fov: 60,
      near: 0.1,
      far: 10000,
    };
    
    this.physicsBodies = new Map();
    this.layers = this.createDefaultLayers();
    this.time = 0;
  }
  
  /**
   * Create default holographic layers
   */
  private createDefaultLayers(): HolographicLayer[] {
    return [
      { depth: 0, parallaxFactor: 1.0, opacity: 1.0, blur: 0, distortion: 0 },
      { depth: 100, parallaxFactor: 0.8, opacity: 0.9, blur: 0.5, distortion: 0.1 },
      { depth: 200, parallaxFactor: 0.6, opacity: 0.8, blur: 1.0, distortion: 0.2 },
      { depth: 400, parallaxFactor: 0.4, opacity: 0.6, blur: 2.0, distortion: 0.3 },
      { depth: 800, parallaxFactor: 0.2, opacity: 0.4, blur: 4.0, distortion: 0.4 },
    ];
  }
  
  /**
   * Initialize with seed for deterministic physics
   */
  initialize(seed?: Seed): void {
    if (seed) {
      const hash = seed.$hash || seed.id || 'default';
      this.rng = rngFromHash(hash).nextF64;
    } else {
      this.rng = Math.random;
    }
  }
  
  /**
   * Project 3D point to 2D screen space
   */
  project(point: Vector3, screenWidth: number, screenHeight: number): Vector3 {
    const { position: camPos, rotation: camRot, fov, near } = this.camera;
    
    // Translate to camera space
    const x = point.x - camPos.x;
    const y = point.y - camPos.y;
    const z = point.z - camPos.z;
    
    // Apply rotation (simplified)
    const cosY = Math.cos(camRot.y);
    const sinY = Math.sin(camRot.y);
    const rotatedX = x * cosY - z * sinY;
    const rotatedZ = x * sinY + z * cosY;
    
    // Perspective projection
    const fovRad = fov * (Math.PI / 180);
    const scale = near / Math.tan(fovRad / 2);
    
    if (rotatedZ <= near) {
      return { x: 0, y: 0, z: 0 };
    }
    
    const projectedX = (rotatedX * scale) / rotatedZ;
    const projectedY = (y * scale) / rotatedZ;
    
    // Convert to screen coordinates
    const screenX = (projectedX + 1) * screenWidth / 2;
    const screenY = (1 - projectedY) * screenHeight / 2;
    
    return { x: screenX, y: screenY, z: rotatedZ };
  }
  
  /**
   * Apply parallax to a point based on layer depth
   */
  applyParallax(point: Vector3, layerIndex: number, cameraOffset: Vector3): Vector3 {
    const layer = this.layers[layerIndex] || this.layers[0];
    const parallaxX = point.x - cameraOffset.x * layer.parallaxFactor;
    const parallaxY = point.y - cameraOffset.y * layer.parallaxFactor;
    const parallaxZ = point.z - cameraOffset.z * layer.parallaxFactor;
    
    return { x: parallaxX, y: parallaxY, z: parallaxZ };
  }
  
  /**
   * Create a physics body
   */
  createPhysicsBody(id: string, position: Vector3, mass: number = 1): PhysicsBody {
    const body: PhysicsBody = {
      position: { ...position },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      mass,
      restitution: 0.7,
      friction: 0.1,
    };
    
    this.physicsBodies.set(id, body);
    return body;
  }
  
  /**
   * Apply force to a physics body
   */
  applyForce(id: string, force: Vector3): void {
    const body = this.physicsBodies.get(id);
    if (!body) return;
    
    body.acceleration.x += force.x / body.mass;
    body.acceleration.y += force.y / body.mass;
    body.acceleration.z += force.z / body.mass;
  }
  
  /**
   * Update physics simulation
   */
  updatePhysics(deltaTime: number): void {
    this.physicsBodies.forEach((body) => {
      // Apply gravity
      body.acceleration.y += this.gravity.y;
      
      // Update velocity
      body.velocity.x += body.acceleration.x * deltaTime;
      body.velocity.y += body.acceleration.y * deltaTime;
      body.velocity.z += body.acceleration.z * deltaTime;
      
      // Apply damping
      body.velocity.x *= this.damping;
      body.velocity.y *= this.damping;
      body.velocity.z *= this.damping;
      
      // Update position
      body.position.x += body.velocity.x * deltaTime;
      body.position.y += body.velocity.y * deltaTime;
      body.position.z += body.velocity.z * deltaTime;
      
      // Reset acceleration
      body.acceleration = { x: 0, y: 0, z: 0 };
      
      // Boundary collision (simple floor)
      if (body.position.y < -500) {
        body.position.y = -500;
        body.velocity.y *= -body.restitution;
      }
    });
  }
  
  /**
   * Get holographic effect parameters for a layer
   */
  getLayerEffects(layerIndex: number): HolographicLayer {
    return this.layers[layerIndex] || this.layers[0];
  }
  
  /**
   * Calculate holographic glow effect
   */
  calculateGlow(distance: number, intensity: number = 1): number {
    const maxDistance = 1000;
    const normalizedDistance = Math.min(distance / maxDistance, 1);
    return intensity * (1 - normalizedDistance) * 0.5;
  }
  
  /**
   * Calculate holographic distortion
   */
  calculateDistortion(layerIndex: number, time: number): number {
    const layer = this.layers[layerIndex] || this.layers[0];
    const wave = Math.sin(time * 0.001 + layerIndex * 0.5);
    return layer.distortion * wave * 0.1;
  }
  
  /**
   * Update camera position
   */
  updateCamera(position: Partial<Vector3>, rotation?: Partial<Vector3>): void {
    if (position.x !== undefined) this.camera.position.x = position.x;
    if (position.y !== undefined) this.camera.position.y = position.y;
    if (position.z !== undefined) this.camera.position.z = position.z;
    
    if (rotation) {
      if (rotation.x !== undefined) this.camera.rotation.x = rotation.x;
      if (rotation.y !== undefined) this.camera.rotation.y = rotation.y;
      if (rotation.z !== undefined) this.camera.rotation.z = rotation.z;
    }
  }
  
  /**
   * Get camera position
   */
  getCamera(): Camera {
    return { ...this.camera };
  }
  
  /**
   * Update time
   */
  updateTime(deltaTime: number): void {
    this.time += deltaTime;
  }
  
  /**
   * Get current time
   */
  getTime(): number {
    return this.time;
  }
  
  /**
   * Remove physics body
   */
  removePhysicsBody(id: string): void {
    this.physicsBodies.delete(id);
  }
  
  /**
   * Get physics body
   */
  getPhysicsBody(id: string): PhysicsBody | undefined {
    return this.physicsBodies.get(id);
  }
  
  /**
   * Set gravity
   */
  setGravity(gravity: Vector3): void {
    this.gravity = { ...gravity };
  }
  
  /**
   * Set damping
   */
  setDamping(damping: number): void {
    this.damping = Math.max(0, Math.min(1, damping));
  }
  
  /**
   * Set layer configuration
   */
  setLayer(index: number, layer: Partial<HolographicLayer>): void {
    if (index >= 0 && index < this.layers.length) {
      this.layers[index] = { ...this.layers[index], ...layer };
    }
  }
  
  /**
   * Get all layers
   */
  getLayers(): HolographicLayer[] {
    return [...this.layers];
  }
  
  /**
   * Reset camera to default position
   */
  resetCamera(): void {
    this.camera = {
      position: { x: 0, y: 0, z: 1000 },
      rotation: { x: 0, y: 0, z: 0 },
      fov: 60,
      near: 0.1,
      far: 10000,
    };
  }
  
  /**
   * Cleanup
   */
  dispose(): void {
    this.physicsBodies.clear();
    this.layers = [];
    this.rng = null;
  }
}

/**
 * Create a holographic workspace instance
 */
export function createHolographicWorkspace(): HolographicWorkspace {
  return new HolographicWorkspace();
}
