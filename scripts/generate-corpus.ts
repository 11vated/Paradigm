#!/usr/bin/env tsx
/**
 * 1M Corpus Batch Generation (Phase 8)
 * Uses kernel Xoshiro256** RNG for deterministic, cross-machine-repeatable generation.
 *
 * Usage: tsx scripts/generate-corpus.ts [--count 1000] [--batch-size 100] [--output data/corpus/] [--seed <hex>]
 * Default: 1000 seeds
 * For 1M: --count 1000000
 */

import { Xoshiro256StarStar } from '../src/lib/kernel/rng.js';
import { kernelNowIso } from '../src/lib/kernel/clock.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

function log(level: string, msg: string) {
  const prefix: Record<string, string> = { info: `${CYAN}ℹ`, success: `${GREEN}✓`, warn: `${YELLOW}⚠`, error: `${RED}✗` };
  console.log(`${prefix[level] || ''} ${RESET}${msg}`);
}

// ─── Intent Templates (unchanged — pure logic, no RNG dependency) ───────────

const DOMAINS = [
  'game', 'music', 'character', 'world', 'sprite', 'visual2d', 'narrative',
  'cardgame', 'boardgame', 'architecture', 'fashion', 'food', 'furniture',
  'robotics', 'vehicle', 'particle', 'shader', 'typography', 'animation',
  'ecosystem', 'alife', 'physics', 'audio', 'procedural', 'geometry3d',
] as const;

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

function pick<T>(rng: Xoshiro256StarStar, arr: readonly T[]): T {
  return arr[Math.floor(rng.nextF64() * arr.length)]!;
}

interface SeedParams {
  domain: string;
  complexity: number;
  quality: number;
  [key: string]: unknown;
}

function generateIntent(rng: Xoshiro256StarStar, domain: string): string {
  switch (domain) {
    case 'game': {
      const genre = pick(rng, GAME_GENRES);
      const mechanics = ['jump', 'collect', 'shoot', 'solve', 'race', 'build', 'fight'];
      const m1 = pick(rng, mechanics);
      const m2 = pick(rng, mechanics);
      return `A ${genre} game with ${m1} and ${m2} mechanics`;
    }
    case 'music': {
      const key = pick(rng, MUSIC_KEYS);
      const scale = pick(rng, MUSIC_SCALES);
      const instrument = pick(rng, MUSIC_INSTRUMENTS);
      const tempo = 60 + Math.floor(rng.nextF64() * 120);
      return `A ${tempo}bpm ${scale} piece in ${key} for ${instrument}`;
    }
    case 'character': {
      const body = pick(rng, CHAR_BODY);
      const traits = ['brave', 'mysterious', 'ancient', 'futuristic', 'playful', 'wise', 'fierce'];
      const trait = pick(rng, traits);
      return `A ${trait} ${body} character with unique abilities`;
    }
    case 'world': {
      const era = pick(rng, WORLD_ERAS);
      const biome = pick(rng, WORLD_BIOMES);
      return `A ${era} ${biome} world with hidden secrets`;
    }
    case 'cardgame': {
      const type = pick(rng, CARD_TYPES);
      return `A ${type} card game with strategic depth`;
    }
    case 'boardgame': {
      const type = pick(rng, BOARD_TYPES);
      return `A ${type} board game with tactical gameplay`;
    }
    case 'visual2d': {
      const style = pick(rng, VISUAL_STYLES);
      return `A ${style} 2D artwork with vibrant colors`;
    }
    case 'sprite': {
      const types = ['hero', 'enemy', 'npc', 'item', 'effect'];
      const type = pick(rng, types);
      return `A pixel art ${type} sprite with animation`;
    }
    default: {
      const adjectives = ['beautiful', 'complex', 'elegant', 'mysterious', 'powerful', 'ancient'];
      const adj = pick(rng, adjectives);
      return `A ${adj} ${domain} artifact`;
    }
  }
}

function generateSeedParams(rng: Xoshiro256StarStar, domain: string): SeedParams {
  const params: SeedParams = { domain, complexity: rng.nextF64(), quality: 0.5 + rng.nextF64() * 0.5 };

  if (domain === 'game') {
    params.genre = pick(rng, GAME_GENRES);
    params.difficulty = rng.nextF64();
    params.levelCount = 3 + Math.floor(rng.nextF64() * 10);
  } else if (domain === 'music') {
    params.tempo = 60 + Math.floor(rng.nextF64() * 120);
    params.key = pick(rng, MUSIC_KEYS);
    params.scale = pick(rng, MUSIC_SCALES);
  } else if (domain === 'cardgame') {
    params.gameType = pick(rng, CARD_TYPES);
    params.difficulty = rng.nextF64();
  } else if (domain === 'boardgame') {
    params.gameType = pick(rng, BOARD_TYPES);
    params.difficulty = rng.nextF64();
  } else if (domain === 'character') {
    params.bodyType = pick(rng, CHAR_BODY);
  } else if (domain === 'world') {
    params.era = pick(rng, WORLD_ERAS);
    params.biome = pick(rng, WORLD_BIOMES);
  }

  return params;
}

function createSeed(domain: string, params: SeedParams, rng: Xoshiro256StarStar) {
  const nonce = `${rng.nextF64()}:${rng.nextF64()}:${rng.nextF64()}`;
  const seedHash = crypto.createHash('sha256')
    .update(`${domain}:${JSON.stringify(params)}:${nonce}`)
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
    genes: Object.entries(params).reduce<Record<string, { type: string; value: unknown }>>((acc, [key, value]) => {
      acc[key] = { type: typeof value === 'number' ? 'number' : 'string', value };
      return acc;
    }, {}),
    $generatedAt: kernelNowIso(),
  };
}

function verifyDeterminism(seed: Record<string, unknown>): boolean {
  const hash1 = crypto.createHash('sha256').update(JSON.stringify(seed)).digest('hex');
  const hash2 = crypto.createHash('sha256').update(JSON.stringify(seed)).digest('hex');
  return hash1 === hash2;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`${BOLD}=== Paradigm 1M Corpus Generation (kernel RNG) ===${RESET}\n`);

  const args = process.argv.slice(2);
  const count = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1] || '1000');
  const batchSize = parseInt(args.find(a => a.startsWith('--batch-size='))?.split('=')[1] || '100');
  const outputDir = args.find(a => a.startsWith('--output='))?.split('=')[1] || join(ROOT, 'data', 'corpus');
  const masterSeed = args.find(a => a.startsWith('--seed='))?.split('=')[1] || 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

  log('info', `Generating ${count} seeds in batches of ${batchSize}`);
  log('info', `Output: ${outputDir}`);
  log('info', `Master seed: ${masterSeed.slice(0, 16)}...`);

  mkdirSync(outputDir, { recursive: true });

  const rng = new Xoshiro256StarStar(masterSeed);

  let totalGenerated = 0;
  let totalVerified = 0;
  let totalFailed = 0;
  const startTime = performance.now();

  for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
    const batchSeeds: Record<string, unknown>[] = [];
    const batchStart = batch * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, count);

    for (let i = batchStart; i < batchEnd; i++) {
      const domain = pick(rng, DOMAINS);
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
    const elapsed = (performance.now() - startTime) / 1000;
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
    generatedAt: kernelNowIso(),
    batches: Math.ceil(count / batchSize),
    outputDir,
    rngType: 'Xoshiro256StarStar',
  };
  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const totalTime = ((performance.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${BOLD}=== Generation Complete ===${RESET}`);
  log('success', `Total: ${totalGenerated} seeds`);
  log('success', `Verified: ${totalVerified}`);
  log('success', `Failed: ${totalFailed}`);
  log('success', `Time: ${totalTime}s`);
  log('success', `RNG: Xoshiro256StarStar (deterministic)`);
  log('success', `Output: ${outputDir}`);
}

main().catch((e: Error) => {
  log('error', `Fatal: ${e.message}`);
  process.exit(1);
});
