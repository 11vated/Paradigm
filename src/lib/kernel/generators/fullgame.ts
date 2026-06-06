/**
 * FullGame Generator V3 - Playable HTML5 Games
 * Features: Tilemap, entities, win/lose conditions, single HTML export
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface FullGameParams {
  genre: 'action' | 'rpg' | 'puzzle' | 'platformer' | 'shooter';
  difficulty: number;
  levels: number;
  tileResolution: number;
  player: { speed: number; health: number; damage: number; };
}

interface Entity {
  id: string;
  type: 'player' | 'enemy' | 'item';
  x: number;
  y: number;
  health: number;
  behavior: string;
}

interface Level {
  id: number;
  tilemap: number[][];
  entities: Entity[];
  winCondition: string;
}

export async function generateFullGameV3(
  seed: Seed,
  outputPath: string
): Promise<{
  htmlPath: string;
  levels: number;
  fileSize: number;
  loadTime: number;
  gsplSchema?: string;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'fullgame-default');

  // === GSPL Canon Integration (fullgame schema) — load BEFORE extract ===
  let gsplSchemaLoaded: string | undefined;
  let fullgameConstraints: any = null;
  try {
    const schemaContent = await import(/* @vite-ignore */ "fs/promises").then(fs => 
      fs.readFile('data/commons/libraries/fullgame.gspl', 'utf8').catch(() => null));
    if (schemaContent) {
      gsplSchemaLoaded = 'fullgame.gspl';
      fullgameConstraints = parseFullGameSchemaConstraints(schemaContent);
    }
  } catch (_) { /* swallow: schema is optional, fall through to default */ }

  const params = extractFullGameParams(seed, rng, fullgameConstraints);

  // NOTE (verify-sweep): Richer self-contained playable HTML games (more entities, real combat, embedded SFX) require golden hash expansion.
  // Run targeted golden update for fullgame after this change.
  const levels: Level[] = [];
  
  for (let i = 0; i < params.levels; i++) {
    levels.push(generateLevel(i, params, rng));
  }
  
  const html = packageGame(levels, params);
  const htmlPath = await exportHTML(html, outputPath, seed);
  
  return {
    htmlPath,
    levels: params.levels,
    fileSize: html.length,
    loadTime: html.length / (10 * 1024 * 1024),
    gsplSchema: gsplSchemaLoaded
  };
}

function extractFullGameParams(seed: Seed, rng: Xoshiro256StarStar, constraints: any = null): FullGameParams {
  const c = constraints || {};
  const genres = ['action', 'rpg', 'puzzle', 'platformer', 'shooter'] as const;

  const applyScalar = (name: string, val: number, fallback: number) => {
    const range = c.scalars?.[name];
    if (range) return Math.max(range.min, Math.min(range.max, val ?? fallback));
    return val ?? fallback;
  };
  const applyCategorical = (name: string, fallbackList: string[]) => {
    const opts = c.categoricals?.[name];
    const val = seed.genes?.[name]?.value as string;
    if (opts && val && opts.includes(val)) return val;
    if (opts) return opts[Math.floor(rng.nextF64() * opts.length)];
    return val || fallbackList[Math.floor(rng.nextF64() * fallbackList.length)];
  };

  const genre = applyCategorical('genre', genres as unknown as string[]) as FullGameParams['genre'];
  const difficulty = applyScalar('difficulty', rng.nextF64(), 0.5);
  const levels = Math.max(1, Math.min(20, Math.floor(applyScalar('levels', 3 + rng.nextF64() * 17, 10))));
  const tileResolution = Math.max(32, Math.min(256, Math.floor(applyScalar('tileResolution', 32 + rng.nextF64() * 224, 128))));
  const playerSpeed = applyScalar('playerSpeed', 0.5 + rng.nextF64(), 0.8);
  const playerHealth = Math.max(50, Math.min(200, Math.floor(applyScalar('playerHealth', 50 + rng.nextF64() * 150, 100))));

  return {
    genre,
    difficulty,
    levels,
    tileResolution,
    player: {
      speed: playerSpeed,
      health: playerHealth,
      damage: 5 + Math.floor(rng.nextF64() * 20)
    }
  };
}

function generateLevel(levelIndex: number, params: FullGameParams, rng: Xoshiro256StarStar): Level {
  const size = params.tileResolution;
  const tilemap: number[][] = [];
  const difficulty = params.difficulty;

  // Much richer tile generation (walls, floor, hazards, cover)
  for (let y = 0; y < size; y++) {
    tilemap[y] = [];
    for (let x = 0; x < size; x++) {
      const n1 = Math.sin(x * 0.08 + levelIndex * 1.3) * Math.cos(y * 0.07);
      const n2 = rng.nextF64() * 0.4 - 0.2;
      const val = n1 + n2;

      if (val > 0.65) tilemap[y][x] = 3;      // wall
      else if (val > 0.35) tilemap[y][x] = 1; // floor
      else if (val > 0.1) tilemap[y][x] = 2;  // low cover
      else tilemap[y][x] = (rng.nextF64() > 0.96) ? 4 : 0; // rare hazard
    }
  }

  const entities: Entity[] = [
    { id: 'player', type: 'player', x: 2, y: 2, health: params.player.health, behavior: 'player' }
  ];

  const enemyCount = 8 + Math.floor(difficulty * 35) + Math.floor(levelIndex * 4);
  const behaviors = ['patrol', 'chase', 'shooter'];

  for (let i = 0; i < enemyCount; i++) {
    let ex, ey;
    do {
      ex = Math.floor(rng.nextF64() * (size - 4)) + 2;
      ey = Math.floor(rng.nextF64() * (size - 4)) + 2;
    } while (tilemap[ey][ex] === 3); // avoid walls

    entities.push({
      id: 'enemy_' + i,
      type: 'enemy',
      x: ex,
      y: ey,
      health: 18 + Math.floor(difficulty * 28) + levelIndex * 3,
      behavior: behaviors[Math.floor(rng.nextF64() * behaviors.length)]
    });
  }

  // Add some pickups / powerups
  for (let i = 0; i < 3 + Math.floor(difficulty * 5); i++) {
    entities.push({
      id: 'item_' + i,
      type: 'item',
      x: Math.floor(rng.nextF64() * (size - 4)) + 2,
      y: Math.floor(rng.nextF64() * (size - 4)) + 2,
      health: 10,
      behavior: 'health_pack'
    });
  }

  return {
    id: levelIndex,
    tilemap,
    entities,
    winCondition: 'defeat_all_enemies'
  };
}

function packageGame(levels: Level[], params: FullGameParams): string {
  // Significantly richer self-contained playable game
  const gameCode = `
var G = {
  c: document.getElementById('c'),
  ctx: null,
  levels: ${JSON.stringify(levels)},
  lv: 0,
  level: null,
  ents: [],
  player: { x: 2, y: 2, hp: ${params.player.health}, maxHp: ${params.player.health}, speed: ${params.player.speed} },
  score: 0,
  keys: {},
  bullets: [],
  paused: false,
  audio: null
};

G.init = function() {
  G.ctx = G.c.getContext('2d');
  G.c.width = 768; G.c.height = 768;
  G.loadLevel(0);
  
  window.addEventListener('keydown', function(e) {
    G.keys[e.code] = true;
    if (e.code === 'KeyP') G.paused = !G.paused;
    if (e.code === 'Space') G.shoot();
  });
  window.addEventListener('keyup', function(e){ G.keys[e.code] = false; });
  
  G.audio = new (window.AudioContext || window.webkitAudioContext)();
  G.loop();
};

G.loadLevel = function(i) {
  G.lv = i;
  G.level = G.levels[i];
  G.ents = G.level.entities.map(e => ({...e}));
  G.player.x = 2; G.player.y = 2;
  G.bullets = [];
  document.getElementById('lv').textContent = (i+1);
};

G.playSound = function(type) {
  if (!G.audio) return;
  const o = G.audio.createOscillator();
  const g = G.audio.createGain();
  o.type = (type === 'shoot') ? 'sawtooth' : (type === 'hit' ? 'square' : 'sine');
  o.frequency.value = (type === 'shoot') ? 880 : (type === 'hit' ? 220 : 660);
  g.gain.value = 0.2;
  const f = G.audio.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1200;
  o.connect(f); f.connect(g); g.connect(G.audio.destination);
  o.start();
  setTimeout(() => { g.gain.value = 0; o.stop(); }, (type === 'hit') ? 120 : 180);
};

G.shoot = function() {
  const p = G.player;
  G.bullets.push({ x: p.x, y: p.y, dx: 0.8, dy: 0, life: 18 });
  G.playSound('shoot');
};

G.update = function() {
  if (G.paused) return;
  const p = G.player;
  const speed = p.speed * 0.8;
  if (G.keys['ArrowLeft'] || G.keys['KeyA']) p.x -= speed;
  if (G.keys['ArrowRight'] || G.keys['KeyD']) p.x += speed;
  if (G.keys['ArrowUp'] || G.keys['KeyW']) p.y -= speed;
  if (G.keys['ArrowDown'] || G.keys['KeyS']) p.y += speed;

  // Clamp to map
  const s = G.level.tilemap.length;
  p.x = Math.max(0.5, Math.min(s-1.5, p.x));
  p.y = Math.max(0.5, Math.min(s-1.5, p.y));

  // Update bullets
  G.bullets = G.bullets.filter(b => {
    b.x += b.dx; b.y += b.dy; b.life--;
    return b.life > 0;
  });

  // Enemy AI + combat
  let aliveEnemies = 0;
  G.ents.forEach(e => {
    if (e.type !== 'enemy' || e.hp <= 0) return;
    aliveEnemies++;

    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;

    if (e.behavior === 'chase' || e.behavior === 'shooter') {
      e.x += (dx / dist) * 0.45;
      e.y += (dy / dist) * 0.45;
    } else { // patrol
      e.x += Math.sin(Date.now()/400 + e.id.length) * 0.3;
      e.y += Math.cos(Date.now()/500 + e.id.length) * 0.3;
    }

    // Collision with player
    if (dist < 0.9) {
      p.hp -= 0.8;
      G.playSound('hit');
    }

    // Simple shooting enemies
    if (e.behavior === 'shooter' && Math.random() < 0.03) {
      G.bullets.push({ x: e.x, y: e.y, dx: (dx/dist)*0.7, dy: (dy/dist)*0.7, life: 14, enemy: true });
    }
  });

  // Bullet vs enemy collision
  G.bullets.forEach(b => {
    if (b.enemy) return;
    G.ents.forEach(e => {
      if (e.type === 'enemy' && e.hp > 0) {
        const d = Math.hypot(e.x - b.x, e.y - b.y);
        if (d < 0.7) {
          e.hp -= 18;
          b.life = 0;
          G.playSound('hit');
          if (e.hp <= 0) G.score += 25;
        }
      }
    });
  });

  // Health packs
  G.ents.forEach(e => {
    if (e.type === 'item' && e.behavior === 'health_pack') {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 0.8 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + 25);
        e.hp = 0; // consume
        G.playSound('pickup');
      }
    }
  });

  if (p.hp <= 0) { G.lose(); return; }

  // Win condition
  if (G.level.winCondition === 'defeat_all_enemies' && aliveEnemies === 0) {
    G.nextLevel();
  }
};

G.render = function() {
  const ctx = G.ctx;
  const s = G.level.tilemap.length;
  const scale = G.c.width / s;
  ctx.fillStyle = '#111';
  ctx.fillRect(0,0,G.c.width,G.c.height);

  // Tiles
  for (let y=0; y<s; y++) {
    for (let x=0; x<s; x++) {
      const t = G.level.tilemap[y][x];
      if (t === 3) ctx.fillStyle = '#444';
      else if (t === 1) ctx.fillStyle = '#222';
      else if (t === 2) ctx.fillStyle = '#333';
      else if (t === 4) ctx.fillStyle = '#3a2a1a';
      else ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(x*scale, y*scale, scale, scale);
    }
  }

  // Entities
  G.ents.forEach(e => {
    if (e.hp <= 0) return;
    if (e.type === 'player') ctx.fillStyle = '#4ade80';
    else if (e.type === 'enemy') ctx.fillStyle = '#f87171';
    else ctx.fillStyle = '#fde047';
    ctx.fillRect(e.x*scale, e.y*scale, scale*0.85, scale*0.85);
  });

  // Bullets
  ctx.fillStyle = '#fff';
  G.bullets.forEach(b => {
    ctx.fillRect(b.x*scale-1.5, b.y*scale-1.5, 3, 3);
  });

  // UI
  document.getElementById('hp').textContent = Math.max(0, Math.floor(G.player.hp));
  document.getElementById('sc').textContent = G.score;
  document.getElementById('lv').textContent = (G.lv + 1);
};

G.loop = function() {
  G.update();
  G.render();
  requestAnimationFrame(() => G.loop());
};

G.nextLevel = function() {
  if (G.lv < G.levels.length - 1) {
    G.loadLevel(G.lv + 1);
  } else {
    G.win();
  }
};

G.win = function() {
  alert('You Win! Final Score: ' + G.score);
  G.score = 0;
  G.loadLevel(0);
};

G.lose = function() {
  alert('You Died. Score: ' + G.score);
  G.score = 0;
  G.loadLevel(0);
};

G.init();
`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Paradigm FullGame — ${params.genre}</title>
<style>
body{margin:0;background:#0f0f0f;color:#ddd;font-family:monospace}
#game{display:flex;justify-content:center;align-items:center;height:100vh;flex-direction:column}
canvas{border:3px solid #334155;background:#111}
#ui{position:absolute;top:16px;left:16px;background:rgba(15,15,15,0.85);padding:8px 14px;border-radius:4px}
</style>
</head>
<body>
<div id="game">
<canvas id="c" width="768" height="768"></canvas>
<div id="ui">
  HP: <span id="hp">${params.player.health}</span> &nbsp;|&nbsp; 
  Score: <span id="sc">0</span> &nbsp;|&nbsp; 
  Level: <span id="lv">1</span><br>
  <small>Arrows/WASD: Move • Space: Shoot • P: Pause</small>
</div>
</div>
<script>${gameCode}</script>
</body>
</html>`;
}

async function exportHTML(html: string, outputPath: string, seed: Seed): Promise<string> {
  const filename = 'fullgame_' + (seed.$hash || 'unknown') + '.html';
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, html);
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateFullGameV3 as generateFullGame };

/**
 * Lightweight parser for fullgame.gspl constraints (completing deeper GSPL usage for flagship).
 */
function parseFullGameSchemaConstraints(schema: string): any {
  const constraints: any = { scalars: {}, categoricals: {} };
  const geneMatches = schema.matchAll(/gene\s+(\w+):\s*(scalar|categorical)\s*(?:in\s*(\[[^\]]+\]))?/g);
  for (const match of geneMatches) {
    const name = match[1];
    const type = match[2];
    const rangeStr = match[3];
    if (type === 'scalar' && rangeStr) {
      const nums = rangeStr.match(/[\d.]+/g);
      if (nums && nums.length >= 2) constraints.scalars[name] = { min: parseFloat(nums[0]), max: parseFloat(nums[1]) };
    } else if (type === 'categorical' && rangeStr) {
      const items = rangeStr.match(/"([^"]+)"|'([^']+)'/g);
      if (items) constraints.categoricals[name] = items.map(s => s.replace(/['"]/g, ''));
    }
  }
  return constraints;
}
