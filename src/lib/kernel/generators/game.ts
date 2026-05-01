/**
 * Game Generator — produces HTML5 playable game files
 * Creates simple browser-based games from seed genes
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface GameParams {
  genre: string;
  difficulty: number;
  levelCount: number;
  mechanics: string[];
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateGame(seed: Seed, outputPath: string): Promise<{ filePath: string; levelCount: number; fileSize: number }> {
  const params = extractParams(seed);

  // Generate HTML5 game
  const html = generateHTML5Game(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write HTML file
  const htmlPath = outputPath.replace(/\.gltf$/, '.html');
  fs.writeFileSync(htmlPath, html);

  return {
    filePath: htmlPath,
    levelCount: params.levelCount,
    fileSize: html.length
  };
}

function generateHTML5Game(params: GameParams): string {
  const { genre, difficulty, levelCount, mechanics } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <title>Paradigm Game - ${genre}</title>
  <style>
    body { margin: 0; padding: 20px; font-family: Arial; background: #1a1a2e; color: #eee; }
    canvas { border: 2px solid #0f3460; background: #16213e; display: block; margin: 20px auto; }
    .info { text-align: center; margin: 10px; }
    .controls { text-align: center; margin: 20px; }
    button { padding: 10px 20px; margin: 5px; background: #0f3460; color: white; border: none; border-radius: 5px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="info">
    <h1>${genre.charAt(0).toUpperCase() + genre.slice(1)} Game</h1>
    <p>Difficulty: ${(difficulty * 100).toFixed(0)}% | Levels: ${levelCount} | Mechanics: ${mechanics.join(', ')}</p>
  </div>
  <canvas id="gameCanvas" width="800" height="600"></canvas>
  <div class="controls">
    <button onclick="startGame()">Start Game</button>
    <button onclick="resetGame()">Reset</button>
  </div>
  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    let gameState = { score: 0, level: 1, running: false };

    function startGame() {
      gameState.running = true;
      gameState.score = 0;
      gameLoop();
    }

    function resetGame() {
      gameState = { score: 0, level: 1, running: false };
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    function gameLoop() {
      if (!gameState.running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Simple game mechanics based on genre
      ${getGameMechanics(genre, mechanics)}

      gameState.score += 1;
      if (gameState.score % 100 === 0) gameState.level++;

      requestAnimationFrame(gameLoop);
    }

    ${getGenreScript(genre)}
  </script>
</body>
</html>`;
}

function getGameMechanics(genre: string, mechanics: string[]): string {
  if (genre === 'action') {
    return `
      // Action game: move player, avoid obstacles
      const playerX = canvas.width / 2 + Math.sin(Date.now() / 100) * 100;
      ctx.fillStyle = '#e94560';
      ctx.fillRect(playerX, canvas.height - 50, 50, 50);
    `;
  }
  if (genre === 'puzzle') {
    return `
      // Puzzle game: draw shapes
      ctx.fillStyle = '#0f3460';
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(100 + i * 120, 200, 100, 100);
      }
    `;
  }
  return `
    // Generic game: display score
    ctx.fillStyle = '#eee';
    ctx.font = '24px Arial';
    ctx.fillText('Score: ' + gameState.score, 20, 40);
    ctx.fillText('Level: ' + gameState.level, 20, 70);
  `;
}

function getGenreScript(genre: string): string {
  return `
    function handleKeydown(e) {
      if (e.key === ' ') gameState.running = !gameState.running;
    }
    document.addEventListener('keydown', handleKeydown);
  `;
}

function extractParams(seed: Seed): GameParams {
  const quality = seed.genes?.quality?.value || 'medium';
  const diff = seed.genes?.difficulty?.value || 0.5;
  const levelCount = seed.genes?.levelCount?.value || 0.5;

  return {
    genre: seed.genes?.genre?.value || 'action',
    difficulty: typeof diff === 'number' ? diff : 0.5,
    levelCount: Math.max(3, Math.floor((typeof levelCount === 'number' ? levelCount : 0.5) * 20)),
    mechanics: (() => {
      const m = seed.genes?.mechanics?.value || ['action'];
      return Array.isArray(m) ? m : ['action'];
    })(),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
