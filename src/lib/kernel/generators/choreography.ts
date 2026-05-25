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

interface BVHJoint {
  name: string;
  offset: [number, number, number];
  channels: string[];
  children: BVHJoint[];
}

function buildBVHHierarchy(): BVHJoint {
  return {
    name: 'Hips',
    offset: [0, 0, 0],
    channels: ['Xposition', 'Yposition', 'Zposition', 'Zrotation', 'Xrotation', 'Yrotation'],
    children: [
      {
        name: 'Spine',
        offset: [0, 0.3, 0],
        channels: ['Zrotation', 'Xrotation', 'Yrotation'],
        children: [
          {
            name: 'Neck',
            offset: [0, 0.4, 0],
            channels: ['Zrotation', 'Xrotation', 'Yrotation'],
            children: [
              {
                name: 'Head',
                offset: [0, 0.2, 0],
                channels: ['Zrotation', 'Xrotation', 'Yrotation'],
                children: []
              }
            ]
          }
        ]
      },
      {
        name: 'LeftShoulder',
        offset: [0.15, 0.25, 0],
        channels: ['Zrotation', 'Xrotation', 'Yrotation'],
        children: [
          {
            name: 'LeftElbow',
            offset: [0.2, 0, 0],
            channels: ['Zrotation', 'Xrotation', 'Yrotation'],
            children: [
              {
                name: 'LeftWrist',
                offset: [0.15, 0, 0],
                channels: ['Zrotation', 'Xrotation', 'Yrotation'],
                children: []
              }
            ]
          }
        ]
      },
      {
        name: 'RightShoulder',
        offset: [-0.15, 0.25, 0],
        channels: ['Zrotation', 'Xrotation', 'Yrotation'],
        children: [
          {
            name: 'RightElbow',
            offset: [-0.2, 0, 0],
            channels: ['Zrotation', 'Xrotation', 'Yrotation'],
            children: [
              {
                name: 'RightWrist',
                offset: [-0.15, 0, 0],
                channels: ['Zrotation', 'Xrotation', 'Yrotation'],
                children: []
              }
            ]
          }
        ]
      },
      {
        name: 'LeftHip',
        offset: [0.1, -0.1, 0],
        channels: ['Zrotation', 'Xrotation', 'Yrotation'],
        children: [
          {
            name: 'LeftKnee',
            offset: [0, -0.3, 0],
            channels: ['Zrotation', 'Xrotation', 'Yrotation'],
            children: [
              {
                name: 'LeftAnkle',
                offset: [0, -0.3, 0],
                channels: ['Zrotation', 'Xrotation', 'Yrotation'],
                children: []
              }
            ]
          }
        ]
      },
      {
        name: 'RightHip',
        offset: [-0.1, -0.1, 0],
        channels: ['Zrotation', 'Xrotation', 'Yrotation'],
        children: [
          {
            name: 'RightKnee',
            offset: [0, -0.3, 0],
            channels: ['Zrotation', 'Xrotation', 'Yrotation'],
            children: [
              {
                name: 'RightAnkle',
                offset: [0, -0.3, 0],
                channels: ['Zrotation', 'Xrotation', 'Yrotation'],
                children: []
              }
            ]
          }
        ]
      }
    ]
  };
}

function flattenJointChannels(joint: BVHJoint): string[] {
  const channels: string[] = [...joint.channels];
  for (const child of joint.children) {
    channels.push(...flattenJointChannels(child));
  }
  return channels;
}

function formatBVHJoint(joint: BVHJoint, indent: string): string {
  let result = '';
  const isEnd = joint.children.length === 0 && joint.name.includes('End');
  
  if (isEnd) {
    result += `${indent}End Site\n`;
    result += `${indent}{\n`;
    result += `${indent}  OFFSET ${joint.offset.map(n => n.toFixed(4)).join(' ')}\n`;
    result += `${indent}}\n`;
  } else {
    result += `${indent}${joint.name === 'Hips' ? 'ROOT' : 'JOINT'} ${joint.name}\n`;
    result += `${indent}{\n`;
    result += `${indent}  OFFSET ${joint.offset.map(n => n.toFixed(4)).join(' ')}\n`;
    result += `${indent}  CHANNELS ${joint.channels.length} ${joint.channels.join(' ')}\n`;
    
    for (const child of joint.children) {
      result += formatBVHJoint(child, indent + '  ');
    }
    
    result += `${indent}}\n`;
  }
  
  return result;
}

function radToDeg(rad: number): number {
  return rad * (180 / Math.PI);
}

function generateMotionFrames(sequences: Sequence[], channelCount: number): number[][] {
  const frames: number[][] = [];
  const frameRate = 30;
  
  for (const seq of sequences) {
    for (const motion of seq.motions) {
      const frameCount = Math.max(1, Math.floor(motion.duration * frameRate));
      
      for (let f = 0; f < frameCount; f++) {
        const frame: number[] = [];
        
        const hipJoint = motion.joints['hip'];
        const kneeJoint = motion.joints['knee'];
        const ankleJoint = motion.joints['ankle'];
        const spineJoint = motion.joints['spine'];
        const shoulderJoint = motion.joints['shoulder'];
        const elbowJoint = motion.joints['elbow'];
        const wristJoint = motion.joints['wrist'];
        const neckJoint = motion.joints['neck'];
        const headJoint = motion.joints['head'];
        
        const t = f / frameCount;
        const lerp = (a: number, b: number) => a + (b - a) * t;
        
        frame.push(hipJoint ? hipJoint.position[0] : 0);
        frame.push(hipJoint ? hipJoint.position[1] : 1.0);
        frame.push(hipJoint ? hipJoint.position[2] : 0);
        frame.push(hipJoint ? radToDeg(hipJoint.rotation[2]) : 0);
        frame.push(hipJoint ? radToDeg(hipJoint.rotation[0]) : 0);
        frame.push(hipJoint ? radToDeg(hipJoint.rotation[1]) : 0);
        
        frame.push(spineJoint ? radToDeg(spineJoint.rotation[2]) : 0);
        frame.push(spineJoint ? radToDeg(spineJoint.rotation[0]) : 0);
        frame.push(spineJoint ? radToDeg(spineJoint.rotation[1]) : 0);
        
        frame.push(neckJoint ? radToDeg(neckJoint.rotation[2]) : 0);
        frame.push(neckJoint ? radToDeg(neckJoint.rotation[0]) : 0);
        frame.push(neckJoint ? radToDeg(neckJoint.rotation[1]) : 0);
        
        frame.push(headJoint ? radToDeg(headJoint.rotation[2]) : 0);
        frame.push(headJoint ? radToDeg(headJoint.rotation[0]) : 0);
        frame.push(headJoint ? radToDeg(headJoint.rotation[1]) : 0);
        
        frame.push(shoulderJoint ? radToDeg(shoulderJoint.rotation[2]) : 0);
        frame.push(shoulderJoint ? radToDeg(shoulderJoint.rotation[0]) : 0);
        frame.push(shoulderJoint ? radToDeg(shoulderJoint.rotation[1]) : 0);
        
        frame.push(elbowJoint ? radToDeg(elbowJoint.rotation[2]) : 0);
        frame.push(elbowJoint ? radToDeg(elbowJoint.rotation[0]) : 0);
        frame.push(elbowJoint ? radToDeg(elbowJoint.rotation[1]) : 0);
        
        frame.push(wristJoint ? radToDeg(wristJoint.rotation[2]) : 0);
        frame.push(wristJoint ? radToDeg(wristJoint.rotation[0]) : 0);
        frame.push(wristJoint ? radToDeg(wristJoint.rotation[1]) : 0);
        
        frame.push(shoulderJoint ? radToDeg(shoulderJoint.rotation[2]) * 0.8 : 0);
        frame.push(shoulderJoint ? radToDeg(shoulderJoint.rotation[0]) * 0.8 : 0);
        frame.push(shoulderJoint ? radToDeg(shoulderJoint.rotation[1]) * 0.8 : 0);
        
        frame.push(elbowJoint ? radToDeg(elbowJoint.rotation[2]) * 0.8 : 0);
        frame.push(elbowJoint ? radToDeg(elbowJoint.rotation[0]) * 0.8 : 0);
        frame.push(elbowJoint ? radToDeg(elbowJoint.rotation[1]) * 0.8 : 0);
        
        frame.push(wristJoint ? radToDeg(wristJoint.rotation[2]) * 0.8 : 0);
        frame.push(wristJoint ? radToDeg(wristJoint.rotation[0]) * 0.8 : 0);
        frame.push(wristJoint ? radToDeg(wristJoint.rotation[1]) * 0.8 : 0);
        
        frame.push(kneeJoint ? radToDeg(kneeJoint.rotation[2]) : 0);
        frame.push(kneeJoint ? radToDeg(kneeJoint.rotation[0]) : 0);
        frame.push(kneeJoint ? radToDeg(kneeJoint.rotation[1]) : 0);
        
        frame.push(ankleJoint ? radToDeg(ankleJoint.rotation[2]) : 0);
        frame.push(ankleJoint ? radToDeg(ankleJoint.rotation[0]) : 0);
        frame.push(ankleJoint ? radToDeg(ankleJoint.rotation[1]) : 0);
        
        frame.push(kneeJoint ? radToDeg(kneeJoint.rotation[2]) * 0.9 : 0);
        frame.push(kneeJoint ? radToDeg(kneeJoint.rotation[0]) * 0.9 : 0);
        frame.push(kneeJoint ? radToDeg(kneeJoint.rotation[1]) * 0.9 : 0);
        
        frame.push(ankleJoint ? radToDeg(ankleJoint.rotation[2]) * 0.9 : 0);
        frame.push(ankleJoint ? radToDeg(ankleJoint.rotation[0]) * 0.9 : 0);
        frame.push(ankleJoint ? radToDeg(ankleJoint.rotation[1]) * 0.9 : 0);
        
        while (frame.length < channelCount) {
          frame.push(0);
        }
        
        frames.push(frame);
      }
    }
  }
  
  return frames;
}

async function exportBVH(sequences: Sequence[], outputPath: string, seed: Seed): Promise<string> {
  const filename = `choreography_${seed.$hash || 'unknown'}.bvh`;
  const filePath = path.join(outputPath, filename);
  
  const hierarchy = buildBVHHierarchy();
  const allChannels = flattenJointChannels(hierarchy);
  const frames = generateMotionFrames(sequences, allChannels.length);
  const frameTime = 1 / 30;
  
  let bvh = 'HIERARCHY\n';
  bvh += formatBVHJoint(hierarchy, '');
  bvh += 'MOTION\n';
  bvh += `Frames: ${frames.length}\n`;
  bvh += `Frame Time: ${frameTime.toFixed(6)}\n`;
  
  for (const frame of frames) {
    bvh += frame.map(v => v.toFixed(6)).join(' ') + '\n';
  }
  
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

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateChoreographyV3 as generateChoreography };
