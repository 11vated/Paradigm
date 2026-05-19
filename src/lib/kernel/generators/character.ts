/**
 * Character Generator — produces rigged 3D character models
 * Creates humanoid base mesh with gene-driven appearance
 * NOW WITH: Parametric body modeling, muscle simulation, quality tiers
 */

import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { exportGLTF, createPBRMaterial } from './gltf-exporter';
import { generateCharacterV2 } from './character-v2';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

// Configuration
const QUALITY_TIERS = ['low', 'medium', 'high', 'photorealistic'] as const;
export type QualityTier = typeof QUALITY_TIERS[number];

interface CharacterParams {
  size: number;
  archetype: string;
  strength: number;
  agility: number;
  palette: number[];
  personality: string;
  quality: QualityTier;
}

export async function generateCharacter(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; faces: number }> {
  // ─── Standardized Boilerplate ───────────────────────────────────────
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // ─── Existing Generation Logic ───────────────────────────────────────
  // Use the world-class V2 generator
  const result = await generateCharacterV2(seed, outputPath);

  // ─── Standardized JSON Config Output ───────────────────────────────
  const jsonPath = outputPath.replace(/\.[^.]+$/, '.json');
  const config = {
    // Include the parameters and other metadata
    ...params,
    gltfFile: outputPath,
    vertices: result.vertices,
    faces: result.faces
  };
  const dir = path.dirname(jsonPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  // ─── Return Existing Result ───────────────────────────────────────
  return {
    filePath: result.filePath,
    vertices: result.vertices,
    faces: result.faces
  };
}

// Helper function to extract parameters from seed genes - CUSTOMIZE PER DOMAIN
function extractParams(seed: Seed, rng: Xoshiro256StarStar): CharacterParams {
  // Extract and validate parameters from seed genes
  // Provide sensible defaults and fallback to RNG-based values when needed
  
  const quality = (seed.genes?.quality?.value as QualityTier) || 
                  QUALITY_TIERS[rng.nextInt(0, QUALITY_TIERS.length)];
                  
  // Parameter extraction for character domain:
  const size = (seed.genes?.size?.value as number || rng.nextF64() * 2) + 0.5; // 0.5 to 2.5
  const archetypeOptions = ['humanoid', 'creature', 'robot', 'alien'] as const;
  const archetype = seed.genes?.archetype?.value as typeof archetypeOptions[number] || archetypeOptions[rng.nextInt(0, archetypeOptions.length)];
  const strength = (seed.genes?.strength?.value as number || rng.nextF64()) * 100; // 0-100
  const agility = (seed.genes?.agility?.value as number || rng.nextF64()) * 100; // 0-100
  const paletteCount = 3;
  const palette = Array.from({ length: paletteCount }, () => rng.nextF64()); // 0-1 for each
  const personalityOptions = ['brave', 'cautious', 'curious', 'aggressive', 'peaceful'] as const;
  const personality = seed.genes?.personality?.value as typeof personalityOptions[number] || personalityOptions[rng.nextInt(0, personalityOptions.length)];
  
  return {
    // Return extracted parameters:
    size,
    archetype,
    strength,
    agility,
    palette,
    personality,
    quality: quality as QualityTier,
  };
}

// meshGroupToOBJ removed — now using GLTF exporter
