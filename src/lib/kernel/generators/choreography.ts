/**
 * Choreography Generator — produces dance patterns
 * Generates dance sequence as JSON
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface ChoreographyParams {
  style: string;
  tempo: number;
  complexity: number;
  duration: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateChoreography(seed: Seed, outputPath: string): Promise<{ filePath: string; moveCount: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  // Generate dance sequence
  const sequence = generateDanceSequence(params, rng);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write JSON
  const jsonPath = outputPath.replace(/\.gltf$/, '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(sequence, null, 2));

  return { filePath: jsonPath, moveCount: sequence.moves.length };
}

function generateDanceSequence(params: ChoreographyParams, rng: Xoshiro256StarStar): any {
  const moveCount = Math.floor(params.complexity * 20) + 5;
  const moves = [];

  const possibleMoves = ['spin', 'jump', 'step', 'turn', 'pose', 'leap', 'glide', 'kick'];

  for (let i = 0; i < moveCount; i++) {
    const time = (i / params.tempo) * 60; // seconds
    moves.push({
      time: time.toFixed(2),
      move: possibleMoves[rng.nextInt(0, possibleMoves.length - 1)],
      duration: (60 / params.tempo * 0.5).toFixed(2),
      intensity: rng.nextF64()
    });
  }

  return {
    style: params.style,
    tempo: params.tempo,
    complexity: params.complexity,
    duration: params.duration,
    moves,
    beatCount: Math.floor(params.duration * params.tempo / 60)
  };
}

function extractParams(seed: Seed, rng?: Xoshiro256StarStar): ChoreographyParams {
  const quality = seed.genes?.quality?.value || 'medium';
  let tempo = seed.genes?.tempo?.value || 0.5;
  if (typeof tempo === 'number' && tempo <= 1) tempo = 60 + tempo * 140;

  return {
    style: seed.genes?.style?.value || 'ballet',
    tempo: typeof tempo === 'number' ? tempo : 120,
    complexity: seed.genes?.complexity?.value || 0.5,
    duration: Math.max(10, Math.min(seed.genes?.duration?.value || 60, 300)),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
