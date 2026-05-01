/**
 * Fullgame Generator — produces Electron-ready HTML apps
 * Enhanced with multi-platform packaging support
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface FullgameParams {
  genre: string;
  playerCount: number;
  skillCeiling: number;
  hasMultiplayer: boolean;
  hasPhysics: boolean;
  hasInventory: boolean;
  hasQuests: boolean;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateFullGameElectron(seed: Seed, outputPath: string): Promise<{ filePath: string; size: number; platforms: string[] }> {
  const params = extractParams(seed);

  // Generate Electron-ready HTML with embedded game logic
  const html = generateElectronHTML(params);
  const packageJson = generatePackageJson(params);
  const mainJs = generateMainJs(params);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write main HTML file
  const htmlPath = outputPath.replace(/\.html$/, '_electron.html');
  fs.writeFileSync(htmlPath, html);

  // Write package.json for Electron
  const packagePath = path.join(dir, 'package.json');
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));

  // Write main.js for Electron
  const mainPath = path.join(dir, 'main.js');
  fs.writeFileSync(mainPath, mainJs);

  // Write platform-specific scripts
  const platforms = ['windows', 'mac', 'linux'];
  platforms.forEach(platform => {
    const scriptPath = path.join(dir, `package-${platform}.js`);
    fs.writeFileSync(scriptPath, generatePackagingScript(platform, params));
  });

  return {
    filePath: htmlPath,
    size: html.length + JSON.stringify(packageJson).length + mainJs.length,
    platforms
  };
}

function generateElectronHTML(params: FullgameParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.genre} Game - Paradigm Engine</title>
  <style>
    body { margin: 0; padding: 0; background: #1a1a1a; color: #fff; font-family: Arial, sans-serif; }
    #game-canvas { width: 100vw; height: 100vh; display: block; }
    .ui-overlay { position: absolute; top: 10px; left: 10px; z-index: 100; }
    .hud { background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; }
  </style>
</head>
<body>
  <canvas id="game-canvas"></canvas>
  <div class="ui-overlay">
    <div class="hud">
      <div>Genre: ${params.genre}</div>
      <div>Players: ${params.playerCount}</div>
      <div>Skill: ${params.skillCeiling}/10</div>
    </div>
  </div>
  
  <script>
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // Game state
    let gameState = {
      running: true,
      score: 0,
      time: 0,
      players: ${JSON.stringify(Array(params.playerCount).fill(null).map((_, i) => ({ id: i, x: 100 + i * 50, y: 300 })))},
      physics: ${params.hasPhysics},
      inventory: ${params.hasInventory},
      quests: ${params.hasQuests}
    };
    
    // Game loop
    function gameLoop(timestamp) {
      if (!gameState.running) return;
      
      // Clear canvas
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update game state
      gameState.time = timestamp / 1000;
      
      // Draw players
      gameState.players.forEach(player => {
        ctx.fillStyle = player.id === 0 ? '#00ff00' : '#ff0000';
        ctx.fillRect(player.x, player.y, 32, 32);
      });
      
      // Draw HUD
      ctx.fillStyle = '#fff';
      ctx.font = '16px Arial';
      ctx.fillText('Score: ' + gameState.score, 10, 30);
      ctx.fillText('Time: ' + Math.floor(gameState.time) + 's', 10, 50);
      
      requestAnimationFrame(gameLoop);
    }
    
    // Electron API integration
    if (window.electronAPI) {
      window.electronAPI.onMenuAction((action) => {
        console.log('Menu action:', action);
        if (action === 'pause') gameState.running = !gameState.running;
      });
    }
    
    // Start game loop
    requestAnimationFrame(gameLoop);
  </script>
</body>
</html>`;
}

function generatePackageJson(params: FullgameParams): any {
  return {
    name: `${params.genre.toLowerCase()}-game`,
    version: '1.0.0',
    description: `A ${params.genre} game built with Paradigm Engine`,
    main: 'main.js',
    scripts: {
      start: 'electron .',
      package: 'node -e "require(\'./package-windows.js\')"',
      'package:windows': 'node package-windows.js',
      'package:mac': 'node package-mac.js',
      'package:linux': 'node package-linux.js'
    },
    dependencies: {
      electron: '^28.0.0'
    },
    devDependencies: {
      'electron-builder': '^24.0.0'
    }
  };
}

function generateMainJs(params: FullgameParams): string {
  return `const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('${path.basename(params.genre.toLowerCase() + '_electron.html')}');
  
  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC handlers
ipcMain.on('game-event', (event, data) => {
  console.log('Game event:', data);
});
`;
}

function generatePackagingScript(platform: string, params: FullgameParams): string {
  const platformConfigs: Record<string, any> = {
    windows: { target: 'nsis', arch: ['x64'] },
    mac: { target: 'dmg', arch: ['x64', 'arm64'] },
    linux: { target: 'AppImage', arch: ['x64'] }
  };
  
  const config = platformConfigs[platform];
  
  return `const { build } = require('electron-builder');

build({
  targets: Platform.${platform === 'windows' ? 'WINDOWS' : platform === 'mac' ? 'MAC' : 'LINUX'}.createTarget('${config.target}', ...${JSON.stringify(config.arch)}),
  config: {
    appId: 'com.paradigm.${params.genre.toLowerCase()}',
    productName: '${params.genre} Game',
    directories: { output: 'dist' },
    files: ['**/*'],
    ${platform}: { target: '${config.target}' }
  }
}).then(() => console.log('Packaged for ${platform}'));
`;
}

function extractParams(seed: Seed): FullgameParams {
  const quality = seed.genes?.quality?.value || 'medium';
  
  return {
    genre: seed.genes?.genre?.value || 'action',
    playerCount: typeof seed.genes?.playerCount?.value === 'number' ? seed.genes.playerCount.value : 1,
    skillCeiling: typeof seed.genes?.skillCeiling?.value === 'number' ? seed.genes.skillCeiling.value : 5,
    hasMultiplayer: seed.genes?.hasMultiplayer?.value === true,
    hasPhysics: seed.genes?.hasPhysics?.value !== false,
    hasInventory: seed.genes?.hasInventory?.value === true,
    hasQuests: seed.genes?.hasQuests?.value === true,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
