/**
 * ALife Generator — produces cellular automata patterns
 * Generates Game of Life or similar CA configurations
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface AlifeParams {
  rules: string;
  gridSize: number;
  initialDensity: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateAlife(seed: Seed, outputPath: string): Promise<{ filePath: string; gridSize: number }> {
  const params = extractParams(seed);

  // Generate initial grid
  const grid = [];
  for (let y = 0; y < params.gridSize; y++) {
    grid[y] = [];
    for (let x = 0; x < params.gridSize; x++) {
      grid[y][x] = Math.random() < params.initialDensity ? 1 : 0;
    }
  }

  // Run a few generations
  const generations = 10;
  const history = [grid.map(row => [...row])];

  for (let g = 0; g < generations; g++) {
    const newGrid = grid.map(row => [...row]);
    for (let y = 0; y < params.gridSize; y++) {
      for (let x = 0; x < params.gridSize; x++) {
        const neighbors = countNeighbors(grid, x, y, params.gridSize);
        if (grid[y][x] === 1) {
          newGrid[y][x] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
        } else {
          newGrid[y][x] = neighbors === 3 ? 1 : 0;
        }
      }
    }
    history.push(newGrid.map(row => [...row]));
  }

  // Write JSON
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const jsonPath = outputPath.replace(/\.gltf$/, '.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    rules: params.rules,
    gridSize: params.gridSize,
    initialDensity: params.initialDensity,
    generations: history,
    quality: params.quality
  }, null, 2));

  return { filePath: jsonPath, gridSize: params.gridSize };
}

function countNeighbors(grid: number[][], x: number, y: number, size: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = (x + dx + size) % size;
      const ny = (y + dy + size) % size;
      count += grid[ny][nx];
    }
  }
  return count;
}

function extractParams(seed: Seed): AlifeParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const qualitySizes: Record<string, number> = { low: 16, medium: 32, high: 64, photorealistic: 128 };

  let gridSize = seed.genes?.gridSize?.value || 0.5;
  if (typeof gridSize === 'number' && gridSize <= 1) gridSize = Math.floor(gridSize * qualitySizes[quality]);

  return {
    rules: seed.genes?.rules?.value || 'conway',
    gridSize: Math.max(8, Math.min(gridSize, 256)),
    initialDensity: seed.genes?.density?.value || 0.3,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
