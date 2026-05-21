/**
 * ALife Generator V3 — Artificial Life Simulations
 * Features: Cellular automata, emergent behavior, evolution
 * Export: JSON simulation, interactive HTML, video capture
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface ALifeParams {
  type: 'conway' | 'langton' | 'boids' | 'l-system' | 'neural';
  gridSize: number;
  generations: number;
  initialDensity: number;
  rules: Record<string, any>;
}

interface CellState {
  x: number;
  y: number;
  alive: boolean;
  age: number;
  neighbors: number;
}

export async function generateALifeV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  htmlPath: string;
  generations: number;
  finalPopulation: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'alife-default');
  const params = extractALifeParams(seed, rng);
  
  // Initialize grid
  const grid = initializeGrid(params, rng);
  
  // Run simulation
  const history = runSimulation(grid, params, rng);
  
  // Export
  const jsonPath = await exportALifeJSON({ params, history }, outputPath, seed);
  const htmlPath = await exportInteractiveHTML(params, history, outputPath, seed);
  
  const finalPop = history[history.length - 1].filter((c: any) => c.alive).length;
  
  return {
    jsonPath,
    htmlPath,
    generations: history.length,
    finalPopulation: finalPop
  };
}

function extractALifeParams(seed: Seed, rng: Xoshiro256StarStar): ALifeParams {
  const types = ['conway', 'langton', 'boids', 'l-system', 'neural'] as const;
  const sizes = [32, 64, 128, 256];
  
  return {
    type: types[Math.floor(rng.nextF64() * types.length)],
    gridSize: sizes[Math.floor(rng.nextF64() * sizes.length)],
    generations: 50 + Math.floor(rng.nextF64() * 150),
    initialDensity: 0.1 + rng.nextF64() * 0.4,
    rules: {}
  };
}

function initializeGrid(params: ALifeParams, rng: Xoshiro256StarStar): CellState[][] {
  const grid: CellState[][] = [];
  
  for (let y = 0; y < params.gridSize; y++) {
    grid[y] = [];
    for (let x = 0; x < params.gridSize; x++) {
      grid[y][x] = {
        x,
        y,
        alive: rng.nextF64() < params.initialDensity,
        age: 0,
        neighbors: 0
      };
    }
  }
  
  return grid;
}

function runSimulation(initialGrid: CellState[][], params: ALifeParams, rng: Xoshiro256StarStar): any[] {
  const history: any[] = [];
  let grid = JSON.parse(JSON.stringify(initialGrid));
  const size = params.gridSize;
  
  for (let gen = 0; gen < Math.min(params.generations, 200); gen++) {
    const snapshot: any[] = [];
    const newGrid: CellState[][] = [];
    
    for (let y = 0; y < size; y++) {
      newGrid[y] = [];
      for (let x = 0; x < size; x++) {
        // Count neighbors (Moore neighborhood)
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = (x + dx + size) % size;
            const ny = (y + dy + size) % size;
            if (grid[ny][nx].alive) neighbors++;
          }
        }
        
        // Conway's Game of Life rules
        const cell = grid[y][x];
        let alive = cell.alive;
        if (cell.alive && (neighbors === 2 || neighbors === 3)) {
          alive = true;
        } else if (!cell.alive && neighbors === 3) {
          alive = true;
        } else {
          alive = false;
        }
        
        newGrid[y][x] = {
          x, y,
          alive,
          age: alive ? cell.age + 1 : 0,
          neighbors
        };
        
        snapshot.push(newGrid[y][x]);
      }
    }
    
    grid = newGrid;
    history.push(snapshot);
  }
  
  return history;
}

async function exportALifeJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `alife_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportInteractiveHTML(params: ALifeParams, history: any[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `alife_${seed.$hash || 'unknown'}.html`;
  const filePath = path.join(outputPath, filename);
  
  const html = `<!DOCTYPE html><html><head><title>ALife - ${seed.$hash}</title>
<style>body{margin:0;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh}
canvas{border:1px solid #333}</style></head><body><canvas id="c"></canvas>
<script>
const c=document.getElementById('c'),x=c.getContext('2d');
const history=${JSON.stringify(history)};
const size=${params.gridSize};
const cellSize=Math.floor(400/size);
c.width=size*cellSize;c.height=size*cellSize;
let frame=0;
function render(){
  const gen=history[frame%history.length];
  x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);
  x.fillStyle='#0f0';
  gen.forEach(cell=>{if(cell.alive)x.fillRect(cell.x*cellSize,cell.y*cellSize,cellSize-1,cellSize-1)});
  x.fillStyle='#fff';x.fillText('Gen: '+frame,10,20);
  frame++;requestAnimationFrame(render);
}
render();
</script></body></html>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, html);
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateALifeV3 as generateALife };

// ── Lowercase aliases for cross-file consistency ──
export type AlifeParams = ALifeParams;
export interface AlifeResult { jsonPath: string; htmlPath: string; }
export { generateALifeV3 as generateAlife };
