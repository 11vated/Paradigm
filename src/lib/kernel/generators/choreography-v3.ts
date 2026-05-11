/**
 * Choreography Generator V3 — Dance with Motion Capture
 * Features: Motion sequences, timing, formations, style
 * Export: JSON choreography, BVH motion capture, interactive HTML
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

interface ChoreographyParams {
  style: 'ballet' | 'hip-hop' | 'contemporary' | 'jazz' | 'folk' | 'freestyle';
  dancers: number;
  duration: number;
  complexity: 'simple' | 'medium' | 'complex';
  formation: 'line' | 'circle' | 'scattered' | 'paired';
}

interface Motion {
  name: string;
  duration: number;
  joints: Record<string, { rotation: [number, number, number]; position: [number, number, number] }>;
}

interface Sequence {
  name: string;
  motions: Motion[];
  formation: string;
  startTime: number;
  endTime: number;
}

export async function generateChoreographyV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  bvhPath: string;
  htmlPath: string;
  sequenceCount: number;
  motionCount: number;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'choreography-default');
  const params = extractChoreographyParams(seed, rng);
  
  // Generate motion library
  const motionLibrary = generateMotionLibrary(params, rng);
  
  // Generate sequences
  const sequences = generateSequences(params, motionLibrary, rng);
  
  // Generate formations
  const formations = generateFormations(params, sequences, rng);
  
  // Export
  const jsonPath = await exportChoreographyJSON({ params, sequences, formations, motionLibrary }, outputPath, seed);
  const bvhPath = await exportBVH(sequences, outputPath, seed);
  const htmlPath = await exportChoreographyHTML(sequences, formations, outputPath, seed);
  
  const totalMotions = sequences.reduce((sum, s) => sum + s.motions.length, 0);
  
  return {
    jsonPath,
    bvhPath,
    htmlPath,
    sequenceCount: sequences.length,
    motionCount: totalMotions
  };
}

function extractChoreographyParams(seed: Seed, rng: Xoshiro256StarStar): ChoreographyParams {
  const styles = ['ballet', 'hip-hop', 'contemporary', 'jazz', 'folk', 'freestyle'] as const;
  const complexities = ['simple', 'medium', 'complex'] as const;
  const formations = ['line', 'circle', 'scattered', 'paired'] as const;
  
  return {
    style: styles[Math.floor(rng.nextF64() * styles.length)],
    dancers: 1 + Math.floor(rng.nextF64() * 15),
    duration: 30 + Math.floor(rng.nextF64() * 270),
    complexity: complexities[Math.floor(rng.nextF64() * complexities.length)],
    formation: formations[Math.floor(rng.nextF64() * formations.length)]
  };
}

function generateMotionLibrary(params: ChoreographyParams, rng: Xoshiro256StarStar): Motion[] {
  const motions: Motion[] = [];
  const motionNames = [
    'step', 'leap', 'turn', 'jump', 'spin', 'slide', 'reach', 'bend',
    'extend', 'contract', 'twist', 'lift', 'drop', 'sweep', 'pose'
  ];
  
  const numMotions = 8 + Math.floor(rng.nextF64() * 12);
  
  for (let i = 0; i < numMotions; i++) {
    const name = motionNames[Math.floor(rng.nextF64() * motionNames.length)];
    const joints: Motion['joints'] = {};
    const jointNames = ['hip', 'knee', 'ankle', 'spine', 'shoulder', 'elbow', 'wrist', 'neck', 'head'];
    
    jointNames.forEach(joint => {
      joints[joint] = {
        rotation: [
          (rng.nextF64() - 0.5) * Math.PI,
          (rng.nextF64() - 0.5) * Math.PI,
          (rng.nextF64() - 0.5) * Math.PI
        ],
        position: [
          (rng.nextF64() - 0.5) * 0.5,
          (rng.nextF64() - 0.5) * 0.5,
          (rng.nextF64() - 0.5) * 0.5
        ]
      };
    });
    
    motions.push({
      name: `${name}_${i}`,
      duration: 0.5 + rng.nextF64() * 2,
      joints
    });
  }
  
  return motions;
}

function generateSequences(params: ChoreographyParams, motionLibrary: Motion[], rng: Xoshiro256StarStar): Sequence[] {
  const sequences: Sequence[] = [];
  const numSequences = 3 + Math.floor(rng.nextF64() * 5);
  let currentTime = 0;
  
  for (let s = 0; s < numSequences; s++) {
    const numMotions = 3 + Math.floor(rng.nextF64() * 5);
    const motions: Motion[] = [];
    let sequenceDuration = 0;
    
    for (let m = 0; m < numMotions; m++) {
      const motion = motionLibrary[Math.floor(rng.nextF64() * motionLibrary.length)];
      motions.push(motion);
      sequenceDuration += motion.duration;
    }
    
    sequences.push({
      name: `sequence_${s + 1}`,
      motions,
      formation: params.formation,
      startTime: currentTime,
      endTime: currentTime + sequenceDuration
    });
    
    currentTime += sequenceDuration;
  }
  
  return sequences;
}

function generateFormations(params: ChoreographyParams, sequences: Sequence[], rng: Xoshiro256StarStar): any[] {
  const formations: any[] = [];
  
  sequences.forEach(seq => {
    const positions: [number, number][] = [];
    
    for (let d = 0; d < params.dancers; d++) {
      if (params.formation === 'line') {
        positions.push([d * 0.5 - (params.dancers * 0.25), 0]);
      } else if (params.formation === 'circle') {
        const angle = (d / params.dancers) * Math.PI * 2;
        positions.push([Math.cos(angle), Math.sin(angle)]);
      } else if (params.formation === 'scattered') {
        positions.push([(rng.nextF64() - 0.5) * 4, (rng.nextF64() - 0.5) * 4]);
      } else {
        positions.push([Math.floor(d / 2) * 0.5 - 0.25, (d % 2) * 0.5]);
      }
    }
    
    formations.push({
      sequence: seq.name,
      positions,
      transitions: positions.map((_, i) => ({
        from: positions[i],
        to: positions[(i + 1) % positions.length],
        duration: 0.5
      }))
    });
  });
  
  return formations;
}

async function exportChoreographyJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `choreography_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportBVH(sequences: Sequence[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `choreography_${seed.$hash || 'unknown'}.bvh`;
  const filePath = path.join(outputPath, filename);
  
  const bvh = `HIERARCHY
ROOT Hips
{
  OFFSET 0.0 0.0 0.0
  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
  SITE Head
  {
    OFFSET 0.0 1.5 0.0
    CHANNELS 0
  }
}
MOTION
Frames: ${Math.floor(sequences.reduce((sum, s) => sum + s.motions.length, 0) * 30)}
Frame Time: 0.033333
`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, bvh);
  return filePath;
}

async function exportChoreographyHTML(sequences: Sequence[], formations: any[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `choreography_${seed.$hash || 'unknown'}.html`;
  const filePath = path.join(outputPath, filename);
  
  const html = `<!DOCTYPE html><html><head><title>Choreography - ${seed.$hash}</title>
<style>body{font-family:system-ui;padding:20px;background:#1a1a1a;color:#fff}
.sequence{background:#2a2a2a;padding:16px;margin:8px 0;border-radius:8px}
.motion{display:inline-block;padding:4px 8px;margin:4px;background:#3b82f6;border-radius:4px}</style>
</head><body><h1>Choreography</h1>
${sequences.map(s => `<div class="sequence"><h3>${s.name}</h3>
<p>Time: ${s.startTime.toFixed(1)}s - ${s.endTime.toFixed(1)}s | Formation: ${s.formation}</p>
${s.motions.map(m => `<span class="motion">${m.name} (${m.duration.toFixed(1)}s)</span>`).join('')}
</div>`).join('')}
<h2>Formations</h2>
${formations.map(f => `<div><strong>${f.sequence}</strong>: ${f.positions.length} dancers</div>`).join('')}
</body></html>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, html);
  return filePath;
}
