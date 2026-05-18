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

interface CharacterParams {
  size: number;
  archetype: string;
  strength: number;
  agility: number;
  palette: number[];
  personality: string;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateCharacter(seed: Seed, outputPath: string): Promise<{ filePath: string; vertices: number; faces: number }> {
  // Use the world-class V2 generator
  const result = await generateCharacterV2(seed, outputPath);

  // Return in legacy format for compatibility
  return {
    filePath: result.filePath,
    vertices: result.vertices,
    faces: result.faces
  };
}

function extractParams(seed: Seed): CharacterParams {
  const quality = (seed.genes?.quality?.value as string) || 'medium';
  return {
    size: (seed.genes?.size?.value as number) || 1.0,
    archetype: (seed.genes?.archetype?.value as string) || 'warrior',
    strength: (seed.genes?.strength?.value as number) || 0.5,
    agility: (seed.genes?.agility?.value as number) || 0.5,
    palette: seed.genes?.palette?.value || [0.5, 0.5, 0.5],
    personality: (seed.genes?.personality?.value as string) || 'neutral',
    quality: (['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium') as 'low' | 'medium' | 'high' | 'photorealistic'
  };
}

// meshGroupToOBJ removed — now using GLTF exporter
