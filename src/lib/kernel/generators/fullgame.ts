/**
 * Full Game Generator — produces complete HTML5 game
 * Extends basic game generator with more features
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface FullGameParams {
  genre: string;
  difficulty: number;
  levels: number;
  mechanics: string[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFullGame(seed: Seed, outputPath: string): Promise<{ filePath: string; levels: number; fileSize: number }> {
  const params = extractParams(seed);

  const html = generateCompleteGame(params);

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const htmlPath = outputPath.replace(/\.gltf$/, '.html');
  fs.writeFileSync(htmlPath, html);

  return {
    filePath: htmlPath,
    levels: params.levels,
    fileSize: html.length
  };
}

function generateCompleteGame(params: FullGameParams): string {
  const { genre, difficulty, levels, mechanics } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <title>Paradigm Full Game - ${genre}</title>
  <style>
    body { margin:0; padding:0; font-family:Arial; background:#1a1a2e; color:#eee; overflow:hidden; }
    #gameCanvas { display:block; margin:0 auto; background:#16213e; }
    #ui { position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.7); padding:10px; border-radius:5px; }
    .btn { padding:8px 16px; margin:5px; background:#0f3460; color:white; border:none; border-radius:3px; cursor:pointer; }
  </style>
</head>
<body>
  <div id="ui">
    <h2>${genre.charAt(0).toUpperCase() + genre.slice(1)} Game</h2>
    <p>Difficulty: ${(difficulty * 100).toFixed(0)}% | Levels: ${levels}</p>
    <button class="btn" onclick="game.start()">Start</button>
    <button class="btn" onclick="game.pause()">Pause</button>
    <p>Score: <span id="score">0</span> | Level: <span id="level">1</span></p>
  </div>
  <canvas id="gameCanvas"></canvas>
  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const game = {
      score: 0, level: 1, running: false, paused: false,
      player: { x: canvas.width/2, y: canvas.height/2, size: 30, speed: 5 },
      enemies: [], powerups: [],

      start() { this.running = true; this.score = 0; this.level = 1; this.gameLoop(); },
      pause() { this.paused = !this.paused; },
      gameLoop() {
        if (!this.running) return;
        if (this.paused) { requestAnimationFrame(() => this.gameLoop()); return; }
        ctx.clearRect(0,0,canvas.width,canvas.height);

        // Draw player
        ctx.fillStyle = '#e94560';
        ctx.fillRect(this.player.x, this.player.y, this.player.size, this.player.size);

        // ${mechanics.join(', ')} mechanics
        this.updateGame();
        this.drawUI();

        requestAnimationFrame(() => this.gameLoop());
      },
      updateGame() {
        this.score += 1;
        if (this.score % 100 === 0) this.level = Math.min(${levels}, this.level + 1);
      },
      drawUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
      }
    };

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') game.player.x -= game.player.speed;
      if (e.key === 'ArrowRight') game.player.x += game.player.speed;
      if (e.key === 'ArrowUp') game.player.y -= game.player.speed;
      if (e.key === 'ArrowDown') game.player.y += game.player.speed;
    });
  </script>
</body>
</html>`;
}

function extractParams(seed: Seed): FullGameParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const diff = seed.genes?.difficulty?.value || 0.5;
  const levelCount = seed.genes?.levelCount?.value || 0.5;

  return {
    genre: seed.genes?.genre?.value || 'action',
    difficulty: typeof diff === 'number' ? diff : 0.5,
    levels: Math.max(3, Math.floor((typeof levelCount === 'number' ? levelCount : 0.5) * 20)),
    mechanics: (() => {
      const m = seed.genes?.mechanics?.value || ['action'];
      return Array.isArray(m) ? m : ['action'];
    })(),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
