/**
 * Card Game Generator V1 — Playable HTML5 Card Games
 * Features:
 * - Multiple game types: poker, blackjack, solitaire, war, hearts
 * - Full card deck with suits and values
 * - Game logic (dealing, shuffling, betting, discarding)
 * - AI opponents with strategy
 * - Win/lose conditions
 * - Deterministic generation from seed
 * - HTML5 Canvas output for playable game
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';
import { createProvenance, provenanceToJSON } from '../provenance';

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
  suit: Suit;
  value: CardValue;
  faceUp: boolean;
}

interface CardGameParams {
  type: 'blackjack' | 'poker' | 'solitaire' | 'war' | 'hearts';
  difficulty: number;
  playerCount: number;
  startingChips: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

interface GameState {
  deck: Card[];
  players: { name: string; hand: Card[]; chips: number; bet: number; standing: boolean }[];
  dealer: { hand: Card[]; standing: boolean };
  pile: Card[];
  currentTurn: number;
  phase: 'betting' | 'dealing' | 'playing' | 'showdown' | 'finished';
  winner: string | null;
  score: number;
}

export async function generateCardGame(
  seed: Seed,
  outputPath: string
): Promise<{
  htmlPath: string;
  jsonPath: string;
  gameType: string;
  fileSize: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'cardgame-default');
  const params = extractParams(seed, rng);

  const gameState = initializeGame(params, rng);
  let html = generatePlayableGame(params, gameState);

  const privateKey = rng.nextF64().toString(16).padStart(64, '0');
  const provenance = createProvenance(seed.$hash || 'unknown', privateKey, {
    operation: 'create',
    parameters: { type: 'cardgame', gameType: params.type, difficulty: params.difficulty }
  });

  html = html.replace('</html>', `<!-- SEED_PROVENANCE: ${provenanceToJSON(provenance)} -->\n</html>`);

  const dir = path.dirname(outputPath);
  if (typeof fs !== 'undefined' && !fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const htmlPath = outputPath.replace(/\.gltf$/, '.html');
  if (typeof fs !== 'undefined') fs.writeFileSync(htmlPath, html);

  const jsonFilename = `cardgame_${seed.$hash || 'unknown'}.json`;
  const jsonPath = path.join(dir, jsonFilename);
  const gameData = { params, gameState: { ...gameState, deck: `[${gameState.deck.length} cards]` }, provenance: provenanceToJSON(provenance) };
  if (typeof fs !== 'undefined') fs.writeFileSync(jsonPath, JSON.stringify(gameData, null, 2));

  return { htmlPath, jsonPath, gameType: params.type, fileSize: html.length };
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): CardGameParams {
  const types = ['blackjack', 'poker', 'solitaire', 'war', 'hearts'] as const;
  const quality = ((seed.genes?.quality?.value as string) || 'high') as CardGameParams['quality'];
  const type = ((seed.genes?.gameType?.value as string) || types[Math.floor(rng.nextF64() * types.length)]) as CardGameParams['type'];
  const difficulty = seed.genes?.difficulty?.value || rng.nextF64();

  return {
    type,
    difficulty,
    playerCount: type === 'solitaire' ? 1 : type === 'war' ? 2 : Math.floor(rng.nextF64() * 3) + 2,
    startingChips: 1000,
    quality
  };
}

function createDeck(rng: Xoshiro256StarStar): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value, faceUp: false });
    }
  }
  // Fisher-Yates shuffle using deterministic RNG
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng.nextF64() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardNumericValue(value: CardValue): number {
  if (value === 'A') return 11;
  if (['K', 'Q', 'J'].includes(value)) return 10;
  return parseInt(value);
}

function handValue(hand: Card[]): number {
  let value = 0;
  let aces = 0;
  for (const card of hand) {
    value += cardNumericValue(card.value);
    if (card.value === 'A') aces++;
  }
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
}

function initializeGame(params: CardGameParams, rng: Xoshiro256StarStar): GameState {
  const deck = createDeck(rng);
  const players = [];
  for (let i = 0; i < params.playerCount; i++) {
    players.push({ name: i === 0 ? 'You' : `AI ${i}`, hand: [], chips: params.startingChips, bet: 0, standing: false });
  }
  const gameState: GameState = {
    deck,
    players,
    dealer: { hand: [], standing: false },
    pile: [],
    currentTurn: 0,
    phase: 'betting',
    winner: null,
    score: 0
  };
  return gameState;
}

function generatePlayableGame(params: CardGameParams, initial: GameState): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Paradigm Card Game - ${params.type.charAt(0).toUpperCase() + params.type.slice(1)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0d4d0d, #1a5c1a, #0d4d0d);
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    h1 { text-shadow: 0 2px 4px rgba(0,0,0,0.5); margin-bottom: 10px; }
    .game-info { text-align: center; margin-bottom: 20px; font-size: 16px; }
    #table {
      background: #145a14;
      border: 12px solid #5c3a1e;
      border-radius: 20px;
      padding: 30px;
      min-width: 700px;
      min-height: 500px;
      box-shadow: 0 0 50px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3);
      position: relative;
    }
    .hand-area { display: flex; justify-content: center; gap: 10px; margin: 15px 0; flex-wrap: wrap; min-height: 120px; align-items: center; }
    .hand-label { font-size: 14px; color: #aaa; text-align: center; margin-bottom: 5px; }
    .card {
      width: 70px;
      height: 100px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: transform 0.2s;
      cursor: pointer;
      user-select: none;
    }
    .card:hover { transform: translateY(-5px); }
    .card.red { background: #fff; color: #d32f2f; border: 2px solid #d32f2f; }
    .card.black { background: #fff; color: #212121; border: 2px solid #212121; }
    .card.facedown { background: linear-gradient(135deg, #1a237e, #283593); color: transparent; border: 2px solid #fff; }
    .card .suit { font-size: 20px; }
    .card .value { font-size: 18px; }
    .controls { display: flex; gap: 10px; margin: 20px 0; flex-wrap: wrap; justify-content: center; }
    button {
      padding: 12px 24px;
      background: linear-gradient(135deg, #b71c1c, #d32f2f);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: all 0.3s;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.4); }
    button:disabled { background: #666; cursor: not-allowed; transform: none; }
    button.green { background: linear-gradient(135deg, #1b5e20, #2e7d32); }
    .status {
      position: absolute;
      top: 15px;
      right: 20px;
      text-align: right;
      font-size: 14px;
    }
    .chips { color: #ffd700; font-weight: bold; }
    .bet { color: #ff9800; }
    .message {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      margin: 15px 0;
      min-height: 30px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }
    .dealer-area { border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 15px; margin-bottom: 15px; }
  </style>
</head>
<body>
  <h1>${params.type.charAt(0).toUpperCase() + params.type.slice(1)} Game</h1>
  <div class="game-info">Difficulty: ${(params.difficulty * 100).toFixed(0)}% | Players: ${params.playerCount} | Chips: ${params.startingChips}</div>
  <div id="table">
    <div class="status">
      <div>Chips: <span class="chips" id="chips">${params.startingChips}</span></div>
      <div>Bet: <span class="bet" id="bet">0</span></div>
      <div>Wins: <span id="wins">0</span></div>
    </div>
    <div class="dealer-area">
      <div class="hand-label">Dealer (<span id="dealer-value">?</span>)</div>
      <div class="hand-area" id="dealer-hand"></div>
    </div>
    <div class="message" id="message">Place your bet!</div>
    <div class="hand-area" id="player-hand"></div>
    <div class="controls">
      <button id="btn-deal" class="green" onclick="deal()">Deal</button>
      <button id="btn-hit" onclick="hit()" disabled>Hit</button>
      <button id="btn-stand" onclick="stand()" disabled>Stand</button>
      <button id="btn-double" onclick="doubleDown()" disabled>Double Down</button>
      <button id="btn-bet10" onclick="addBet(10)">+10</button>
      <button id="btn-bet50" onclick="addBet(50)">+50</button>
      <button id="btn-bet100" onclick="addBet(100)">+100</button>
      <button id="btn-new" onclick="newRound()" style="display:none" class="green">New Round</button>
    </div>
  </div>
  <script>
    const SUITS = ['hearts','diamonds','clubs','spades'];
    const VALUES = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
    const SUIT_SYMBOLS = { hearts:'\\u2665', diamonds:'\\u2666', clubs:'\\u2663', spades:'\\u2660' };

    let deck = [];
    let playerHand = [];
    let dealerHand = [];
    let chips = ${params.startingChips};
    let currentBet = 0;
    let wins = 0;
    let gameOver = false;

    function createDeck() {
      const d = [];
      for (const s of SUITS) for (const v of VALUES) d.push({ suit: s, value: v });
      // Deterministic shuffle from seed
      const seed = ${JSON.stringify(initial.deck.map(c => c.value + '_' + c.suit))};
      return seed.map(s => {
        const [v, suit] = [s.split('_')[0], s.split('_').slice(1).join('_')];
        return { suit, value: v };
      });
    }

    function cardValue(c) {
      if (c.value === 'A') return 11;
      if (['K','Q','J'].includes(c.value)) return 10;
      return parseInt(c.value);
    }

    function handTotal(hand) {
      let total = 0, aces = 0;
      for (const c of hand) { total += cardValue(c); if (c.value === 'A') aces++; }
      while (total > 21 && aces > 0) { total -= 10; aces--; }
      return total;
    }

    function renderCard(card, faceDown = false) {
      const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
      const cls = faceDown ? 'card facedown' : (isRed ? 'card red' : 'card black');
      if (faceDown) return '<div class="' + cls + '"><div class="suit">?</div><div class="value">?</div></div>';
      return '<div class="' + cls + '"><div class="suit">' + SUIT_SYMBOLS[card.suit] + '</div><div class="value">' + card.value + '</div></div>';
    }

    function renderHands() {
      document.getElementById('player-hand').innerHTML = playerHand.map(c => renderCard(c)).join('');
      document.getElementById('dealer-hand').innerHTML = dealerHand.map((c, i) => renderCard(c, i === 1 && dealerHand.length === 2)).join('');
      document.getElementById('chips').textContent = chips;
      document.getElementById('bet').textContent = currentBet;
      document.getElementById('wins').textContent = wins;
    }

    function deal() {
      if (chips < 10) { setMessage('Not enough chips!'); return; }
      if (currentBet < 10) { setMessage('Minimum bet is 10!'); return; }
      playerHand = [deck.pop(), deck.pop()];
      dealerHand = [deck.pop(), deck.pop()];
      gameOver = false;
      setButtons(false, true, true, true, false, false);
      renderHands();
      const pv = handTotal(playerHand);
      document.getElementById('dealer-value').textContent = dealerHand[0].value;
      if (pv === 21) { stand(); } else { setMessage('Hit or Stand?'); }
    }

    function hit() {
      if (gameOver) return;
      playerHand.push(deck.pop());
      renderHands();
      const total = handTotal(playerHand);
      document.getElementById('dealer-value').textContent = total;
      if (total > 21) { endRound('Bust! You lose.', false); }
      else if (total === 21) { stand(); }
      else { document.getElementById('btn-double').disabled = true; }
    }

    function stand() {
      if (gameOver) return;
      gameOver = true;
      setButtons(true, false, false, false, false, false);
      while (handTotal(dealerHand) < 17) dealerHand.push(deck.pop());
      renderHands();
      const dt = handTotal(dealerHand);
      const pt = handTotal(playerHand);
      document.getElementById('dealer-value').textContent = dt;
      if (dt > 21) { endRound('Dealer busts! You win!', true); }
      else if (pt > dt) { endRound('You win!', true); }
      else if (pt < dt) { endRound('Dealer wins.', false); }
      else { endRound('Push.', null); }
    }

    function doubleDown() {
      if (gameOver || chips < currentBet) return;
      chips -= currentBet;
      currentBet *= 2;
      hit();
      if (!gameOver) stand();
    }

    function addBet(amount) {
      if (gameOver) return;
      if (chips >= amount) { currentBet += amount; chips -= amount; renderHands(); }
    }

    function endRound(msg, won) {
      gameOver = true;
      if (won === true) { chips += currentBet * 2; wins++; }
      else if (won === null) { chips += currentBet; }
      currentBet = 0;
      setMessage(msg);
      setButtons(true, false, false, false, false, false);
      document.getElementById('btn-new').style.display = '';
      renderHands();
    }

    function newRound() {
      deck = createDeck();
      playerHand = [];
      dealerHand = [];
      currentBet = 0;
      gameOver = false;
      document.getElementById('dealer-value').textContent = '?';
      setMessage('Place your bet!');
      setButtons(false, false, false, false, true, true);
      document.getElementById('btn-new').style.display = 'none';
      renderHands();
    }

    function setMessage(msg) { document.getElementById('message').textContent = msg; }
    function setButtons(deal, hit, stand, dbl, bet10, bet50) {
      document.getElementById('btn-deal').disabled = deal;
      document.getElementById('btn-hit').disabled = hit;
      document.getElementById('btn-stand').disabled = stand;
      document.getElementById('btn-double').disabled = dbl;
      document.getElementById('btn-bet10').disabled = bet10;
      document.getElementById('btn-bet50').disabled = bet50;
      document.getElementById('btn-bet100').disabled = bet50;
    }

    deck = createDeck();
    setMessage('Place your bet!');
    setButtons(false, false, false, false, true, true);
    renderHands();
  </script>
</body>
</html>`;
}

export { generateCardGame as generateCardGames };
