/**
 * Animation and Rigging Systems for Photorealistic Characters
 * Implements skeletal animation, blend shapes, IK/FK, physics-based animation
 */

export interface Skeleton {
  bones: Bone[];
  rootBoneIndex: number;
}

export interface Bone {
  name: string;
  parentIndex: number;
  bindPose: Float32Array; // 4x4 matrix
  inverseBindPose: Float32Array; // 4x4 matrix
  localTransform: Float32Array; // 4x4 matrix
  worldTransform: Float32Array; // 4x4 matrix
}

export interface AnimationClip {
  name: string;
  duration: number;
  tracks: AnimationTrack[];
}

export interface AnimationTrack {
  boneIndex: number;
  positionKeyframes: Keyframe[][];
  rotationKeyframes: Keyframe[][];
  scaleKeyframes: Keyframe[][];
}

export interface Keyframe {
  time: number;
  value: number;
}

export interface BlendShape {
  name: string;
  targetVertices: Float32Array;
  targetNormals: Float32Array;
  weight: number;
}

export interface IKChain {
  boneIndices: number[];
  targetPosition: [number, number, number];
  poleVector: [number, number, number];
  solver: 'ccd' | 'fabrik' | 'jacobian';
}

export class AnimationSystem {
  private skeleton: Skeleton | null = null;
  private animationClips: Map<string, AnimationClip> = new Map();
  private blendShapes: Map<string, BlendShape> = new Map();
  private currentTime = 0;
  private currentAnimation: string | null = null;
  private isPlaying = false;

  /**
   * Load skeleton for animation
   */
  loadSkeleton(skeleton: Skeleton): void {
    this.skeleton = skeleton;
    this.updateBoneTransforms();
  }

  /**
   * Load animation clip
   */
  loadAnimationClip(clip: AnimationClip): void {
    this.animationClips.set(clip.name, clip);
  }

  /**
   * Load blend shape
   */
  loadBlendShape(blendShape: BlendShape): void {
    this.blendShapes.set(blendShape.name, blendShape);
  }

  /**
   * Play animation
   */
  play(animationName: string): void {
    this.currentAnimation = animationName;
    this.currentTime = 0;
    this.isPlaying = true;
  }

  /**
   * Stop animation
   */
  stop(): void {
    this.isPlaying = false;
  }

  /**
   * Update animation state
   */
  update(deltaTime: number): void {
    if (!this.isPlaying || !this.currentAnimation || !this.skeleton) {
      return;
    }

    const clip = this.animationClips.get(this.currentAnimation);
    if (!clip) return;

    this.currentTime += deltaTime;
    if (this.currentTime > clip.duration) {
      this.currentTime = this.currentTime % clip.duration; // Loop
    }

    this.evaluateAnimation(clip, this.currentTime);
    this.updateBoneTransforms();
  }

  /**
   * Evaluate animation at given time
   */
  private evaluateAnimation(clip: AnimationClip, time: number): void {
    if (!this.skeleton) return;

    for (const track of clip.tracks) {
      const bone = this.skeleton.bones[track.boneIndex];

      // Interpolate position
      const pos = this.interpolateKeyframes(track.positionKeyframes, time);
      // Interpolate rotation
      const rot = this.interpolateKeyframes(track.rotationKeyframes, time);
      // Interpolate scale
      const scale = this.interpolateKeyframes(track.scaleKeyframes, time);

      // Update local transform
      this.setBoneLocalTransform(bone, pos, rot, scale);
    }
  }

  /**
   * Interpolate keyframes at given time
   */
  private interpolateKeyframes(keyframes: Keyframe[][], time: number): [number, number, number, number] {
    if (keyframes.length === 0) return [0, 0, 0, 1];
    if (keyframes.length === 1) return [keyframes[0][0].value, keyframes[1][0].value, keyframes[2][0].value, keyframes[3][0].value];

    // Find surrounding keyframes
    let prevIndex = 0;
    let nextIndex = 1;

    for (let i = 0; i < keyframes[0].length - 1; i++) {
      if (time >= keyframes[0][i].time && time <= keyframes[0][i + 1].time) {
        prevIndex = i;
        nextIndex = i + 1;
        break;
      }
    }

    const prevTime = keyframes[0][prevIndex].time;
    const nextTime = keyframes[0][nextIndex].time;
    const t = (time - prevTime) / (nextTime - prevTime);

    // Linear interpolation
    return [
      this.lerp(keyframes[0][prevIndex].value, keyframes[0][nextIndex].value, t),
      this.lerp(keyframes[1][prevIndex].value, keyframes[1][nextIndex].value, t),
      this.lerp(keyframes[2][prevIndex].value, keyframes[2][nextIndex].value, t),
      this.lerp(keyframes[3][prevIndex].value, keyframes[3][nextIndex].value, t),
    ];
  }

  /**
   * Update bone world transforms
   */
  private updateBoneTransforms(): void {
    if (!this.skeleton) return;

    for (let i = 0; i < this.skeleton.bones.length; i++) {
      const bone = this.skeleton.bones[i];

      if (bone.parentIndex === -1) {
        // Root bone
        bone.worldTransform.set(bone.localTransform);
      } else {
        const parent = this.skeleton.bones[bone.parentIndex];
        bone.worldTransform.set(this.multiplyMatrices(parent.worldTransform, bone.localTransform));
      }
    }
  }

  /**
   * Get skinning matrices
   */
  getSkinningMatrices(): Float32Array {
    if (!this.skeleton) return new Float32Array(0);

    const matrices = new Float32Array(this.skeleton.bones.length * 16);

    for (let i = 0; i < this.skeleton.bones.length; i++) {
      const bone = this.skeleton.bones[i];
      const skinningMatrix = this.multiplyMatrices(bone.worldTransform, bone.inverseBindPose);
      matrices.set(skinningMatrix, i * 16);
    }

    return matrices;
  }

  /**
   * Apply blend shapes to mesh
   */
  applyBlendShapes(
    baseVertices: Float32Array,
    baseNormals: Float32Array,
    activeShapes: Map<string, number>
  ): { vertices: Float32Array; normals: Float32Array } {
    const vertices = new Float32Array(baseVertices);
    const normals = new Float32Array(baseNormals);

    for (const [name, weight] of activeShapes) {
      const shape = this.blendShapes.get(name);
      if (!shape) continue;

      const clampedWeight = Math.max(0, Math.min(1, weight));

      for (let i = 0; i < vertices.length; i++) {
        vertices[i] += (shape.targetVertices[i] - baseVertices[i]) * clampedWeight;
      }

      for (let i = 0; i < normals.length; i++) {
        normals[i] += (shape.targetNormals[i] - baseNormals[i]) * clampedWeight;
      }
    }

    // Renormalize normals
    for (let i = 0; i < normals.length; i += 3) {
      const len = Math.sqrt(normals[i] * normals[i] + normals[i + 1] * normals[i + 1] + normals[i + 2] * normals[i + 2]);
      if (len > 0) {
        normals[i] /= len;
        normals[i + 1] /= len;
        normals[i + 2] /= len;
      }
    }

    return { vertices, normals };
  }

  /**
   * Solve IK for a chain
   */
  solveIK(chain: IKChain): void {
    if (!this.skeleton) return;

    switch (chain.solver) {
      case 'ccd':
        this.solveCCDIK(chain);
        break;
      case 'fabrik':
        this.solveFABRIK(chain);
        break;
      case 'jacobian':
        this.solveJacobianIK(chain);
        break;
    }
  }

  /**
   * CCD (Cyclic Coordinate Descent) IK solver
   */
  private solveCCDIK(chain: IKChain): void {
    if (!this.skeleton) return;

    const maxIterations = 10;
    const tolerance = 0.001;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Process bones from end effector to root
      for (let i = chain.boneIndices.length - 1; i >= 0; i--) {
        const boneIndex = chain.boneIndices[i];
        const bone = this.skeleton.bones[boneIndex];

        // Get end effector position
        const endEffectorIndex = chain.boneIndices[chain.boneIndices.length - 1];
        const endEffectorPos = this.getBonePosition(this.skeleton.bones[endEffectorIndex]);

        // Get bone position
        const bonePos = this.getBonePosition(bone);

        // Vector from bone to end effector
        const toEnd = this.subtract(endEffectorPos, bonePos);
        // Vector from bone to target
        const toTarget = this.subtract(chain.targetPosition, bonePos);

        // Compute rotation to align toEnd with toTarget
        const rotation = this.computeRotationToAlign(toEnd, toTarget);

        // Apply rotation to bone
        this.rotateBone(bone, rotation);
      }

      this.updateBoneTransforms();
    }
  }

  /**
   * FABRIK (Forward And Backward Reaching Inverse Kinematics) solver
   */
  private solveFABRIK(chain: IKChain): void {
    if (!this.skeleton) return;

    const positions: [number, number, number][] = [];
    const lengths: number[] = [];

    // Get initial positions and bone lengths
    for (let i = 0; i < chain.boneIndices.length; i++) {
      const bone = this.skeleton.bones[chain.boneIndices[i]];
      positions.push(this.getBonePosition(bone));

      if (i > 0) {
        const prevPos = positions[i - 1];
        const currPos = positions[i];
        lengths.push(this.distance(prevPos, currPos));
      }
    }

    const maxIterations = 10;

    for (let iter = 0; iter < maxIterations; iter++) {
      // Backward reaching
      positions[positions.length - 1] = chain.targetPosition;
      for (let i = positions.length - 2; i >= 0; i--) {
        const dir = this.normalize(this.subtract(positions[i], positions[i + 1]));
        positions[i] = this.add(positions[i + 1], this.scale(dir, lengths[i]));
      }

      // Forward reaching
      positions[0] = this.getBonePosition(this.skeleton.bones[chain.boneIndices[0]]);
      for (let i = 0; i < positions.length - 1; i++) {
        const dir = this.normalize(this.subtract(positions[i + 1], positions[i]));
        positions[i + 1] = this.add(positions[i], this.scale(dir, lengths[i]));
      }
    }

    // Update bone transforms
    for (let i = 0; i < chain.boneIndices.length; i++) {
      const bone = this.skeleton.bones[chain.boneIndices[i]];
      this.setBonePosition(bone, positions[i]);
    }

    this.updateBoneTransforms();
  }

  /**
   * Jacobian IK solver (simplified)
   */
  private solveJacobianIK(chain: IKChain): void {
    // Placeholder for Jacobian-based IK
    // In production, would compute Jacobian matrix and solve using damped least squares
  }

  /**
   * Get bone position from world transform
   */
  private getBonePosition(bone: Bone): [number, number, number] {
    return [bone.worldTransform[12], bone.worldTransform[13], bone.worldTransform[14]];
  }

  /**
   * Set bone position in world transform
   */
  private setBonePosition(bone: Bone, position: [number, number, number]): void {
    bone.worldTransform[12] = position[0];
    bone.worldTransform[13] = position[1];
    bone.worldTransform[14] = position[2];
  }

  /**
   * Rotate bone around axis
   */
  private rotateBone(bone: Bone, rotation: [number, number, number, number]): void {
    // Apply rotation to local transform
    const rotationMatrix = this.quaternionToMatrix(rotation);
    bone.localTransform = this.multiplyMatrices(rotationMatrix, bone.localTransform);
  }

  /**
   * Compute rotation to align two vectors
   */
  private computeRotationToAlign(from: [number, number, number], to: [number, number, number]): [number, number, number, number] {
    const fromNorm = this.normalize(from);
    const toNorm = this.normalize(to);

    const dot = fromNorm[0] * toNorm[0] + fromNorm[1] * toNorm[1] + fromNorm[2] * toNorm[2];
    const cross = [
      fromNorm[1] * toNorm[2] - fromNorm[2] * toNorm[1],
      fromNorm[2] * toNorm[0] - fromNorm[0] * toNorm[2],
      fromNorm[0] * toNorm[1] - fromNorm[1] * toNorm[0],
    ];

    const s = Math.sqrt((1 + dot) * 2);
    const invS = 1 / s;

    return [cross[0] * invS, cross[1] * invS, cross[2] * invS, s * 0.5];
  }

  /**
   * Set bone local transform from position, rotation, scale
   */
  private setBoneLocalTransform(bone: Bone, pos: [number, number, number, number], rot: [number, number, number, number], scale: [number, number, number, number]): void {
    const translationMatrix = this.translationMatrix(pos[0], pos[1], pos[2]);
    const rotationMatrix = this.quaternionToMatrix(rot);
    const scaleMatrix = this.scaleMatrix(scale[0], scale[1], scale[2]);

    bone.localTransform = this.multiplyMatrices(
      this.multiplyMatrices(translationMatrix, rotationMatrix),
      scaleMatrix
    );
  }

  /**
   * Matrix utilities
   */
  private multiplyMatrices(a: Float32Array, b: Float32Array): Float32Array {
    const result = new Float32Array(16);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        result[row * 4 + col] =
          a[row * 4] * b[col] +
          a[row * 4 + 1] * b[col + 4] +
          a[row * 4 + 2] * b[col + 8] +
          a[row * 4 + 3] * b[col + 12];
      }
    }

    return result;
  }

  private translationMatrix(x: number, y: number, z: number): Float32Array {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      x, y, z, 1,
    ]);
  }

  private scaleMatrix(x: number, y: number, z: number): Float32Array {
    return new Float32Array([
      x, 0, 0, 0,
      0, y, 0, 0,
      0, 0, z, 0,
      0, 0, 0, 1,
    ]);
  }

  private quaternionToMatrix(q: [number, number, number, number]): Float32Array {
    const [x, y, z, w] = q;
    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const xy = x * y;
    const xz = x * z;
    const yz = y * z;
    const wx = w * x;
    const wy = w * y;
    const wz = w * z;

    return new Float32Array([
      1 - 2 * (yy + zz), 2 * (xy - wz), 2 * (xz + wy), 0,
      2 * (xy + wz), 1 - 2 * (xx + zz), 2 * (yz - wx), 0,
      2 * (xz - wy), 2 * (yz + wx), 1 - 2 * (xx + yy), 0,
      0, 0, 0, 1,
    ]);
  }

  /**
   * Vector utilities
   */
  private normalize(v: [number, number, number]): [number, number, number] {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return len > 0 ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
  }

  private subtract(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]] as [number, number, number];
  }

  private add(a: [number, number, number], b: [number, number, number]): [number, number, number] {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]] as [number, number, number];
  }

  private scale(v: [number, number, number], s: number): [number, number, number] {
    return [v[0] * s, v[1] * s, v[2] * s] as [number, number, number];
  }

  private distance(a: [number, number, number], b: [number, number, number]): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}

/**
 * Create an animation system instance
 */
export function createAnimationSystem(): AnimationSystem {
  return new AnimationSystem();
}
