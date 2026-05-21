/**
 * Game Generator V3 — Game Mechanics and Rules
 * Features: Turn-based, real-time, multiplayer support
 * Export: JSON rules, playable HTML prototype
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface GameParams {
  type: 'turn-based' | 'real-time' | 'hybrid';
  players: number;
  genre: 'strategy' | 'rpg' | 'puzzle' | 'card' | 'board';
  complexity: 'light' | 'medium' | 'heavy';
  duration: number;
}

interface GameRule {
  name: string;
  description: string;
  trigger: string;
  effect: string;
}

interface GameComponent {
  type: 'card' | 'token' | 'board' | 'piece' | 'dice';
  count: number;
  properties: Record<string, any>;
}

export async function generateGameV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  htmlPath: string;
  ruleCount: number;
  componentCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'game-default');
  const params = extractGameParams(seed, rng);
  
  // Generate rules
  const rules = generateRules(params, rng);
  
  // Generate components
  const components = generateComponents(params, rng);
  
  // Generate win conditions
  const winConditions = generateWinConditions(params, rng);
  
  // Export
  const jsonPath = await exportGameJSON({ params, rules, components, winConditions }, outputPath, seed);
  const htmlPath = await exportPlayableHTML(params, rules, components, outputPath, seed);
  
  return {
    jsonPath,
    htmlPath,
    ruleCount: rules.length,
    componentCount: components.length
  };
}

function extractGameParams(seed: Seed, rng: Xoshiro256StarStar): GameParams {
  const types = ['turn-based', 'real-time', 'hybrid'] as const;
  const genres = ['strategy', 'rpg', 'puzzle', 'card', 'board'] as const;
  const complexities = ['light', 'medium', 'heavy'] as const;
  
  return {
    type: types[Math.floor(rng.nextF64() * types.length)],
    players: 1 + Math.floor(rng.nextF64() * 7),
    genre: genres[Math.floor(rng.nextF64() * genres.length)],
    complexity: complexities[Math.floor(rng.nextF64() * complexities.length)],
    duration: 15 + Math.floor(rng.nextF64() * 105)
  };
}

function generateRules(params: GameParams, rng: Xoshiro256StarStar): GameRule[] {
  const rules: GameRule[] = [];
  
  // Core mechanics based on genre
  if (params.genre === 'strategy') {
    rules.push({ name: 'Resource Gathering', description: 'Collect resources each turn', trigger: 'start of turn', effect: 'gain 1 resource' });
    rules.push({ name: 'Unit Movement', description: 'Move units across the board', trigger: 'action phase', effect: 'move up to 3 spaces' });
    rules.push({ name: 'Combat', description: 'Resolve battles between units', trigger: 'attack declared', effect: 'compare strength values' });
  } else if (params.genre === 'rpg') {
    rules.push({ name: 'Character Creation', description: 'Create your character', trigger: 'game start', effect: 'assign ability scores' });
    rules.push({ name: 'Experience', description: 'Gain XP from encounters', trigger: 'encounter complete', effect: 'gain XP based on difficulty' });
    rules.push({ name: 'Level Up', description: 'Improve character abilities', trigger: 'XP threshold reached', effect: 'increase abilities' });
  } else if (params.genre === 'card') {
    rules.push({ name: 'Draw Phase', description: 'Draw cards from deck', trigger: 'start of turn', effect: 'draw 2 cards' });
    rules.push({ name: 'Play Cards', description: 'Play cards from hand', trigger: 'action phase', effect: 'place card in play' });
    rules.push({ name: 'Discard', description: 'Discard to hand limit', trigger: 'end of turn', effect: 'discard to 5 cards' });
  } else {
    rules.push({ name: 'Turn Order', description: 'Players take turns', trigger: 'game start', effect: 'determine first player' });
    rules.push({ name: 'Action', description: 'Take an action on your turn', trigger: 'your turn', effect: 'perform one action' });
    rules.push({ name: 'Scoring', description: 'Earn points through objectives', trigger: 'objective complete', effect: 'gain points' });
  }
  
  return rules;
}

function generateComponents(params: GameParams, rng: Xoshiro256StarStar): GameComponent[] {
  const components: GameComponent[] = [];
  
  if (params.genre === 'card') {
    components.push({ type: 'card', count: 50 + Math.floor(rng.nextF64() * 100), properties: { deck: 'main' } });
  } else if (params.genre === 'board') {
    components.push({ type: 'board', count: 1, properties: { size: 'medium' } });
    components.push({ type: 'piece', count: params.players * 3, properties: { color: 'varied' } });
  } else if (params.genre === 'rpg') {
    components.push({ type: 'token', count: 20, properties: { type: 'character' } });
    components.push({ type: 'dice', count: 5, properties: { sides: [6, 10, 20] } });
  }
  
  return components;
}

function generateWinConditions(params: GameParams, rng: Xoshiro256StarStar): string[] {
  const conditions: string[] = [];
  
  if (params.genre === 'strategy') {
    conditions.push('Control 5 territories', 'Eliminate all opponents', 'Accumulate 20 points');
  } else if (params.genre === 'rpg') {
    conditions.push('Defeat the final boss', 'Complete the main quest', 'Reach level 20');
  } else if (params.genre === 'card') {
    conditions.push('Reduce opponent life to 0', 'Draw all cards from deck', 'Complete combo');
  } else {
    conditions.push('Highest score after 10 rounds', 'Complete all objectives', 'Be first to finish');
  }
  
  return conditions.slice(0, 1 + Math.floor(rng.nextF64() * 2));
}

async function exportGameJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `game_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportPlayableHTML(params: GameParams, rules: GameRule[], components: GameComponent[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `game_${seed.$hash || 'unknown'}.html`;
  const filePath = path.join(outputPath, filename);
  
  const html = `<!DOCTYPE html><html><head><title>Game - ${seed.$hash}</title>
<style>body{font-family:system-ui;padding:20px;background:#1a1a1a;color:#fff;max-width:800px;margin:0 auto}
h1,h2{color:#3b82f6}.rule{background:#2a2a2a;padding:12px;margin:8px 0;border-radius:8px}
.component{display:inline-block;padding:8px;margin:4px;background:#3b82f6;border-radius:4px}</style></head>
<body><h1>${params.genre.toUpperCase()} Game</h1>
<p>Players: ${params.players} | Duration: ${params.duration}min | Type: ${params.type}</p>
<h2>Rules</h2>${rules.map(r => `<div class="rule"><strong>${r.name}</strong><p>${r.description}</p><small>Trigger: ${r.trigger} | Effect: ${r.effect}</small></div>`).join('')}
<h2>Components</h2>${components.map(c => `<span class="component">${c.type} x${c.count}</span>`).join('')}
<h2>Win Conditions</h2><ul>${generateWinConditions(params, new Xoshiro256StarStar(seed.$hash || 'x')).map(c => `<li>${c}</li>`).join('')}</ul>
</body></html>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, html);
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateGameV3 as generateGame };
