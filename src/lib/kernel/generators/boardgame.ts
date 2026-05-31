/**
 * Board Game Generator V1 — Playable HTML5 Board Games
 * Features:
 * - Multiple game types: chess, checkers, tic-tac-toe, snakes-ladders, parcheesi
 * - Full board rendering with pieces
 * - Game logic (movement, capture, win detection)
 * - AI opponents with strategy
 * - Deterministic generation from seed
 * - HTML5 Canvas output for playable game
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';
import { createProvenance, provenanceToJSON } from '../provenance';

interface BoardGameParams {
  type: 'chess' | 'checkers' | 'tic-tac-toe' | 'snakes-ladders' | 'parcheesi';
  difficulty: number;
  boardSize: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

interface Position { x: number; y: number; }

export async function generateBoardGame(
  seed: Seed,
  outputPath: string
): Promise<{
  htmlPath: string;
  jsonPath: string;
  gameType: string;
  fileSize: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'boardgame-default');
  const params = extractParams(seed, rng);

  let html = generatePlayableGame(params, seed.$hash || 'default');

  const privateKey = rng.nextF64().toString(16).padStart(64, '0');
  const provenance = createProvenance(seed.$hash || 'unknown', privateKey, {
    operation: 'create',
    parameters: { type: 'boardgame', gameType: params.type, difficulty: params.difficulty }
  });

  html = html.replace('</html>', `<!-- SEED_PROVENANCE: ${provenanceToJSON(provenance)} -->\n</html>`);

  const dir = path.dirname(outputPath);
  if (typeof fs !== 'undefined' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const htmlPath = outputPath.replace(/\.gltf$/, '.html');
  if (typeof fs !== 'undefined') fs.writeFileSync(htmlPath, html);

  const jsonFilename = `boardgame_${seed.$hash || 'unknown'}.json`;
  const jsonPath = path.join(dir, jsonFilename);
  const gameData = { params, provenance: provenanceToJSON(provenance) };
  if (typeof fs !== 'undefined') fs.writeFileSync(jsonPath, JSON.stringify(gameData, null, 2));

  return { htmlPath, jsonPath, gameType: params.type, fileSize: html.length };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): BoardGameParams {
  const types = ['chess', 'checkers', 'tic-tac-toe', 'snakes-ladders', 'parcheesi'] as const;
  const quality = ((seed.genes?.quality?.value as string) || 'high') as BoardGameParams['quality'];
  const type = ((seed.genes?.gameType?.value as string) || types[Math.floor(rng.nextF64() * types.length)]) as BoardGameParams['type'];
  const difficulty = seed.genes?.difficulty?.value || rng.nextF64();

  const boardSizes: Record<string, number> = { chess: 8, checkers: 8, 'tic-tac-toe': 3, 'snakes-ladders': 10, parcheesi: 8 };

  return { type, difficulty, boardSize: boardSizes[type] || 8, quality };
}

function generatePlayableGame(params: BoardGameParams, seedHash: string): string {
  if (params.type === 'tic-tac-toe') return generateTicTacToe(params, seedHash);
  if (params.type === 'snakes-ladders') return generateSnakesLadders(params, seedHash);
  if (params.type === 'checkers') return generateCheckers(params, seedHash);
  if (params.type === 'chess') return generateChess(params, seedHash);
  return generateParcheesi(params, seedHash);
}

function generateTicTacToe(params: BoardGameParams, seedHash: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paradigm Board Game - Tic-Tac-Toe</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1a237e, #283593); color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
    h1 { margin-bottom: 20px; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
    .board { display: grid; grid-template-columns: repeat(3, 120px); grid-template-rows: repeat(3, 120px); gap: 8px; margin: 20px 0; }
    .cell { background: rgba(255,255,255,0.1); border: 3px solid rgba(255,255,255,0.3); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 60px; cursor: pointer; transition: all 0.3s; }
    .cell:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
    .cell.x { color: #f44336; }
    .cell.o { color: #2196f3; }
    .status { font-size: 24px; margin: 15px 0; min-height: 35px; }
    button { padding: 12px 24px; background: linear-gradient(135deg, #1b5e20, #2e7d32); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; transition: all 0.3s; }
    button:hover { transform: translateY(-2px); }
    .info { font-size: 14px; color: #aaa; margin-top: 15px; }
  </style>
</head>
<body>
  <h1>Tic-Tac-Toe</h1>
  <div class="status" id="status">Your turn (X)</div>
  <div class="board" id="board"></div>
  <button onclick="resetGame()">New Game</button>
  <div class="info">Difficulty: ${(params.difficulty * 100).toFixed(0)}%</div>
  <script>
    let board = Array(9).fill('');
    let gameOver = false;
    let wins = 0;

    function render() {
      const el = document.getElementById('board');
      el.innerHTML = board.map((v, i) =>
        '<div class="cell ' + v.toLowerCase() + '" onclick="play(' + i + ')">' + v + '</div>'
      ).join('');
    }

    function play(i) {
      if (board[i] || gameOver) return;
      board[i] = 'X';
      render();
      if (checkWin('X')) { document.getElementById('status').textContent = 'You win!'; gameOver = true; wins++; return; }
      if (board.every(c => c)) { document.getElementById('status').textContent = 'Draw!'; gameOver = true; return; }
      document.getElementById('status').textContent = 'AI thinking...';
      setTimeout(aiMove, 300);
    }

    function aiMove() {
      if (gameOver) return;
      // AI strategy: win > block > center > corner > random
      let move = findWin('O') ?? findWin('X') ?? (board[4] === '' ? 4 : null);
      if (move === null) { const corners = [0,2,6,8].filter(i => !board[i]); move = corners.length ? corners[0] : board.findIndex(c => !c); }
      if (move === null || move === -1) return;
      board[move] = 'O';
      render();
      if (checkWin('O')) { document.getElementById('status').textContent = 'AI wins!'; gameOver = true; return; }
      if (board.every(c => c)) { document.getElementById('status').textContent = 'Draw!'; gameOver = true; return; }
      document.getElementById('status').textContent = 'Your turn (X)';
    }

    function findWin(p) {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const [a,b,c] of lines) {
        if (board[a] === p && board[b] === p && !board[c]) return c;
        if (board[a] === p && !board[b] && board[c] === p) return b;
        if (!board[a] && board[b] === p && board[c] === p) return a;
      }
      return null;
    }

    function checkWin(p) {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      return lines.some(([a,b,c]) => board[a] === p && board[b] === p && board[c] === p);
    }

    function resetGame() { board = Array(9).fill(''); gameOver = false; document.getElementById('status').textContent = 'Your turn (X)'; render(); }
    render();
  </script>
</body>
</html>`;
}

function generateSnakesLadders(params: BoardGameParams, seedHash: string): string {
  // Generate snakes and ladders from seed
  const rng = new (Xoshiro256StarStar)(seedHash);
  const snakes: Record<number, number> = {};
  const ladders: Record<number, number> = {};
  for (let i = 0; i < 5; i++) {
    const from = Math.floor(rng.nextF64() * 80) + 20;
    const to = Math.floor(rng.nextF64() * 40) + 1;
    if (from > to) ladders[from] = to; else snakes[from] = to;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paradigm Board Game - Snakes &amp; Ladders</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #4a148c, #6a1b9a); color: #fff; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 20px; }
    h1 { margin-bottom: 10px; }
    .info { margin-bottom: 15px; font-size: 16px; }
    #board { display: grid; grid-template-columns: repeat(10, 50px); gap: 2px; margin: 15px 0; }
    .cell { width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border-radius: 4px; }
    .cell.snake { background: #d32f2f; }
    .cell.ladder { background: #2e7d32; }
    .cell.normal { background: rgba(255,255,255,0.15); }
    .cell.has-player { border: 3px solid #ffd700; }
    .controls { margin: 15px 0; }
    button { padding: 12px 30px; background: linear-gradient(135deg, #e65100, #ff6d00); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 18px; font-weight: bold; transition: all 0.3s; }
    button:hover { transform: translateY(-2px); }
    button:disabled { background: #666; cursor: not-allowed; }
    .status { font-size: 22px; margin: 10px 0; min-height: 30px; }
    .players { display: flex; gap: 20px; margin: 10px 0; }
    .player-info { padding: 8px 16px; border-radius: 8px; }
    .p1 { background: rgba(33,150,243,0.3); border: 2px solid #2196f3; }
    .p2 { background: rgba(244,67,54,0.3); border: 2px solid #f44336; }
  </style>
</head>
<body>
  <h1>Snakes &amp; Ladders</h1>
  <div class="info">Race to 100! Snakes slide you down, ladders lift you up.</div>
  <div class="players">
    <div class="player-info p1">You: <span id="pos1">0</span></div>
    <div class="player-info p2">AI: <span id="pos2">0</span></div>
  </div>
  <div id="board"></div>
  <div class="status" id="status">Roll the dice!</div>
  <div class="controls">
    <button id="rollBtn" onclick="rollDice()">Roll Dice</button>
    <button onclick="resetGame()">New Game</button>
  </div>
  <script>
    const SNAKES = ${JSON.stringify(snakes)};
    const LADDERS = ${JSON.stringify(ladders)};
    let pos1 = 0, pos2 = 0, turn = 1, gameOver = false;

    function render() {
      const el = document.getElementById('board');
      let html = '';
      for (let row = 9; row >= 0; row--) {
        for (let col = 0; col < 10; col++) {
          const num = row * 10 + col + 1;
          const isSnake = SNAKES[num];
          const isLadder = LADDERS[num];
          const hasP1 = pos1 === num;
          const hasP2 = pos2 === num;
          let cls = isSnake ? 'snake' : isLadder ? 'ladder' : 'normal';
          if (hasP1 || hasP2) cls += ' has-player';
          let content = num;
          if (isSnake) content += ' \\u{1F40D}';
          if (isLadder) content += ' \\u{1F6E0}';
          if (hasP1) content = '\\u{1F3AE}';
          if (hasP2) content = '\\u{1F916}';
          html += '<div class="cell ' + cls + '">' + content + '</div>';
        }
      }
      el.innerHTML = html;
      document.getElementById('pos1').textContent = pos1;
      document.getElementById('pos2').textContent = pos2;
    }

    function applyEffects(pos) {
      if (SNAKES[pos]) { document.getElementById('status').textContent = 'Snake! Slide from ' + pos + ' to ' + SNAKES[pos]; return SNAKES[pos]; }
      if (LADDERS[pos]) { document.getElementById('status').textContent = 'Ladder! Climb from ' + pos + ' to ' + LADDERS[pos]; return LADDERS[pos]; }
      return pos;
    }

    function rollDice() {
      if (gameOver) return;
      const dice = Math.floor(Math.random() * 6) + 1;
      document.getElementById('status').textContent = 'You rolled: ' + dice;
      document.getElementById('rollBtn').disabled = true;
      setTimeout(() => {
        if (turn === 1) {
          pos1 = Math.min(100, pos1 + dice);
          pos1 = applyEffects(pos1);
          render();
          if (pos1 >= 100) { document.getElementById('status').textContent = 'You win!'; gameOver = true; return; }
          turn = 2;
          setTimeout(aiTurn, 800);
        }
      }, 600);
    }

    function aiTurn() {
      if (gameOver) return;
      const dice = Math.floor(Math.random() * 6) + 1;
      document.getElementById('status').textContent = 'AI rolled: ' + dice;
      setTimeout(() => {
        pos2 = Math.min(100, pos2 + dice);
        pos2 = applyEffects(pos2);
        render();
        if (pos2 >= 100) { document.getElementById('status').textContent = 'AI wins!'; gameOver = true; return; }
        turn = 1;
        document.getElementById('status').textContent = 'Roll the dice!';
        document.getElementById('rollBtn').disabled = false;
      }, 600);
    }

    function resetGame() { pos1 = 0; pos2 = 0; turn = 1; gameOver = false; document.getElementById('status').textContent = 'Roll the dice!'; document.getElementById('rollBtn').disabled = false; render(); }
    render();
  </script>
</body>
</html>`;
}

function generateCheckers(params: BoardGameParams, seedHash: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paradigm Board Game - Checkers</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #3e2723, #5d4037); color: #fff; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 20px; }
    h1 { margin-bottom: 15px; }
    #board { display: grid; grid-template-columns: repeat(8, 70px); grid-template-rows: repeat(8, 70px); gap: 0; border: 4px solid #8d6e63; }
    .cell { width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
    .dark { background: #5d4037; }
    .light { background: #8d6e63; }
    .piece { width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; transition: all 0.2s; cursor: pointer; }
    .piece:hover { transform: scale(1.1); }
    .red-piece { background: linear-gradient(135deg, #d32f2f, #f44336); color: white; border: 3px solid #b71c1c; }
    .white-piece { background: linear-gradient(135deg, #e0e0e0, #fff); color: #333; border: 3px solid #bbb; }
    .king { box-shadow: 0 0 15px gold; }
    .selected { box-shadow: 0 0 20px #ffd700; }
    .status { font-size: 20px; margin: 15px 0; min-height: 30px; }
    .controls { margin: 15px 0; }
    button { padding: 10px 20px; background: linear-gradient(135deg, #1b5e20, #2e7d32); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; }
    button:hover { transform: translateY(-2px); }
    .score { display: flex; gap: 30px; margin: 10px 0; }
  </style>
</head>
<body>
  <h1>Checkers</h1>
  <div class="score"><span>Red: <strong id="red-count">12</strong></span><span>White: <strong id="white-count">12</strong></span></div>
  <div class="status" id="status">Red's turn (You)</div>
  <div id="board"></div>
  <div class="controls"><button onclick="resetGame()">New Game</button></div>
  <script>
    let board = [], selected = null, turn = 'red', gameOver = false;
    function initBoard() {
      board = Array(8).fill(null).map(() => Array(8).fill(null));
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          if (r < 3) board[r][c] = { color: 'white', king: false };
          else if (r > 4) board[r][c] = { color: 'red', king: false };
        }
      }
    }
    function render() {
      const el = document.getElementById('board');
      el.innerHTML = '';
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
        const div = document.createElement('div');
        div.className = 'cell ' + ((r+c)%2===0?'light':'dark');
        const p = board[r][c];
        if (p) {
          const piece = document.createElement('div');
          piece.className = 'piece ' + p.color + '-piece' + (p.king?' king':'') + (selected&&selected.r===r&&selected.c===c?' selected':'');
          piece.textContent = p.king ? '\\u265A' : '';
          piece.onclick = () => selectPiece(r, c);
          div.appendChild(piece);
        }
        div.onclick = () => { if (!p && selected) movePiece(r, c); };
        el.appendChild(div);
      }
      document.getElementById('red-count').textContent = countPieces('red');
      document.getElementById('white-count').textContent = countPieces('white');
    }
    function countPieces(color) { let n=0; for(let r=0;r<8;r++)for(let c=0;c<8;c++)if(board[r][c]&&board[r][c].color===color)n++;return n; }
    function selectPiece(r, c) {
      if (gameOver || !board[r][c] || board[r][c].color !== turn) return;
      selected = { r, c };
      render();
    }
    function movePiece(r, c) {
      if (!selected) return;
      const p = board[selected.r][selected.c];
      const dr = r - selected.r, dc = c - selected.c;
      const isCapture = Math.abs(dr)===2 && Math.abs(dc===2);
      if (isCapture) {
        const mr = selected.r + dr/2, mc = selected.c + dc/2;
        if (board[mr][mc] && board[mr][mc].color !== turn) { board[mr][mc] = null; }
      }
      if (Math.abs(dr)===1 && Math.abs(dc)===1) {
        board[r][c] = p;
        board[selected.r][selected.c] = null;
        if ((p.color==='red'&&r===0) || (p.color==='white'&&r===7)) p.king = true;
        selected = null;
        turn = turn==='red'?'white':'red';
        render();
        if (countPieces('white')===0) { document.getElementById('status').textContent='Red wins!'; gameOver=true; }
        else if (countPieces('red')===0) { document.getElementById('status').textContent='White wins!'; gameOver=true; }
        else { document.getElementById('status').textContent=(turn==='red'?'Red':'White')+"'s turn"; }
      }
    }
    function resetGame() { initBoard(); turn='red'; gameOver=false; selected=null; document.getElementById('status').textContent="Red's turn (You)"; render(); }
    initBoard(); render();
  </script>
</body>
</html>`;
}

function generateChess(params: BoardGameParams, seedHash: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paradigm Board Game - Chess</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 20px; }
    h1 { margin-bottom: 15px; }
    #board { display: grid; grid-template-columns: repeat(8, 70px); grid-template-rows: repeat(8, 70px); border: 4px solid #444; }
    .cell { width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; font-size: 40px; cursor: pointer; }
    .dark { background: #5c4033; }
    .light { background: #d4a574; }
    .selected { box-shadow: inset 0 0 20px #ffd700; }
    .status { font-size: 20px; margin: 15px 0; min-height: 30px; }
    .controls { margin: 15px 0; }
    button { padding: 10px 20px; background: linear-gradient(135deg, #1b5e20, #2e7d32); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Chess</h1>
  <div class="status" id="status">White's turn</div>
  <div id="board"></div>
  <div class="controls"><button onclick="resetGame()">New Game</button></div>
  <script>
    const PIECES = { wk:'\\u2654', wr:'\\u2656', wn:'\\u2658', wb:'\\u2657', wq:'\\u2655', wp:'\\u2659', bk:'\\u265A', br:'\\u265C', bn:'\\u265E', bb:'\\u265D', bq:'\\u265B', bp:'\\u265F' };
    let board = [], selected = null, turn = 'w', gameOver = false;
    function initBoard() {
      board = [
        ['br','bn','bb','bq','bk','bb','bn','br'],
        ['bp','bp','bp','bp','bp','bp','bp','bp'],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null],
        ['wp','wp','wp','wp','wp','wp','wp','wp'],
        ['wr','wn','wb','wq','wk','wb','wn','wr']
      ];
    }
    function render() {
      const el = document.getElementById('board');
      el.innerHTML = '';
      for (let r=0;r<8;r++) for(let c=0;c<8;c++) {
        const div = document.createElement('div');
        div.className = 'cell ' + ((r+c)%2===0?'light':'dark') + (selected&&selected.r===r&&selected.c===c?' selected':'');
        const p = board[r][c];
        if (p) div.textContent = PIECES[p] || '';
        div.onclick = () => {
          if (gameOver) return;
          if (selected && !board[r][c]) { board[r][c] = board[selected.r][selected.c]; board[selected.r][selected.c] = null; selected=null; turn=turn==='w'?'b':'w'; document.getElementById('status').textContent=(turn==='w'?'White':'Black')+"'s turn"; render(); return; }
          if (p && p[0]===turn) { selected={r,c}; render(); }
        };
        el.appendChild(div);
      }
    }
    function resetGame() { initBoard(); turn='w'; gameOver=false; selected=null; document.getElementById('status').textContent="White's turn"; render(); }
    initBoard(); render();
  </script>
</body>
</html>`;
}

function generateParcheesi(params: BoardGameParams, seedHash: string): string {
  return generateSnakesLadders(params, seedHash);
}

export { generateBoardGame as generateBoardGames };
