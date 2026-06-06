/**
 * Geometry3D Generator V4 — SDF + Marching Cubes + GLTF 2.0
 *
 * Complete implementation with:
 * - SDF primitives (sphere, box, torus, capsule, cylinder, cone)
 * - SDF operations (union, subtract, intersect, smoothUnion)
 * - Marching cubes mesh extraction
 * - Manifold/watertight validation
 * - Cylindrical UV unwrapping
 * - 4-level LOD chain (100% → 40% → 16% → 4%)
 * - Procedural PBR textures (albedo, normal, roughness, metallic, AO)
 * - Real GLTF 2.0 binary export
 * - Deterministic: same seed = identical mesh
 */

import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { rngFromHash } from '../rng';
import { exportGLTF } from './gltf-exporter';

const TEXTURE_RESOLUTION: Record<string, number> = { low: 512, medium: 1024, high: 2048, photorealistic: 4096 };
const GRID_RESOLUTIONS: Record<string, number> = { low: 32, medium: 64, high: 96, photorealistic: 128 };

// ─── MARCHING CUBES LOOKUP TABLE ──────────────────────────────────────────────
const TRI_TABLE = [
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 8, 3, 9, 8, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 2, 10, 0, 2, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 8, 3, 2, 10, 8, 10, 9, 8, -1, -1, -1, -1, -1, -1, -1],
  [3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 11, 2, 8, 11, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 9, 0, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 11, 2, 1, 9, 11, 9, 8, 11, -1, -1, -1, -1, -1, -1, -1],
  [3, 10, 1, 11, 10, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 10, 1, 0, 8, 10, 8, 11, 10, -1, -1, -1, -1, -1, -1, -1],
  [3, 9, 0, 3, 11, 9, 11, 10, 9, -1, -1, -1, -1, -1, -1, -1],
  [9, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 3, 0, 7, 3, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 1, 9, 4, 7, 1, 7, 3, 1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 4, 7, 3, 0, 4, 1, 2, 10, -1, -1, -1, -1, -1, -1, -1],
  [9, 2, 10, 9, 0, 2, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
  [2, 10, 9, 2, 9, 7, 2, 7, 3, 7, 9, 4, -1, -1, -1, -1],
  [8, 4, 7, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 4, 7, 11, 2, 4, 2, 0, 4, -1, -1, -1, -1, -1, -1, -1],
  [9, 0, 1, 8, 4, 7, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
  [4, 7, 11, 9, 4, 11, 9, 11, 2, 9, 2, 1, -1, -1, -1, -1],
  [3, 10, 1, 3, 11, 10, 7, 8, 4, -1, -1, -1, -1, -1, -1, -1],
  [1, 11, 10, 1, 4, 11, 1, 0, 4, 7, 11, 4, -1, -1, -1, -1],
  [4, 7, 8, 9, 0, 11, 9, 11, 10, 11, 0, 3, -1, -1, -1, -1],
  [4, 7, 11, 4, 11, 9, 9, 11, 10, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 4, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 5, 4, 1, 5, 0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 5, 4, 8, 3, 5, 3, 1, 5, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 8, 1, 2, 10, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
  [5, 2, 10, 5, 4, 2, 4, 0, 2, -1, -1, -1, -1, -1, -1, -1],
  [2, 10, 5, 3, 2, 5, 3, 5, 4, 3, 4, 8, -1, -1, -1, -1],
  [9, 5, 4, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 11, 2, 0, 8, 11, 4, 9, 5, -1, -1, -1, -1, -1, -1, -1],
  [0, 5, 4, 0, 1, 5, 2, 3, 11, -1, -1, -1, -1, -1, -1, -1],
  [2, 1, 5, 2, 5, 8, 2, 8, 11, 4, 8, 5, -1, -1, -1, -1],
  [10, 3, 11, 10, 1, 3, 9, 5, 4, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 5, 0, 8, 1, 8, 10, 1, 8, 11, 10, -1, -1, -1, -1],
  [5, 4, 0, 5, 0, 11, 5, 11, 10, 11, 0, 3, -1, -1, -1, -1],
  [5, 4, 8, 5, 8, 10, 10, 8, 11, -1, -1, -1, -1, -1, -1, -1],
  [9, 7, 8, 5, 7, 9, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 3, 0, 9, 5, 3, 5, 7, 3, -1, -1, -1, -1, -1, -1, -1],
  [0, 7, 8, 0, 1, 7, 1, 5, 7, -1, -1, -1, -1, -1, -1, -1],
  [1, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 7, 8, 9, 5, 7, 10, 1, 2, -1, -1, -1, -1, -1, -1, -1],
  [10, 1, 2, 9, 5, 0, 5, 3, 0, 5, 7, 3, -1, -1, -1, -1],
  [8, 0, 2, 8, 2, 5, 8, 5, 7, 10, 5, 2, -1, -1, -1, -1],
  [2, 10, 5, 2, 5, 3, 3, 5, 7, -1, -1, -1, -1, -1, -1, -1],
  [7, 9, 5, 7, 8, 9, 3, 11, 2, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 7, 9, 7, 2, 9, 2, 0, 2, 7, 11, -1, -1, -1, -1],
  [2, 3, 11, 0, 1, 8, 1, 7, 8, 1, 5, 7, -1, -1, -1, -1],
  [11, 2, 1, 11, 1, 7, 7, 1, 5, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 8, 8, 5, 7, 10, 1, 3, 10, 3, 11, -1, -1, -1, -1],
  [5, 7, 0, 5, 0, 9, 7, 11, 0, 1, 0, 10, 11, 10, 0, -1],
  [11, 10, 0, 11, 0, 3, 10, 5, 0, 8, 0, 7, 5, 7, 0, -1],
  [11, 10, 5, 7, 11, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 0, 1, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 8, 3, 1, 9, 8, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
  [1, 6, 5, 2, 6, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 6, 5, 1, 2, 6, 3, 0, 8, -1, -1, -1, -1, -1, -1, -1],
  [9, 6, 5, 9, 0, 6, 0, 2, 6, -1, -1, -1, -1, -1, -1, -1],
  [5, 9, 8, 5, 8, 2, 5, 2, 6, 3, 2, 8, -1, -1, -1, -1],
  [2, 3, 11, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 0, 8, 11, 2, 0, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1, -1, -1, -1],
  [5, 10, 6, 1, 9, 2, 9, 11, 2, 9, 8, 11, -1, -1, -1, -1],
  [6, 3, 11, 6, 5, 3, 5, 1, 3, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 11, 0, 11, 5, 0, 5, 1, 5, 11, 6, -1, -1, -1, -1],
  [3, 11, 6, 0, 3, 6, 0, 6, 5, 0, 5, 9, -1, -1, -1, -1],
  [6, 5, 9, 6, 9, 11, 11, 9, 8, -1, -1, -1, -1, -1, -1, -1],
  [5, 10, 6, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 3, 0, 4, 7, 3, 6, 5, 10, -1, -1, -1, -1, -1, -1, -1],
  [1, 9, 0, 5, 10, 6, 8, 4, 7, -1, -1, -1, -1, -1, -1, -1],
  [10, 6, 5, 1, 9, 7, 1, 7, 3, 7, 9, 4, -1, -1, -1, -1],
  [6, 1, 2, 6, 5, 1, 4, 7, 8, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 5, 5, 2, 6, 3, 0, 4, 3, 4, 7, -1, -1, -1, -1],
  [8, 4, 7, 9, 0, 5, 0, 6, 5, 0, 2, 6, -1, -1, -1, -1],
  [7, 3, 9, 7, 9, 4, 3, 2, 9, 5, 9, 6, 2, 6, 9, -1],
  [3, 11, 2, 7, 8, 4, 10, 6, 5, -1, -1, -1, -1, -1, -1, -1],
  [5, 10, 6, 4, 7, 2, 4, 2, 0, 2, 7, 11, -1, -1, -1, -1],
  [0, 1, 9, 4, 7, 8, 2, 3, 11, 5, 10, 6, -1, -1, -1, -1],
  [9, 2, 1, 9, 11, 2, 9, 4, 11, 7, 11, 4, 5, 10, 6, -1],
  [8, 4, 7, 3, 11, 5, 3, 5, 1, 5, 11, 6, -1, -1, -1, -1],
  [5, 1, 11, 5, 11, 6, 1, 0, 11, 7, 11, 4, 0, 4, 11, -1],
  [0, 5, 9, 0, 6, 5, 0, 3, 6, 11, 6, 3, 8, 4, 7, -1],
  [6, 5, 9, 6, 9, 11, 4, 7, 9, 7, 11, 9, -1, -1, -1, -1],
  [10, 4, 9, 6, 4, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 10, 6, 4, 9, 10, 0, 8, 3, -1, -1, -1, -1, -1, -1, -1],
  [10, 0, 1, 10, 6, 0, 6, 4, 0, -1, -1, -1, -1, -1, -1, -1],
  [8, 3, 1, 8, 1, 6, 8, 6, 4, 6, 1, 10, -1, -1, -1, -1],
  [1, 4, 9, 1, 2, 4, 2, 6, 4, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 8, 1, 2, 9, 2, 4, 9, 2, 6, 4, -1, -1, -1, -1],
  [0, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 3, 2, 8, 2, 4, 4, 2, 6, -1, -1, -1, -1, -1, -1, -1],
  [10, 4, 9, 10, 6, 4, 11, 2, 3, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 2, 2, 8, 11, 4, 9, 10, 4, 10, 6, -1, -1, -1, -1],
  [3, 11, 2, 0, 1, 6, 0, 6, 4, 6, 1, 10, -1, -1, -1, -1],
  [6, 4, 1, 6, 1, 10, 4, 8, 1, 2, 1, 11, 8, 11, 1, -1],
  [9, 6, 4, 9, 3, 6, 9, 1, 3, 11, 6, 3, -1, -1, -1, -1],
  [8, 11, 1, 8, 1, 0, 11, 6, 1, 9, 1, 4, 6, 4, 1, -1],
  [3, 11, 6, 3, 6, 0, 0, 6, 4, -1, -1, -1, -1, -1, -1, -1],
  [6, 4, 8, 11, 6, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 10, 6, 7, 8, 10, 8, 9, 10, -1, -1, -1, -1, -1, -1, -1],
  [0, 7, 3, 0, 10, 7, 0, 9, 10, 6, 7, 10, -1, -1, -1, -1],
  [10, 6, 7, 1, 10, 7, 1, 7, 8, 1, 8, 0, -1, -1, -1, -1],
  [10, 6, 7, 10, 7, 1, 1, 7, 3, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 6, 1, 6, 8, 1, 8, 9, 8, 6, 7, -1, -1, -1, -1],
  [2, 6, 9, 2, 9, 1, 6, 7, 9, 0, 9, 3, 7, 3, 9, -1],
  [7, 8, 0, 7, 0, 6, 6, 0, 2, -1, -1, -1, -1, -1, -1, -1],
  [7, 3, 2, 6, 7, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 3, 11, 10, 6, 8, 10, 8, 9, 8, 6, 7, -1, -1, -1, -1],
  [2, 0, 7, 2, 7, 11, 0, 9, 7, 6, 7, 10, 9, 10, 7, -1],
  [1, 8, 0, 1, 7, 8, 1, 10, 7, 6, 7, 10, 2, 3, 11, -1],
  [11, 2, 1, 11, 1, 7, 10, 6, 1, 6, 7, 1, -1, -1, -1, -1],
  [8, 9, 6, 8, 6, 7, 9, 1, 6, 11, 6, 3, 1, 3, 6, -1],
  [0, 9, 1, 11, 6, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 8, 0, 7, 0, 6, 3, 11, 0, 11, 6, 0, -1, -1, -1, -1],
  [7, 11, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 8, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 9, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 1, 9, 8, 3, 1, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
  [10, 1, 2, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 3, 0, 8, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
  [2, 9, 0, 2, 10, 9, 6, 11, 7, -1, -1, -1, -1, -1, -1, -1],
  [6, 11, 7, 2, 10, 3, 10, 8, 3, 10, 9, 8, -1, -1, -1, -1],
  [7, 2, 3, 6, 2, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [7, 0, 8, 7, 6, 0, 6, 2, 0, -1, -1, -1, -1, -1, -1, -1],
  [2, 7, 6, 2, 3, 7, 0, 1, 9, -1, -1, -1, -1, -1, -1, -1],
  [1, 6, 2, 1, 8, 6, 1, 9, 8, 8, 7, 6, -1, -1, -1, -1],
  [10, 7, 6, 10, 1, 7, 1, 3, 7, -1, -1, -1, -1, -1, -1, -1],
  [10, 7, 6, 1, 7, 10, 1, 8, 7, 1, 0, 8, -1, -1, -1, -1],
  [0, 3, 7, 0, 7, 10, 0, 10, 9, 6, 10, 7, -1, -1, -1, -1],
  [7, 6, 10, 7, 10, 8, 8, 10, 9, -1, -1, -1, -1, -1, -1, -1],
  [6, 8, 4, 11, 8, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 6, 11, 3, 0, 6, 0, 4, 6, -1, -1, -1, -1, -1, -1, -1],
  [8, 6, 11, 8, 4, 6, 9, 0, 1, -1, -1, -1, -1, -1, -1, -1],
  [9, 4, 6, 9, 6, 3, 9, 3, 1, 11, 3, 6, -1, -1, -1, -1],
  [6, 8, 4, 6, 11, 8, 2, 10, 1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 3, 0, 11, 0, 6, 11, 0, 4, 6, -1, -1, -1, -1],
  [4, 11, 8, 4, 6, 11, 0, 2, 9, 2, 10, 9, -1, -1, -1, -1],
  [10, 9, 3, 10, 3, 2, 9, 4, 3, 11, 3, 6, 4, 6, 3, -1],
  [8, 2, 3, 8, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1],
  [0, 4, 2, 4, 6, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 9, 0, 2, 3, 4, 2, 4, 6, 4, 3, 8, -1, -1, -1, -1],
  [1, 9, 4, 1, 4, 2, 2, 4, 6, -1, -1, -1, -1, -1, -1, -1],
  [8, 1, 3, 8, 6, 1, 8, 4, 6, 6, 10, 1, -1, -1, -1, -1],
  [10, 1, 0, 10, 0, 6, 6, 0, 4, -1, -1, -1, -1, -1, -1, -1],
  [4, 6, 3, 4, 3, 8, 6, 10, 3, 0, 3, 9, 10, 9, 3, -1],
  [10, 9, 4, 6, 10, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 5, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 4, 9, 5, 11, 7, 6, -1, -1, -1, -1, -1, -1, -1],
  [5, 0, 1, 5, 4, 0, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
  [11, 7, 6, 8, 3, 4, 3, 5, 4, 3, 1, 5, -1, -1, -1, -1],
  [9, 5, 4, 10, 1, 2, 7, 6, 11, -1, -1, -1, -1, -1, -1, -1],
  [6, 11, 7, 1, 2, 10, 0, 8, 3, 4, 9, 5, -1, -1, -1, -1],
  [7, 6, 11, 5, 4, 10, 4, 2, 10, 4, 0, 2, -1, -1, -1, -1],
  [3, 4, 8, 3, 5, 4, 3, 2, 5, 10, 5, 2, 11, 7, 6, -1],
  [7, 2, 3, 7, 6, 2, 5, 4, 9, -1, -1, -1, -1, -1, -1, -1],
  [9, 5, 4, 0, 8, 6, 0, 6, 2, 6, 8, 7, -1, -1, -1, -1],
  [3, 6, 2, 3, 7, 6, 1, 5, 0, 5, 4, 0, -1, -1, -1, -1],
  [6, 2, 8, 6, 8, 7, 2, 1, 8, 4, 8, 5, 1, 5, 8, -1],
  [9, 5, 4, 10, 1, 6, 1, 7, 6, 1, 3, 7, -1, -1, -1, -1],
  [1, 6, 10, 1, 7, 6, 1, 0, 7, 8, 7, 0, 9, 5, 4, -1],
  [4, 0, 10, 4, 10, 5, 0, 3, 10, 6, 10, 7, 3, 7, 10, -1],
  [7, 6, 10, 7, 10, 8, 5, 4, 10, 4, 8, 10, -1, -1, -1, -1],
  [6, 9, 5, 6, 11, 9, 11, 8, 9, -1, -1, -1, -1, -1, -1, -1],
  [3, 6, 11, 0, 6, 3, 0, 5, 6, 0, 9, 5, -1, -1, -1, -1],
  [0, 11, 8, 0, 5, 11, 0, 1, 5, 5, 6, 11, -1, -1, -1, -1],
  [6, 11, 3, 6, 3, 5, 5, 3, 1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 10, 9, 5, 11, 9, 11, 8, 11, 5, 6, -1, -1, -1, -1],
  [0, 11, 3, 0, 6, 11, 0, 9, 6, 5, 6, 9, 1, 2, 10, -1],
  [11, 8, 5, 11, 5, 6, 8, 0, 5, 10, 5, 2, 0, 2, 5, -1],
  [6, 11, 3, 6, 3, 5, 2, 10, 3, 10, 5, 3, -1, -1, -1, -1],
  [5, 8, 9, 5, 2, 8, 5, 6, 2, 3, 8, 2, -1, -1, -1, -1],
  [9, 5, 6, 9, 6, 0, 0, 6, 2, -1, -1, -1, -1, -1, -1, -1],
  [1, 5, 8, 1, 8, 0, 5, 6, 8, 3, 8, 2, 6, 2, 8, -1],
  [1, 5, 6, 2, 1, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 3, 6, 1, 6, 10, 3, 8, 6, 5, 6, 9, 8, 9, 6, -1],
  [10, 1, 0, 10, 0, 6, 9, 5, 0, 5, 6, 0, -1, -1, -1, -1],
  [0, 3, 8, 5, 6, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [10, 5, 6, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 5, 10, 7, 5, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [11, 5, 10, 11, 7, 5, 8, 3, 0, -1, -1, -1, -1, -1, -1, -1],
  [5, 11, 7, 5, 10, 11, 1, 9, 0, -1, -1, -1, -1, -1, -1, -1],
  [10, 7, 5, 10, 11, 7, 9, 8, 1, 8, 3, 1, -1, -1, -1, -1],
  [11, 1, 2, 11, 7, 1, 7, 5, 1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 1, 2, 7, 1, 7, 5, 7, 2, 11, -1, -1, -1, -1],
  [9, 7, 5, 9, 2, 7, 9, 0, 2, 2, 11, 7, -1, -1, -1, -1],
  [7, 5, 2, 7, 2, 11, 5, 9, 2, 3, 2, 8, 9, 8, 2, -1],
  [2, 5, 10, 2, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1],
  [8, 2, 0, 8, 5, 2, 8, 7, 5, 10, 2, 5, -1, -1, -1, -1],
  [9, 0, 1, 5, 10, 3, 5, 3, 7, 3, 10, 2, -1, -1, -1, -1],
  [9, 8, 2, 9, 2, 1, 8, 7, 2, 10, 2, 5, 7, 5, 2, -1],
  [1, 3, 5, 3, 7, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 7, 0, 7, 1, 1, 7, 5, -1, -1, -1, -1, -1, -1, -1],
  [9, 0, 3, 9, 3, 5, 5, 3, 7, -1, -1, -1, -1, -1, -1, -1],
  [9, 8, 7, 5, 9, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [5, 8, 4, 5, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1],
  [5, 0, 4, 5, 11, 0, 5, 10, 11, 11, 3, 0, -1, -1, -1, -1],
  [0, 1, 9, 8, 4, 10, 8, 10, 11, 10, 4, 5, -1, -1, -1, -1],
  [10, 11, 4, 10, 4, 5, 11, 3, 4, 9, 4, 1, 3, 1, 4, -1],
  [2, 5, 1, 2, 8, 5, 2, 11, 8, 4, 5, 8, -1, -1, -1, -1],
  [0, 4, 11, 0, 11, 3, 4, 5, 11, 2, 11, 1, 5, 1, 11, -1],
  [0, 2, 5, 0, 5, 9, 2, 11, 5, 4, 5, 8, 11, 8, 5, -1],
  [9, 4, 5, 2, 11, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 5, 10, 3, 5, 2, 3, 4, 5, 3, 8, 4, -1, -1, -1, -1],
  [5, 10, 2, 5, 2, 4, 4, 2, 0, -1, -1, -1, -1, -1, -1, -1],
  [3, 10, 2, 3, 5, 10, 3, 8, 5, 4, 5, 8, 0, 1, 9, -1],
  [5, 10, 2, 5, 2, 4, 1, 9, 2, 9, 4, 2, -1, -1, -1, -1],
  [8, 4, 5, 8, 5, 3, 3, 5, 1, -1, -1, -1, -1, -1, -1, -1],
  [0, 4, 5, 1, 0, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [8, 4, 5, 8, 5, 3, 9, 0, 5, 0, 3, 5, -1, -1, -1, -1],
  [9, 4, 5, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 11, 7, 4, 9, 11, 9, 10, 11, -1, -1, -1, -1, -1, -1, -1],
  [0, 8, 3, 4, 9, 7, 9, 11, 7, 9, 10, 11, -1, -1, -1, -1],
  [1, 10, 11, 1, 11, 4, 1, 4, 0, 7, 4, 11, -1, -1, -1, -1],
  [3, 1, 4, 3, 4, 8, 1, 10, 4, 7, 4, 11, 10, 11, 4, -1],
  [4, 11, 7, 9, 11, 4, 9, 2, 11, 9, 1, 2, -1, -1, -1, -1],
  [9, 7, 4, 9, 11, 7, 9, 1, 11, 2, 11, 1, 0, 8, 3, -1],
  [11, 7, 4, 11, 4, 2, 2, 4, 0, -1, -1, -1, -1, -1, -1, -1],
  [11, 7, 4, 11, 4, 2, 8, 3, 4, 3, 2, 4, -1, -1, -1, -1],
  [2, 9, 10, 2, 7, 9, 2, 3, 7, 7, 4, 9, -1, -1, -1, -1],
  [9, 10, 7, 9, 7, 4, 10, 2, 7, 8, 7, 0, 2, 0, 7, -1],
  [3, 7, 10, 3, 10, 2, 7, 4, 10, 1, 10, 0, 4, 0, 10, -1],
  [1, 10, 2, 8, 7, 4, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 1, 4, 1, 7, 7, 1, 3, -1, -1, -1, -1, -1, -1, -1],
  [4, 9, 1, 4, 1, 7, 0, 8, 1, 8, 7, 1, -1, -1, -1, -1],
  [4, 0, 3, 7, 4, 3, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [4, 8, 7, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [9, 10, 8, 10, 11, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 9, 3, 9, 11, 11, 9, 10, -1, -1, -1, -1, -1, -1, -1],
  [0, 1, 10, 0, 10, 8, 8, 10, 11, -1, -1, -1, -1, -1, -1, -1],
  [3, 1, 10, 11, 3, 10, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 2, 11, 1, 11, 9, 9, 11, 8, -1, -1, -1, -1, -1, -1, -1],
  [3, 0, 9, 3, 9, 11, 1, 2, 9, 2, 11, 9, -1, -1, -1, -1],
  [0, 2, 11, 8, 0, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [3, 2, 11, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 3, 8, 2, 8, 10, 10, 8, 9, -1, -1, -1, -1, -1, -1, -1],
  [9, 10, 2, 0, 9, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [2, 3, 8, 2, 8, 10, 0, 1, 8, 1, 10, 8, -1, -1, -1, -1],
  [1, 10, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [1, 3, 8, 9, 1, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 9, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [0, 3, 8, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
  [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
];

const EDGE_PAIRS = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

// ─── SDF PRIMITIVES ──────────────────────────────────────────────────────────
function sdSphere(p: number[], r: number): number {
  return Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]) - r;
}

function sdBox(p: number[], b: number[]): number {
  const q = [Math.abs(p[0]) - b[0], Math.abs(p[1]) - b[1], Math.abs(p[2]) - b[2]];
  return Math.min(Math.max(q[0], Math.max(q[1], q[2])), 0) +
    Math.sqrt(Math.max(q[0], 0) ** 2 + Math.max(q[1], 0) ** 2 + Math.max(q[2], 0) ** 2);
}

function sdTorus(p: number[], t: number[]): number {
  const q = [Math.sqrt(p[0] * p[0] + p[2] * p[2]) - t[0], p[1]];
  return Math.sqrt(q[0] * q[0] + q[1] * q[1]) - t[1];
}

function sdCapsule(p: number[], a: number[], b: number[], r: number): number {
  const pa = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const ba = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const h = Math.max(0, Math.min(1, (pa[0] * ba[0] + pa[1] * ba[1] + pa[2] * ba[2]) / (ba[0] * ba[0] + ba[1] * ba[1] + ba[2] * ba[2])));
  const diff = [pa[0] - ba[0] * h, pa[1] - ba[1] * h, pa[2] - ba[2] * h];
  return Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1] + diff[2] * diff[2]) - r;
}

function sdCylinder(p: number[], h: number[], r: number): number {
  const d = [Math.abs(p[0]) - h[0], Math.abs(p[1]) - h[1]];
  return Math.min(Math.max(d[0], d[1]), 0) + Math.sqrt(Math.max(d[0], 0) ** 2 + Math.max(d[1], 0) ** 2) - r;
}

function sdCone(p: number[], c: number[]): number {
  const q = [Math.sqrt(p[0] * p[0] + p[2] * p[2]), p[1]];
  const d1 = -q[1] - c[0];
  const d2 = Math.max(q[0] * c[1] + q[1] * c[0], -c[1]);
  return Math.sign(Math.max(d1, d2)) * Math.sqrt(Math.min(d1 ** 2, d2 ** 2));
}

// ─── SDF OPERATIONS ──────────────────────────────────────────────────────────
function sOpUnion(d1: number, d2: number): number { return Math.min(d1, d2); }
function sOpSubtract(d1: number, d2: number): number { return Math.max(d1, -d2); }
function _sOpIntersect(d1: number, d2: number): number { return Math.max(d1, d2); }
function sOpSmoothUnion(d1: number, d2: number, k: number): number {
  const h = Math.max(0, Math.min(1, (d2 - d1 + k) / (2 * k)));
  return d2 + (d1 - d2) * h - k * h * (1 - h);
}

// ─── SDF SCENE BUILDER ───────────────────────────────────────────────────────
interface SDFScene {
  eval(p: number[]): number;
}

function buildSDFScene(primitive: string, params: number[], rng: { nextF64: () => number }): SDFScene {

  switch (primitive) {
    case 'sphere':
      return { eval: (p) => sdSphere(p, params[0] || 1) };
    case 'box':
      return { eval: (p) => sdBox(p, [params[0] || 1, params[1] || 1, params[2] || 1]) };
    case 'torus':
      return { eval: (p) => sdTorus(p, [params[0] || 1, params[1] || 0.4]) };
    case 'capsule':
      return { eval: (p) => sdCapsule(p, [0, -(params[1] || 1), 0], [0, params[1] || 1, 0], params[0] || 0.3) };
    case 'cylinder':
      return { eval: (p) => sdCylinder(p, [params[0] || 1, params[1] || 1], params[2] || 0.5) };
    case 'cone':
      return { eval: (p) => sdCone(p, [params[0] || 1, params[1] || 0.5]) };
    case 'compound': {
      const primitives = ['sphere', 'box', 'torus', 'capsule'];
      const ops = ['union', 'smoothUnion', 'subtract'];
      const count = 2 + Math.floor(rng.nextF64() * 3);
      const scenePrims: { type: string; params: number[]; pos: number[] }[] = [];
      const sceneOps: string[] = [];

      for (let i = 0; i < count; i++) {
        scenePrims.push({
          type: primitives[Math.floor(rng.nextF64() * primitives.length)],
          params: [0.3 + rng.nextF64() * 0.7, 0.3 + rng.nextF64() * 0.7, 0.3 + rng.nextF64() * 0.7],
          pos: [(rng.nextF64() - 0.5) * 1.5, (rng.nextF64() - 0.5) * 1.5, (rng.nextF64() - 0.5) * 1.5],
        });
        if (i > 0) sceneOps.push(ops[Math.floor(rng.nextF64() * ops.length)]);
      }

      return {
        eval: (p: number[]): number => {
          let d = evalPrim(scenePrims[0], p);
          for (let i = 1; i < scenePrims.length; i++) {
            const d2 = evalPrim(scenePrims[i], p);
            switch (sceneOps[i - 1]) {
              case 'union': d = sOpUnion(d, d2); break;
              case 'smoothUnion': d = sOpSmoothUnion(d, d2, 0.15); break;
              case 'subtract': d = sOpSubtract(d, d2); break;
              default: d = sOpUnion(d, d2);
            }
          }
          return d;
        },
      };
    }
    default:
      return { eval: (p) => sdSphere(p, 1) };
  }
}

function evalPrim(prim: { type: string; params: number[]; pos: number[] }, p: number[]): number {
  const lp = [p[0] - prim.pos[0], p[1] - prim.pos[1], p[2] - prim.pos[2]];
  switch (prim.type) {
    case 'sphere': return sdSphere(lp, prim.params[0]);
    case 'box': return sdBox(lp, [prim.params[0], prim.params[1], prim.params[2]]);
    case 'torus': return sdTorus(lp, [prim.params[0], prim.params[1]]);
    case 'capsule': return sdCapsule(lp, [0, -prim.params[1], 0], [0, prim.params[1], 0], prim.params[0]);
    default: return sdSphere(lp, 1);
  }
}

// ─── MARCHING CUBES ──────────────────────────────────────────────────────────
function interpolateEdge(scene: SDFScene, p0: number[], p1: number[], v0: number, v1: number): number[] {
  const t = Math.max(0.001, Math.min(0.999, v0 / (v0 - v1)));
  return [
    p0[0] + t * (p1[0] - p0[0]),
    p0[1] + t * (p1[1] - p0[1]),
    p0[2] + t * (p1[2] - p0[2]),
  ];
}

function computeNormal(scene: SDFScene, p: number[], eps: number): number[] {
  const e = eps || 0.01;
  const dx = scene.eval([p[0] + e, p[1], p[2]]) - scene.eval([p[0] - e, p[1], p[2]]);
  const dy = scene.eval([p[0], p[1] + e, p[2]]) - scene.eval([p[0], p[1] - e, p[2]]);
  const dz = scene.eval([p[0], p[1], p[2] + e]) - scene.eval([p[0], p[1], p[2] - e]);
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  return [dx / len, dy / len, dz / len];
}

function runMarchingCubes(scene: SDFScene, gridSize: number, bounds: number): { vertices: number[][]; normals: number[][]; indices: number[] } {
  const step = (2 * bounds) / gridSize;
  const values = new Float64Array((gridSize + 1) ** 3);
  const points: number[][][][] = [];

  for (let x = 0; x <= gridSize; x++) {
    points[x] = [];
    for (let y = 0; y <= gridSize; y++) {
      points[x][y] = [];
      for (let z = 0; z <= gridSize; z++) {
        const px = -bounds + x * step;
        const py = -bounds + y * step;
        const pz = -bounds + z * step;
        points[x][y][z] = [px, py, pz];
        values[x * (gridSize + 1) ** 2 + y * (gridSize + 1) + z] = scene.eval([px, py, pz]);
      }
    }
  }

  const vertices: number[][] = [];
  const normals: number[][] = [];
  const indices: number[] = [];
  const edgeCache = new Map<string, number>();

  function getEdgeIndex(x: number, y: number, z: number, edge: number): number {
    const key = `${x},${y},${z},${edge}`;
    if (edgeCache.has(key)) return edgeCache.get(key)!;
    const idx = vertices.length;
    edgeCache.set(key, idx);

    const [a, b] = EDGE_PAIRS[edge];
    const p0 = points[x + (a & 1)][y + ((a >> 1) & 1)][z + ((a >> 2) & 1)];
    const p1 = points[x + (b & 1)][y + ((b >> 1) & 1)][z + ((b >> 2) & 1)];
    const v0 = values[x * (gridSize + 1) ** 2 + y * (gridSize + 1) + z + a];
    const v1 = values[x * (gridSize + 1) ** 2 + y * (gridSize + 1) + z + b];
    const v = interpolateEdge(scene, p0, p1, v0, v1);
    vertices.push(v);
    normals.push(computeNormal(scene, v, step * 0.1));
    return idx;
  }

  for (let x = 0; x < gridSize; x++) {
    for (let y = 0; y < gridSize; y++) {
      for (let z = 0; z < gridSize; z++) {
        let cubeIndex = 0;
        for (let i = 0; i < 8; i++) {
          const vi = values[x + (i & 1) * (gridSize + 1) ** 2 + y + ((i >> 1) & 1) * (gridSize + 1) + z + ((i >> 2) & 1)];
          if (vi < 0) cubeIndex |= (1 << i);
        }

        if (cubeIndex === 0 || cubeIndex === 255) continue;

        const edgeIndices = new Array(12).fill(-1);
        for (let e = 0; e < 12; e++) {
          const [a, b] = EDGE_PAIRS[e];
          const ax = x + (a & 1), ay = y + ((a >> 1) & 1), az = z + ((a >> 2) & 1);
          const bx = x + (b & 1), by = y + ((b >> 1) & 1), bz = z + ((b >> 2) & 1);
          const va = values[ax * (gridSize + 1) ** 2 + ay * (gridSize + 1) + az];
          const vb = values[bx * (gridSize + 1) ** 2 + by * (gridSize + 1) + bz];
          if ((va < 0) !== (vb < 0)) {
            edgeIndices[e] = getEdgeIndex(x, y, z, e);
          }
        }

        const triRow = TRI_TABLE[cubeIndex];
        for (let t = 0; t < 16; t += 3) {
          if (triRow[t] < 0) break;
          indices.push(edgeIndices[triRow[t]], edgeIndices[triRow[t + 1]], edgeIndices[triRow[t + 2]]);
        }
      }
    }
  }

  return { vertices, normals, indices };
}

// ─── LOD GENERATION ──────────────────────────────────────────────────────────
function generateLODLevels(scene: SDFScene, baseGrid: number, bounds: number): { vertices: number[][]; normals: number[][]; indices: number[] }[] {
  const levels = [1.0, 0.63, 0.4, 0.2];
  const lods: { vertices: number[][]; normals: number[][]; indices: number[] }[] = [];

  for (const factor of levels) {
    const grid = Math.max(16, Math.floor(baseGrid * factor));
    lods.push(runMarchingCubes(scene, grid, bounds));
  }

  return lods;
}

// ─── UV UNWRAPPING ───────────────────────────────────────────────────────────
function unwrapUVs(vertices: number[][], _normals: number[][]): number[][] {
  const uvs: number[][] = [];
  for (let i = 0; i < vertices.length; i++) {
    const [x, y, z] = vertices[i];
    const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
    const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, y))) / Math.PI;
    uvs.push([u, v]);
  }
  return uvs;
}

// ─── MANIFOLD VALIDATION ─────────────────────────────────────────────────────
function validateManifold(_vertices: number[][], indices: number[]): { manifold: boolean; issues: string[] } {
  const issues: string[] = [];
  const edgeCount = new Map<string, number>();

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    const edges = [[Math.min(a, b), Math.max(a, b)], [Math.min(b, c), Math.max(b, c)], [Math.min(a, c), Math.max(a, c)]];
    for (const [e0, e1] of edges) {
      const key = `${e0},${e1}`;
      edgeCount.set(key, (edgeCount.get(key) || 0) + 1);
    }
  }

  let nonManifoldEdges = 0;
  for (const [, count] of edgeCount) {
    if (count !== 2) nonManifoldEdges++;
  }

  if (nonManifoldEdges > 0) {
    issues.push(`${nonManifoldEdges} non-manifold edges detected`);
  }

  return { manifold: nonManifoldEdges === 0, issues };
}

// ─── PROCEDURAL TEXTURES ─────────────────────────────────────────────────────
function createProceduralTexture(width: number, height: number, pixelFn: (x: number, y: number) => [number, number, number, number]): THREE.DataTexture {
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y);
      const i = (y * width + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
    }
  }
  const tex = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

function noise2D(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function fbm(x: number, y: number, octaves: number): number {
  let value = 0, amplitude = 0.5, frequency = 1;
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * frequency, y * frequency);
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value;
}

// ─── MAIN GENERATOR ──────────────────────────────────────────────────────────
export interface Geometry3DV4Result {
  filePath: string;
  lodPaths: string[];
  vertices: number;
  faces: number;
  lodVertices: number[];
  lodFaces: number[];
  manifold: boolean;
  textureRes: number;
  gridResolution: number;
  gsplSchema?: string;
}

export async function generateGeometry3DV4(seed: Seed, outputPath: string): Promise<Geometry3DV4Result> {
  const rng = rngFromHash(seed.$hash || 'geometry3d-v4-default');
  const quality = ((seed.genes?.quality?.value as string) || 'high') as string;
  const textureRes = TEXTURE_RESOLUTION[quality] || 1024;
  const gridRes = GRID_RESOLUTIONS[quality] || 64;

  // === GSPL Canon Integration (geometry3d schema) ===
  let gsplSchemaLoaded: string | undefined;
  let geometryConstraints: any = null;
  try {
    const schemaContent = await import(/* @vite-ignore */ "fs/promises").then(fs => 
      fs.readFile('data/commons/libraries/geometry3d.gspl', 'utf8').catch(() => null));
    if (schemaContent) {
      gsplSchemaLoaded = 'geometry3d.gspl';
      geometryConstraints = parseGeometrySchemaConstraints(schemaContent);
    }
  } catch (_) { /* swallow: schema is optional, fall through to default */ }

  // NOTE (verify-sweep): Textured GLTF + LOD exports may require golden updates for new PBR outputs.

  const primitives = ['sphere', 'box', 'torus', 'capsule', 'cylinder', 'cone', 'compound'];
  const materials = ['metal', 'plastic', 'wood', 'stone', 'glass'];

  // Apply schema constraints if loaded (deeper GSPL usage)
  const c = geometryConstraints || {};
  const applyCategorical = (name: string, fallbackList: string[]) => {
    const opts = c.categoricals?.[name];
    const val = seed.genes?.[name]?.value as string;
    if (opts && val && opts.includes(val)) return val;
    if (opts) return opts[Math.floor(rng.nextF64() * opts.length)];
    return seed.genes?.[name]?.value || fallbackList[Math.floor(rng.nextF64() * fallbackList.length)];
  };

  const primitive = applyCategorical('primitive', primitives);
  const material = applyCategorical('material', materials);
  let scale = (Array.isArray(seed.genes?.scale?.value) ? seed.genes?.scale?.value : [1, 1, 1]) as number[];
  if (c.scalars?.scale) {
    const r = c.scalars.scale;
    scale = scale.map(s => Math.max(r.min, Math.min(r.max, s)));
  }
  const params = (Array.isArray(seed.genes?.params?.value)
    ? seed.genes?.params?.value
    : [0.5 + rng.nextF64(), 0.5 + rng.nextF64(), 0.5 + rng.nextF64()]) as number[];

  const bounds = Math.max(scale[0], scale[1], scale[2]) * 1.5;
  const scene = buildSDFScene(primitive, params, rng);

  const lods = generateLODLevels(scene, gridRes, bounds);
  const baseMesh = lods[0];
  const uvs = unwrapUVs(baseMesh.vertices, baseMesh.normals);

  const { manifold } = validateManifold(baseMesh.vertices, baseMesh.indices);

  const baseColor = [
    Math.floor(80 + rng.nextF64() * 175),
    Math.floor(60 + rng.nextF64() * 150),
    Math.floor(40 + rng.nextF64() * 130),
  ];

  const metalness = material === 'metal' ? 0.9 : material === 'plastic' ? 0.1 : material === 'glass' ? 0.3 : 0.05;
  const roughness = material === 'metal' ? 0.2 : material === 'plastic' ? 0.5 : material === 'glass' ? 0.05 : 0.8;

  const albedoTex = createProceduralTexture(textureRes, textureRes, (x, y) => {
    const n = fbm(x * 0.01, y * 0.01, 4) * 30;
    return [
      Math.min(255, Math.max(0, baseColor[0] + n)),
      Math.min(255, Math.max(0, baseColor[1] + n)),
      Math.min(255, Math.max(0, baseColor[2] + n)),
      255,
    ];
  });

  const normalTex = createProceduralTexture(textureRes, textureRes, (x, y) => {
    const nx = 128 + fbm(x * 0.03, y * 0.03, 3) * 40;
    const ny = 128 + fbm(x * 0.03 + 100, y * 0.03, 3) * 40;
    return [nx, ny, 200, 255];
  });

  const roughnessTex = createProceduralTexture(textureRes, textureRes, (x, y) => {
    const v = Math.floor(roughness * 255 + fbm(x * 0.02, y * 0.02, 2) * 30);
    return [v, v, v, 255];
  });

  const metallicTex = createProceduralTexture(textureRes, textureRes, (_x, _y) => {
    const v = Math.floor(metalness * 255);
    return [v, v, v, 255];
  });

  const aoTex = createProceduralTexture(textureRes, textureRes, (x, y) => {
    const v = 180 + fbm(x * 0.005, y * 0.005, 2) * 50;
    return [v, v, v, 255];
  });

  const geometry = new THREE.BufferGeometry();
  const posArray = new Float32Array(baseMesh.vertices.flat());
  const normArray = new Float32Array(baseMesh.normals.flat());
  const idxArray = new Uint32Array(baseMesh.indices);
  const uvArray = new Float32Array(uvs.flat());

  geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normArray, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
  geometry.setIndex(new THREE.BufferAttribute(idxArray, 1));

  const material3D = new THREE.MeshStandardMaterial({
    map: albedoTex,
    normalMap: normalTex,
    roughnessMap: roughnessTex,
    metalnessMap: metallicTex,
    aoMap: aoTex,
    roughness,
    metalness,
  });

  const mesh = new THREE.Mesh(geometry, material3D);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const scene3D = new THREE.Scene();
  scene3D.add(mesh);
  scene3D.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dl = new THREE.DirectionalLight(0xffffff, 0.8);
  dl.position.set(5, 10, 7);
  scene3D.add(dl);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const gltfBuffer = await exportGLTF(scene3D, { binary: true, embedImages: true, trs: false });
  const gltfPath = outputPath.replace(/\.[^/.]+$/, '.gltf');
  fs.writeFileSync(gltfPath, gltfBuffer);

  const lodPaths: string[] = [];
  const lodVertices: number[] = [];
  const lodFaces: number[] = [];

  for (let i = 1; i < lods.length; i++) {
    const lodGeo = new THREE.BufferGeometry();
    lodGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lods[i].vertices.flat()), 3));
    lodGeo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(lods[i].normals.flat()), 3));
    lodGeo.setIndex(new THREE.BufferAttribute(new Uint32Array(lods[i].indices), 1));

    const lodMesh = new THREE.Mesh(lodGeo, material3D);
    const lodScene = new THREE.Scene();
    lodScene.add(lodMesh);

    const lodBuffer = await exportGLTF(lodScene, { binary: true, embedImages: true, trs: false });
    const lodPath = outputPath.replace(/\.[^/.]+$/, `_lod${i}.gltf`);
    fs.writeFileSync(lodPath, lodBuffer);
    lodPaths.push(lodPath);
    lodVertices.push(lods[i].vertices.length);
    lodFaces.push(lods[i].indices.length / 3);
  }

  return {
    filePath: gltfPath,
    lodPaths,
    vertices: baseMesh.vertices.length,
    faces: baseMesh.indices.length / 3,
    lodVertices: [baseMesh.vertices.length, ...lodVertices],
    lodFaces: [baseMesh.indices.length / 3, ...lodFaces],
    manifold,
    textureRes,
    gridResolution: gridRes,
    gsplSchema: gsplSchemaLoaded,
  };
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateGeometry3DV4 as generateGeometry3D };

/**
 * Lightweight parser for the geometry3d.gspl schema constraints.
 * Extracts categorical options and scalar ranges so the generator can enforce them.
 * This propagates the deeper GSPL usage pattern.
 */
function parseGeometrySchemaConstraints(schema: string): any {
  const constraints: any = { scalars: {}, categoricals: {} };

  const geneMatches = schema.matchAll(/gene\s+(\w+):\s*(scalar|categorical)\s*(?:in\s*(\[[^\]]+\]))?/g);

  for (const match of geneMatches) {
    const name = match[1];
    const type = match[2];
    const rangeStr = match[3];

    if (type === 'scalar' && rangeStr) {
      const nums = rangeStr.match(/[\d.]+/g);
      if (nums && nums.length >= 2) {
        constraints.scalars[name] = { min: parseFloat(nums[0]), max: parseFloat(nums[1]) };
      }
    } else if (type === 'categorical' && rangeStr) {
      const items = rangeStr.match(/"([^"]+)"|'([^']+)'/g);
      if (items) {
        constraints.categoricals[name] = items.map(s => s.replace(/['"]/g, ''));
      }
    }
  }

  return constraints;
}
