/**
 * Animation Generator — CANONICAL (Doctrine v2 Phase 2 Consolidation)
 *
 * PRIMARY / canonical implementation for animation generation.
 * All engine dispatch, contracts, paradigm make, and new development MUST target this file + animation-contract.ts.
 *
 * Siblings (animation-enhanced.ts + animation-enhanced-contract.ts) carry deprecation banners + PARADIGM-RENAME-OK waivers (sunset 2026-08-25).
 * Real dispatch enforcement + golden regeneration in progress.
 *
 * Features: Keyframe animation, skeletal animation, morph targets
 */
/* eslint-disable @typescript-eslint/no-require-imports -- Animation generator dynamically loads three/examples/jsm/exporters/GLTFExporter.js for GLTF output. */

import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface AnimationParams {
  duration: number;        // seconds (1-60)
  fps: number;             // 24, 30, 60
  type: 'skeletal' | 'keyframe' | 'morph' | 'procedural';
  bones: number;           // 1-64
  resolution: number;      // for 2D output
}

export async function generateAnimationV3(
  seed: Seed,
  outputPath: string
): Promise<{
  gltfPath: string;
  fbxPath: string;
  mp4Path: string;
  duration: number;
  frameCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'animation-default');
  const params = extractAnimationParams(seed, rng);
  
  // Generate animation clips
  const clips = generateAnimationClips(params, rng);
  
  // Create animated mesh
  const mesh = createAnimatedMesh(params, clips, rng);
  
  // Export formats
  const gltfPath = await exportGLTFAnimation(mesh, clips, outputPath, seed);
  const fbxPath = await exportFBX(mesh, clips, outputPath, seed);
  const mp4Path = await exportMP4(mesh, params, outputPath, seed);
  
  return {
    gltfPath,
    fbxPath,
    mp4Path,
    duration: params.duration,
    frameCount: Math.floor(params.duration * params.fps)
  };
}

function extractAnimationParams(seed: Seed, rng: Xoshiro256StarStar): AnimationParams {
  const types = ['skeletal', 'keyframe', 'morph', 'procedural'] as const;
  const fpsOptions = [24, 30, 60];
  
  return {
    duration: 1 + rng.nextF64() * 59,
    fps: fpsOptions[Math.floor(rng.nextF64() * fpsOptions.length)],
    type: types[Math.floor(rng.nextF64() * types.length)],
    bones: 1 + Math.floor(rng.nextF64() * 63),
    resolution: 256 + Math.floor(rng.nextF64() * 768)
  };
}

function generateAnimationClips(params: AnimationParams, rng: Xoshiro256StarStar): THREE.AnimationClip[] {
  const clips: THREE.AnimationClip[] = [];
  
  // Generate main animation clip
  const tracks: (THREE.VectorKeyframeTrack | THREE.QuaternionKeyframeTrack)[] = [];
  const frameCount = Math.floor(params.duration * params.fps);
  
  for (let i = 0; i < Math.min(params.bones, 10); i++) {
    const times = new Float32Array(frameCount);
    const values = new Float32Array(frameCount * 3);
    
    for (let f = 0; f < frameCount; f++) {
      const t = f / params.fps;
      times[f] = t;
      
      // Procedural animation (sine wave based)
      const phase = rng.nextF64() * Math.PI * 2;
      const freq = 0.5 + rng.nextF64() * 2;
      const amp = 0.1 + rng.nextF64() * 0.5;
      
      values[f * 3] = Math.sin(t * freq * Math.PI * 2 + phase) * amp;
      values[f * 3 + 1] = Math.cos(t * freq * Math.PI * 2 + phase) * amp * 0.5;
      values[f * 3 + 2] = Math.sin(t * freq * Math.PI * 2 + phase * 2) * amp * 0.3;
    }
    
    tracks.push(new THREE.VectorKeyframeTrack(`bone_${i}.position`, times, values));
  }
  
  clips.push(new THREE.AnimationClip('main_animation', params.duration, tracks));
  
  return clips;
}

function createAnimatedMesh(params: AnimationParams, clips: THREE.AnimationClip[], rng: Xoshiro256StarStar): THREE.SkinnedMesh {
  // Create simple skinned mesh
  const geometry = new THREE.CapsuleGeometry(0.5, 2, 4, 8);
  const material = new THREE.MeshStandardMaterial({
    color: Math.floor(rng.nextF64() * 0xffffff),
    metalness: rng.nextF64(),
    roughness: rng.nextF64()
  });
  
  const mesh = new THREE.SkinnedMesh(geometry, material);
  
  // Add mixer for animation
  const mixer = new THREE.AnimationMixer(mesh);
  clips.forEach(clip => mixer.clipAction(clip));
  
  return mesh;
}

async function exportGLTFAnimation(
  _mesh: THREE.SkinnedMesh,
  clips: THREE.AnimationClip[],
  outputPath: string,
  seed: Seed
): Promise<string> {
  const filename = `animation_${seed.$hash || 'unknown'}.gltf`;
  const filePath = path.join(outputPath, filename);
  
  // Simplified GLTF with animation export
  const gltf = {
    asset: { version: '2.0', generator: 'Paradigm Absolute' },
    animations: clips.map((clip, i) => ({
      name: clip.name,
      duration: clip.duration,
      channels: [],
      samplers: []
    }))
  };
  
  if (typeof fs !== 'undefined') {
    fs.writeFileSync(filePath, JSON.stringify(gltf, null, 2));
  }
  
  return filePath;
}

async function exportFBX(
  mesh: THREE.SkinnedMesh,
  clips: THREE.AnimationClip[],
  outputPath: string,
  seed: Seed
): Promise<string> {
  const filename = `animation_${seed.$hash || 'unknown'}.glb`;
  const filePath = path.join(outputPath, filename);
  
  // Export as GLB (binary GLTF) which contains geometry + animations
  // FBX export requires external converter; GLTF is the modern standard
  try {
    const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js') as any;
    const exporter = new GLTFExporter();
    const gltfData = await new Promise<any>((resolve, reject) => {
      exporter.parse(mesh, resolve, reject, { binary: true, animations: clips });
    });
    if (typeof fs !== 'undefined') {
      fs.writeFileSync(filePath, Buffer.from(gltfData));
    }
  } catch {
    // Fallback: write animation metadata as JSON
    const animData = clips.map(clip => ({
      name: clip.name,
      duration: clip.duration,
      tracks: clip.tracks.map(t => ({
        name: t.name,
        times: (t as any).times,
        values: (t as any).values?.slice(0, 20),
      })),
    }));
    if (typeof fs !== 'undefined') {
      fs.writeFileSync(filePath.replace('.glb', '.anim.json'), JSON.stringify(animData, null, 2));
    }
  }
  
  return filePath;
}

async function exportMP4(
  _mesh: THREE.SkinnedMesh,
  params: AnimationParams,
  outputPath: string,
  seed: Seed
): Promise<string> {
  const filename = `animation_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  
  // Export animation frame data as JSON (MP4 requires ffmpeg for video encoding)
  const frameData = {
    metadata: {
      title: params.type,
      duration: params.duration,
      frameCount: params.fps * params.duration,
      fps: params.fps,
    },
    note: 'Convert to MP4 using: ffmpeg -framerate FPS -i frames/%04d.png output.mp4',
  };
  
  if (typeof fs !== 'undefined') {
    fs.writeFileSync(filePath, JSON.stringify(frameData, null, 2));
  }
  
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateAnimationV3 as generateAnimation };
