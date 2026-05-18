/**
 * Choreography Generator — produces dance motion data
 * Generates BVH motion files with proper skeleton hierarchy and keyframes
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

// ─── BVH Skeleton Definition ─────────────────────────────────────────────────

const BVH_HIERARCHY = `HIERARCHY
ROOT Hips
{
  OFFSET 0.00 0.00 0.00
  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation
  JOINT Spine
  {
    OFFSET 0.00 10.00 0.00
    CHANNELS 3 Zrotation Xrotation Yrotation
    JOINT Chest
    {
      OFFSET 0.00 8.00 0.00
      CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT Neck
      {
        OFFSET 0.00 5.00 0.00
        CHANNELS 3 Zrotation Xrotation Yrotation
        JOINT Head
        {
          OFFSET 0.00 4.00 0.00
          CHANNELS 3 Zrotation Xrotation Yrotation
          End Site
          {
            OFFSET 0.00 2.00 0.00
          }
        }
      }
      JOINT LeftCollar
      {
        OFFSET 1.50 3.00 0.00
        CHANNELS 3 Zrotation Xrotation Yrotation
        JOINT LeftShoulder
        {
          OFFSET -1.00 0.00 0.00
          CHANNELS 3 Zrotation Xrotation Yrotation
          JOINT LeftElbow
          {
            OFFSET -5.00 0.00 0.00
            CHANNELS 3 Zrotation Xrotation Yrotation
            JOINT LeftWrist
            {
              OFFSET -4.00 0.00 0.00
              CHANNELS 3 Zrotation Xrotation Yrotation
              End Site
              {
                OFFSET -1.00 0.00 0.00
              }
            }
          }
        }
      }
      JOINT RightCollar
      {
        OFFSET -1.50 3.00 0.00
        CHANNELS 3 Zrotation Xrotation Yrotation
        JOINT RightShoulder
        {
          OFFSET 1.00 0.00 0.00
          CHANNELS 3 Zrotation Xrotation Yrotation
          JOINT RightElbow
          {
            OFFSET 5.00 0.00 0.00
            CHANNELS 3 Zrotation Xrotation Yrotation
            JOINT RightWrist
            {
              OFFSET 4.00 0.00 0.00
              CHANNELS 3 Zrotation Xrotation Yrotation
              End Site
              {
                OFFSET 1.00 0.00 0.00
              }
            }
          }
        }
      }
    }
  }
  JOINT LeftHip
  {
    OFFSET 3.00 -5.00 0.00
    CHANNELS 3 Zrotation Xrotation Yrotation
    JOINT LeftKnee
    {
      OFFSET 0.00 -10.00 0.00
      CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT LeftAnkle
      {
        OFFSET 0.00 -10.00 0.00
        CHANNELS 3 Zrotation Xrotation Yrotation
        End Site
        {
          OFFSET 0.00 -2.00 0.00
        }
      }
    }
  }
  JOINT RightHip
  {
    OFFSET -3.00 -5.00 0.00
    CHANNELS 3 Zrotation Xrotation Yrotation
    JOINT RightKnee
    {
      OFFSET 0.00 -10.00 0.00
      CHANNELS 3 Zrotation Xrotation Yrotation
      JOINT RightAnkle
      {
        OFFSET 0.00 -10.00 0.00
        CHANNELS 3 Zrotation Xrotation Yrotation
        End Site
        {
          OFFSET 0.00 -2.00 0.00
        }
      }
    }
  }
}`;

// ─── Motion Generation ──────────────────────────────────────────────────────
// Each joint has 3 rotation channels (Zrot, Xrot, Yrot). Hips also have 3 position channels.

const JOINTS = ['Hips', 'Spine', 'Chest', 'Neck', 'Head',
  'LeftCollar', 'LeftShoulder', 'LeftElbow', 'LeftWrist',
  'RightCollar', 'RightShoulder', 'RightElbow', 'RightWrist',
  'LeftHip', 'LeftKnee', 'LeftAnkle',
  'RightHip', 'RightKnee', 'RightAnkle'];

const CHANNELS_PER_JOINT: Record<string, number> = {
  Hips: 6, // Xpos, Ypos, Zpos, Zrot, Xrot, Yrot
  LeftCollar: 3, RightCollar: 3, LeftHip: 3, RightHip: 3,
};
for (const j of JOINTS) { if (!(j in CHANNELS_PER_JOINT)) CHANNELS_PER_JOINT[j] = 3; }

function generateMotionData(params: ChoreographyParams, rng: Xoshiro256StarStar): string {
  const frameRate = 30;
  const totalFrames = Math.floor(params.duration * frameRate);
  const frames: string[] = [];

  // Style-based motion parameters
  const styleMotion = getStyleMotion(params.style);
  const baseAmplitude = styleMotion.amplitude * (0.5 + params.complexity * 0.5);
  const baseSpeed = params.tempo / 120;

  for (let frame = 0; frame < totalFrames; frame++) {
    const t = frame / frameRate;
    const frameValues: number[] = [];

    for (const joint of JOINTS) {
      const channels = CHANNELS_PER_JOINT[joint] || 3;

      if (joint === 'Hips') {
        // Hips: position + rotation
        const swayX = Math.sin(t * baseSpeed * Math.PI * 2) * baseAmplitude * 2;
        const swayZ = Math.cos(t * baseSpeed * Math.PI * 2) * baseAmplitude;
        const bounceY = Math.abs(Math.sin(t * baseSpeed * Math.PI * 4)) * baseAmplitude * 3;
        frameValues.push(
          swayX,                                    // Xposition
          bounceY,                                  // Yposition
          swayZ,                                    // Zposition
          styleMotion.hipZrot(t, rng),               // Zrotation
          styleMotion.hipXrot(t, rng) + swayX * 0.1, // Xrotation
          styleMotion.hipYrot(t, rng),               // Yrotation
        );
      } else {
        // Standard joints: rotation only
        const rot = generateJointRotation(joint, t, params, rng, styleMotion, baseAmplitude, baseSpeed);
        frameValues.push(rot.z, rot.x, rot.y);
      }
    }

    frames.push(frameValues.map(v => v.toFixed(4)).join(' '));
  }

  const motionHeader = `MOTION
Frames: ${totalFrames}
Frame Time: ${(1 / frameRate).toFixed(6)}
`;

  return motionHeader + frames.join('\n');
}

interface JointRotation { x: number; y: number; z: number; }

function generateJointRotation(
  joint: string, t: number, params: ChoreographyParams,
  rng: Xoshiro256StarStar, style: ReturnType<typeof getStyleMotion>,
  amplitude: number, speed: number
): JointRotation {
  const phase = rng.nextF64() * Math.PI * 2;
  const freq = speed * (0.5 + (rng.nextF64() - 0.5) * 0.5);

  // Per-joint motion patterns
  switch (joint) {
    case 'Spine':
      return { x: Math.sin(t * freq * 2 + phase) * amplitude * 3, y: 0, z: Math.cos(t * freq + phase) * amplitude * 2 };
    case 'Chest':
      return { x: Math.sin(t * freq * 2 + phase + 0.5) * amplitude * 2, y: 0, z: Math.cos(t * freq + phase) * amplitude };
    case 'Neck':
      return { x: Math.sin(t * freq * 3 + phase) * amplitude, y: 0, z: Math.cos(t * freq * 2 + phase) * amplitude * 0.5 };
    case 'Head':
      return { x: Math.sin(t * freq * 2 + phase + 1) * amplitude * 0.5, y: Math.sin(t * freq * 0.5) * amplitude, z: 0 };
    case 'LeftShoulder':
    case 'RightShoulder': {
      const dir = joint === 'LeftShoulder' ? 1 : -1;
      return {
        x: Math.sin(t * freq * 2 + phase) * amplitude * 10 * dir,
        y: Math.cos(t * freq + phase) * amplitude * 5 * dir,
        z: Math.cos(t * freq * 2 + phase + 1) * amplitude * 3,
      };
    }
    case 'LeftElbow':
    case 'RightElbow': {
      const dir = joint === 'LeftElbow' ? 1 : -1;
      return {
        x: Math.abs(Math.sin(t * freq * 3 + phase)) * amplitude * 15 * dir,
        y: Math.cos(t * freq * 2 + phase) * amplitude * 5,
        z: 0,
      };
    }
    case 'LeftWrist':
    case 'RightWrist': {
      const dir = joint === 'LeftWrist' ? 1 : -1;
      return {
        x: Math.sin(t * freq * 4 + phase) * amplitude * 8 * dir,
        y: Math.sin(t * freq * 3 + phase + 1) * amplitude * 5,
        z: Math.cos(t * freq * 2 + phase) * amplitude * 3,
      };
    }
    case 'LeftHip':
    case 'RightHip': {
      const dir = joint === 'LeftHip' ? 1 : -1;
      return {
        x: Math.sin(t * freq * 2 + phase) * amplitude * 5 * dir,
        y: Math.sin(t * freq * 0.8) * amplitude * 2,
        z: Math.cos(t * freq + phase) * amplitude * 3,
      };
    }
    case 'LeftKnee':
    case 'RightKnee': {
      const dir = joint === 'LeftKnee' ? 1 : -1;
      return {
        x: Math.abs(Math.sin(t * freq * 3 + phase)) * amplitude * 15 * dir,
        y: 0,
        z: Math.cos(t * freq * 2 + phase) * amplitude * 2,
      };
    }
    case 'LeftAnkle':
    case 'RightAnkle': {
      const dir = joint === 'LeftAnkle' ? 1 : -1;
      return {
        x: Math.sin(t * freq * 3 + phase + 0.5) * amplitude * 5 * dir,
        y: Math.sin(t * freq * 2) * amplitude * 3,
        z: Math.cos(t * freq + phase + 1) * amplitude * 2,
      };
    }
    default:
      return { x: Math.sin(t * freq + phase) * amplitude, y: Math.cos(t * freq + phase) * amplitude, z: 0 };
  }
}

function getStyleMotion(style: string) {
  const styles: Record<string, { amplitude: number; hipZrot: (t: number, rng: Xoshiro256StarStar) => number; hipXrot: (t: number, rng: Xoshiro256StarStar) => number; hipYrot: (t: number, rng: Xoshiro256StarStar) => number }> = {
    ballet: {
      amplitude: 3,
      hipZrot: (t) => Math.sin(t * 0.5) * 5,
      hipXrot: (t) => Math.sin(t * 0.3) * 3,
      hipYrot: (t) => Math.cos(t * 0.4) * 2,
    },
    hiphop: {
      amplitude: 6,
      hipZrot: (t) => Math.sin(t * 2) * 8 + Math.sin(t * 4) * 4,
      hipXrot: (t) => Math.sin(t * 1.5) * 5,
      hipYrot: (t) => Math.cos(t * 2.5) * 6,
    },
    salsa: {
      amplitude: 4,
      hipZrot: (t) => Math.sin(t * 2.5) * 10,
      hipXrot: (t) => Math.sin(t * 1.8) * 4,
      hipYrot: (t) => Math.cos(t * 2) * 5,
    },
    contemporary: {
      amplitude: 5,
      hipZrot: (t) => Math.sin(t * 0.8) * 6,
      hipXrot: (t) => Math.sin(t * 0.5) * 8,
      hipYrot: (t) => Math.cos(t * 0.6) * 4,
    },
    jazz: {
      amplitude: 4.5,
      hipZrot: (t) => Math.sin(t * 1.5) * 7 + Math.sin(t * 3) * 3,
      hipXrot: (t) => Math.sin(t * 1.2) * 4,
      hipYrot: (t) => Math.cos(t * 1.8) * 5,
    },
  };
  return styles[style] || styles.ballet;
}

export async function generateChoreography(seed: Seed, outputPath: string): Promise<{ filePath: string; moveCount: number }> {
  const rng = rngFromHash(seed.$hash || '');
  const params = extractParams(seed, rng);
  const quality = (seed as any)._quality || 'full';
  const isRich = quality !== 'metadata-only';

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Always generate JSON sequence
  const sequence = generateDanceSequence(params, rng);
  const jsonPath = outputPath.replace(/\.gltf$/, '.json');
  fs.writeFileSync(jsonPath, JSON.stringify(sequence, null, 2));

  // Generate BVH at full quality
  if (isRich) {
    const bvhPath = outputPath.replace(/\.gltf$/, '.bvh');
    const bvh = BVH_HIERARCHY + '\n' + generateMotionData(params, rng);
    fs.writeFileSync(bvhPath, bvh);
  }

  return { filePath: jsonPath, moveCount: sequence.moves.length };
}

function generateDanceSequence(params: ChoreographyParams, rng: Xoshiro256StarStar): any {
  const moveCount = Math.floor(params.complexity * 20) + 5;
  const moves = [];
  const possibleMoves = ['spin', 'jump', 'step', 'turn', 'pose', 'leap', 'glide', 'kick'];

  for (let i = 0; i < moveCount; i++) {
    const time = (i / params.tempo) * 60;
    moves.push({
      time: +time.toFixed(2),
      move: possibleMoves[rng.nextInt(0, possibleMoves.length - 1)],
      duration: +(60 / params.tempo * 0.5).toFixed(2),
      intensity: rng.nextF64(),
    });
  }

  return {
    style: params.style,
    tempo: params.tempo,
    complexity: params.complexity,
    duration: params.duration,
    moves,
    beatCount: Math.floor(params.duration * params.tempo / 60),
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
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium',
  };
}
