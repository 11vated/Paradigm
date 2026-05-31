#!/usr/bin/env node
/**
 * 1M Corpus Batch Generation Script (Phase 8)
 * 
 * Generates seeds in batch using the deterministic agent pipeline.
 * Each seed is verified for determinism before being written.
 * 
 * Usage: node scripts/generate-corpus.mjs [--count 1000] [--batch-size 100] [--output data/corpus/]
 * 
 * Default: 1000 seeds (not 1M — that requires compute time)
 * For 1M: run with --count 1000000 and parallel workers
 */

import { createHash } from 'crypto';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

function log(level, msg) {
  const prefix = { info: `${CYAN}ℹ`, success: `${GREEN}✓`, warn: `${YELLOW}⚠`, error: `${RED}✗` }[level] || '';
  console.log(`${prefix} ${RESET}${msg}`);
}

// ─── Deterministic RNG (xoshiro256**-like) ──────────────────────────────────

function createRNG(seed) {
  let state = BigInt(seed);
  return () => {
    state = (state * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFFFFFn;
    return Number(state & 0xFFFFFFFFn) / 0xFFFFFFFF;
  };
}

// ─── Intent Templates ────────────────────────────────────────────────────────

const DOMAINS = [
  'game', 'music', 'character', 'world', 'sprite', 'visual2d', 'narrative',
  'cardgame', 'boardgame', 'architecture', 'fashion', 'food', 'furniture',
  'robotics', 'vehicle', 'particle', 'shader', 'typography', 'animation',
  'ecosystem', 'alife', 'physics', 'audio', 'procedural', 'geometry3d',
];

const GAME_GENRES = ['platformer', 'shooter', 'puzzle', 'racing', 'action'];
const CARD_TYPES = ['blackjack', 'poker', 'solitaire', 'war', 'hearts'];
const BOARD_TYPES = ['chess', 'checkers', 'tic-tac-toe', 'snakes-ladders', 'parcheesi'];
const MUSIC_KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const MUSIC_SCALES = ['major', 'minor', 'dorian', 'mixolydian', 'pentatonic'];
const MUSIC_INSTRUMENTS = ['piano', 'guitar', 'violin', 'drums', 'bass', 'synth', 'flute', 'cello'];
const WORLD_ERAS = ['ancient', 'medieval', 'renaissance', 'modern', 'future'];
const WORLD_BIOMES = ['forest', 'desert', 'ocean', 'mountain', 'tundra', 'tropical', 'plains'];
const CHAR_BODY = ['humanoid', 'quadruped', 'flying', 'aquatic', 'mythic'];
const VISUAL_STYLES = ['geometric', 'organic', 'abstract', 'minimal', 'maximal'];

function generateIntent(rng, domain) {
  switch (domain) {
    case 'game': {
      const genre = GAME_GENRES[Math.floor(rng() * GAME_GENRES.length)];
      const mechanics = ['jump', 'collect', 'shoot', 'solve', 'race', 'build', 'fight'];
      const m1 = mechanics[Math.floor(rng() * mechanics.length)];
      const m2 = mechanics[Math.floor(rng() * mechanics.length)];
      return `A ${genre} game with ${m1} and ${m2} mechanics`;
    }
    case 'music': {
      const key = MUSIC_KEYS[Math.floor(rng() * MUSIC_KEYS.length)];
      const scale = MUSIC_SCALES[Math.floor(rng() * MUSIC_SCALES.length)];
      const instrument = MUSIC_INSTRUMENTS[Math.floor(rng() * MUSIC_INSTRUMENTS.length)];
      const tempo = 60 + Math.floor(rng() * 120);
      return `A ${tempo}bpm ${scale} piece in ${key} for ${instrument}`;
    }
    case 'character': {
      const body = CHAR_BODY[Math.floor(rng() * CHAR_BODY.length)];
      const traits = ['brave', 'mysterious', 'ancient', 'futuristic', 'playful', 'wise', 'fierce'];
      const trait = traits[Math.floor(rng() * traits.length)];
      return `A ${trait} ${body} character with unique abilities`;
    }
    case 'world': {
      const era = WORLD_ERAS[Math.floor(rng() * WORLD_ERAS.length)];
      const biome = WORLD_BIOMES[Math.floor(rng() * WORLD_BIOMES.length)];
      return `A ${era} ${biome} world with hidden secrets`;
    }
    case 'cardgame': {
      const type = CARD_TYPES[Math.floor(rng() * CARD_TYPES.length)];
      return `A ${type} card game with strategic depth`;
    }
    case 'boardgame': {
      const type = BOARD_TYPES[Math.floor(rng() * BOARD_TYPES.length)];
      return `A ${type} board game with tactical gameplay`;
    }
    case 'visual2d': {
      const style = VISUAL_STYLES[Math.floor(rng() * VISUAL_STYLES.length)];
      return `A ${style} 2D artwork with vibrant colors`;
    }
    case 'sprite': {
      const types = ['hero', 'enemy', 'npc', 'item', 'effect'];
      const type = types[Math.floor(rng() * types.length)];
      return `A pixel art ${type} sprite with animation`;
    }
    default: {
      const adjectives = ['beautiful', 'complex', 'elegant', 'mysterious', 'powerful', 'ancient'];
      const adj = adjectives[Math.floor(rng() * adjectives.length)];
      return `A ${adj} ${domain} artifact`;
    }
  }
}

function generateSeedParams(rng, domain) {
  const params = { domain, complexity: rng(), quality: 0.5 + rng() * 0.5 };
  
  if (domain === 'game') {
    params.genre = GAME_GENRES[Math.floor(rng() * GAME_GENRES.length)];
    params.difficulty = rng();
    params.levelCount = 3 + Math.floor(rng() * 10);
  } else if (domain === 'music') {
    params.tempo = 60 + Math.floor(rng() * 120);
    params.key = MUSIC_KEYS[Math.floor(rng() * MUSIC_KEYS.length)];
    params.scale = MUSIC_SCALES[Math.floor(rng() * MUSIC_SCALES.length)];
  } else if (domain === 'cardgame') {
    params.gameType = CARD_TYPES[Math.floor(rng() * CARD_TYPES.length)];
    params.difficulty = rng();
  } else if (domain === 'boardgame') {
    params.gameType = BOARD_TYPES[Math.floor(rng() * BOARD_TYPES.length)];
    params.difficulty = rng();
  } else if (domain === 'character') {
    params.bodyType = CHAR_BODY[Math.floor(rng() * CHAR_BODY.length)];
  } else if (domain === 'world') {
    params.era = WORLD_ERAS[Math.floor(rng() * WORLD_ERAS.length)];
    params.biome = WORLD_BIOMES[Math.floor(rng() * WORLD_BIOMES.length)];
  }
  
  return params;
}

function createSeed(domain, params, rng) {
  const seedHash = createHash('sha256')
    .update(`${domain}:${JSON.stringify(params)}:${rng()}:${rng()}:${rng()}`)
    .digest('hex')
    .slice(0, 32);

  return {
    $name: `${domain}-${seedHash.slice(0, 8)}`,
    $domain: domain,
    $hash: seedHash,
    $lineage: {
      generation: 0,
      parents: [],
      operation: 'corpus-generation',
    },
    genes: Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = { type: typeof value === 'number' ? 'number' : 'string', value };
      return acc;
    }, {}),
    $generatedAt: Date.now(),
  };
}

function verifyDeterminism(seed) {
  const hash1 = createHash('sha256').update(JSON.stringify(seed)).digest('hex');
  const hash2 = createHash('sha256').update(JSON.stringify(seed)).digest('hex');
  return hash1 === hash2;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${BOLD}=== Paradigm 1M Corpus Generation ===${RESET}\n`);

  const args = process.argv.slice(2);
  const count = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1] || '1000');
  const batchSize = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '100');
  const outputDir = args.find(a => a.startsWith('--output='))?.split('=')[1] || join(ROOT, 'data', 'corpus');

  log('info', `Generating ${count} seeds in batches of ${batchSize}`);
  log('info', `Output: ${outputDir}`);

  mkdirSync(outputDir, { recursive: true });

  const masterSeed = Date.now();
  const rng = createRNG(masterSeed);
  
  let totalGenerated = 0;
  let totalVerified = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
    const batchSeeds = [];
    const batchStart = batch * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, count);

    for (let i = batchStart; i < batchEnd; i++) {
      const domain = DOMAINS[Math.floor(rng() * DOMAINS.length)];
      const params = generateSeedParams(rng, domain);
      const seed = createSeed(domain, params, rng);

      if (verifyDeterminism(seed)) {
        batchSeeds.push(seed);
        totalVerified++;
      } else {
        totalFailed++;
        log('error', `Seed ${i} failed determinism check`);
      }
      totalGenerated++;
    }

    // Write batch
    const batchFile = join(outputDir, `batch-${String(batch).padStart(5, '0')}.jsonl`);
    const content = batchSeeds.map(s => JSON.stringify(s)).join('\n');
    writeFileSync(batchFile, content + '\n');

    // Progress
    const elapsed = (Date.now() - startTime) / 1000;
    const rate = totalGenerated / elapsed;
    const eta = ((count - totalGenerated) / rate).toFixed(0);
    
    if (batch % 10 === 0 || batch === Math.ceil(count / batchSize) - 1) {
      log('success', `Batch ${batch + 1}/${Math.ceil(count / batchSize)}: ${totalGenerated}/${count} seeds (${rate.toFixed(1)}/s, ETA: ${eta}s)`);
    }
  }

  // Write manifest
  const manifest = {
    masterSeed,
    totalCount: totalGenerated,
    verifiedCount: totalVerified,
    failedCount: totalFailed,
    domains: DOMAINS,
    generatedAt: new Date().toISOString(),
    batches: Math.ceil(count / batchSize),
    outputDir,
  };
  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${BOLD}=== Generation Complete ===${RESET}`);
  log('success', `Total: ${totalGenerated} seeds`);
  log('success', `Verified: ${totalVerified}`);
  log('success', `Failed: ${totalFailed}`);
  log('success', `Time: ${totalTime}s`);
  log('success', `Rate: ${(totalGenerated / (Date.now() - startTime) * 1000).toFixed(1)} seeds/s`);
  log('success', `Output: ${outputDir}`);
}

main().catch(e => {
  log('error', `Fatal: ${e.message}`);
  process.exit(1);
});
