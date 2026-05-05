/**
 * Neuroscience Generator — produces neuroscience research designs
 * Brain mapping, neural interfaces, cognitive studies
 * $0.3T market: Neuroscience
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

interface NeuroscienceParams {
  studyType: 'brain_mapping' | 'neural_interface' | 'cognitive' | 'clinical';
  subjects: number;
  duration: number; // weeks
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateNeuroscience(seed: Seed, outputPath: string): Promise<{ filePath: string; dataPath: string; studyType: string }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);

  const config = {
    neuroscience: { studyType: params.studyType, subjects: params.subjects, duration: params.duration, quality: params.quality },
    methodology: generateMethodology(params, rng),
    equipment: { fmri: rng.nextF64() > 0.5, eeg: rng.nextF64() > 0.3, meeg: rng.nextF64() > 0.7, bci: params.studyType === 'neural_interface' },
    findings: { significance: rng.nextF64(), effectSize: rng.nextF64() * 2, pValue: rng.nextF64() * 0.05 }
  };

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const jsonPath = outputPath.replace(/\.json$/, '_neuroscience.json');
  fs.writeFileSync(jsonPath, JSON.stringify(config, null, 2));

  const dataPath = outputPath.replace(/\.json$/, '_data.csv');
  fs.writeFileSync(dataPath, generateCSV(params, rng));

  return { filePath: jsonPath, dataPath, studyType: params.studyType };
}

function generateMethodology(params: NeuroscienceParams, rng: Xoshiro256StarStar): any {
  return {
    paradigm: ['task_based', 'resting_state', 'stimulus_response'][rng.nextInt(0, 2)],
    metrics: ['activation', 'connectivity', 'spectral_power', 'erps'].slice(0, Math.floor(rng.nextF64() * 4) + 1),
    preprocessing: ['filtering', 'artifact_removal', 'normalization'].slice(0, Math.floor(rng.nextF64() * 3) + 1)
  };
}

function generateCSV(params: NeuroscienceParams, rng: Xoshiro256StarStar): string {
  const lines = ['Subject,Condition,Activation,pValue'];
  for (let i = 0; i < params.subjects; i++) {
    lines.push(`${i+1},${['A','B','C'][rng.nextInt(0,2)]},${rng.nextF64()},${rng.nextF64()*0.05}`);
  }
  return lines.join('\n');
}

function extractParams(seed: Seed, rng: Xoshiro256StarStar): NeuroscienceParams {
  const quality = seed.genes?.quality?.value || 'medium';
  return {
    studyType: seed.genes?.studyType?.value || ['brain_mapping', 'neural_interface', 'cognitive', 'clinical'][rng.nextInt(0, 3)],
    subjects: Math.floor(((seed.genes?.subjects?.value as number || rng.nextF64()) * 990) + 10),
    duration: Math.floor(((seed.genes?.duration?.value as number || rng.nextF64()) * 48) + 4),
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
