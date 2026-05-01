/**
 * Game Generator — produces WASM-ready game logic
 * Enhanced with WebAssembly support for performance-critical code
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface GameParams {
  genre: string;
  difficulty: number;
  levelCount: number;
  hasPowerups: boolean;
  hasObstacles: boolean;
  hasBoss: boolean;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateGameWASM(seed: Seed, outputPath: string): Promise<{ filePath: string; wasmPath: string; size: number }> {
  const params = extractParams(seed);

  // Generate game logic in JavaScript (WASM-ready)
  const gameLogic = generateGameLogicJS(params);
  const wasmStub = generateWASMStub(params);
  const levels = generateLevels(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write main game JS file (WASM-ready)
  const jsPath = outputPath.replace(/\.js$/, '_wasm.js');
  fs.writeFileSync(jsPath, gameLogic);

  // Write WASM stub (placeholder for actual WASM compilation)
  const wasmPath = outputPath.replace(/\.js$/, '.wasm');
  fs.writeFileSync(wasmPath, wasmStub);

  // Write levels data
  const levelsPath = path.join(dir, 'levels.json');
  fs.writeFileSync(levelsPath, JSON.stringify(levels, null, 2));

  return {
    filePath: jsPath,
    wasmPath,
    size: gameLogic.length + wasmStub.length
  };
}

function generateGameLogicJS(params: GameParams): string {
  return `/**
 * Game Logic — WASM-ready
 * This file can be compiled to WebAssembly for performance-critical sections
 */

// Game state (WASM-compatible data structures)
const GameState = {
  player: { x: 100, y: 300, velocityX: 0, velocityY: 0, health: 100 },
  score: 0,
  level: 1,
  time: 0,
  entities: [],
  particles: [],
  ${params.hasPowerups ? 'powerups: [],' : ''}
  ${params.hasObstacles ? 'obstacles: [],' : ''}
  ${params.hasBoss ? 'boss: null,' : ''}
};

// WASM-compatible math functions (can be offloaded)
function vec2Length(x, y) {
  return Math.sqrt(x * x + y * y);
}

function vec2Normalize(x, y) {
  const len = vec2Length(x, y);
  return len > 0 ? [x / len, y / len] : [0, 0];
}

// Game update loop (can be WASM-compiled)
function updateGame(deltaTime) {
  GameState.time += deltaTime;
  
  // Update player
  GameState.player.x += GameState.player.velocityX * deltaTime;
  GameState.player.y += GameState.player.velocityY * deltaTime;
  
  // Apply gravity
  GameState.player.velocityY += 9.8 * deltaTime;
  
  // Boundary checks
  if (GameState.player.y > 500) {
    GameState.player.y = 500;
    GameState.player.velocityY = 0;
  }
  
  // Update entities
  GameState.entities.forEach(entity => {
    entity.x += entity.velocityX * deltaTime;
    entity.y += entity.velocityY * deltaTime;
    
    // Check collision with player
    const dx = entity.x - GameState.player.x;
    const dy = entity.y - GameState.player.y;
    const dist = vec2Length(dx, dy);
    
    if (dist < 32) {
      GameState.score += 10;
      entity.alive = false;
    }
  });
  
  // Clean up dead entities
  GameState.entities = GameState.entities.filter(e => e.alive);
  
  ${params.hasPowerups ? `
  // Update powerups
  GameState.powerups.forEach(powerup => {
    if (!powerup.collected) {
      const dx = powerup.x - GameState.player.x;
      const dy = powerup.y - GameState.player.y;
      if (vec2Length(dx, dy) < 32) {
        powerup.collected = true;
        GameState.player.health = Math.min(100, GameState.player.health + 20);
      }
    }
  });` : ''}
  
  ${params.hasBoss ? `
  // Update boss
  if (GameState.boss && GameState.boss.alive) {
    GameState.boss.x += GameState.boss.velocityX * deltaTime;
    
    // Boss attack
    if (Math.random() < 0.01) {
      GameState.entities.push({
        x: GameState.boss.x,
        y: GameState.boss.y,
        velocityX: -200,
        velocityY: 0,
        alive: true,
        type: 'enemy'
      });
    }
  }` : ''}
}

// WASM export interface
if (typeof Module !== 'undefined') {
  Module._updateGame = updateGame;
  Module._getGameState = () => GameState;
}

// Export for JavaScript usage
if (typeof window !== 'undefined') {
  window.GameLogic = { updateGame, GameState, vec2Length, vec2Normalize };
}

console.log('Game logic loaded (WASM-ready)');
`;
}

function generateWASMStub(params: GameParams): Buffer {
  // This is a placeholder WASM module
  // In production, you would compile the JS to WASM using tools like AssemblyScript
  const wasmStub = new Uint8Array([
    0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, // WASM magic number
    0x01, 0x00, 0x00, 0x00, // Version
    // Minimal WASM module stub
  ]);
  return Buffer.from(wasmStub);
}

function generateLevels(params: GameParams): any[] {
  const levels = [];
  for (let i = 0; i < params.levelCount; i++) {
    levels.push({
      level: i + 1,
      difficulty: params.difficulty * (i + 1) / params.levelCount,
      entityCount: Math.floor(10 + i * 5),
      hasBoss: params.hasBoss && i === params.levelCount - 1,
      timeLimit: 60 + i * 30
    });
  }
  return levels;
}

function extractParams(seed: Seed): GameParams {
  const quality = seed.genes?.quality?.value || 'medium';
  
  return {
    genre: seed.genes?.genre?.value || 'platformer',
    difficulty: typeof seed.genes?.difficulty?.value === 'number' ? seed.genes.difficulty.value : 0.5,
    levelCount: typeof seed.genes?.levelCount?.value === 'number' ? seed.genes.levelCount.value : 5,
    hasPowerups: seed.genes?.hasPowerups?.value === true,
    hasObstacles: seed.genes?.hasObstacles?.value !== false,
    hasBoss: seed.genes?.hasBoss?.value === true,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
