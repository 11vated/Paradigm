/**
 * Choreography Generator — produces motion capture data
 * Enhanced with BVH/CMU motion formats and interactive preview
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';

interface ChoreographyParams {
  style: string;
  tempo: number;
  complexity: number;
  duration: number;
  quality: 'low' | 'medium' | 'high' | 'photorealistic';
}

export async function generateChoreographyMotion(seed: Seed, outputPath: string): Promise<{ filePath: string; bvhPath: string; jsonPath: string; moveCount: number }> {
  const params = extractParams(seed);

  // Generate motion capture data
  const motionData = generateMotionData(params);

  // Generate BVH file (Biovision Hierarchy)
  const bvh = generateBVH(params, motionData);

  // Generate interactive HTML preview
  const html = generateInteractivePreview(params, motionData);

  // Ensure output directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write JSON metadata
  const jsonPath = outputPath.replace(/\.json$/, '_motion.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    choreography: {
      style: params.style,
      tempo: params.tempo,
      complexity: params.complexity,
      duration: params.duration,
      moveCount: motionData.moves.length,
      quality: params.quality
    },
    moves: motionData.moves,
    skeleton: motionData.skeleton
  }, null, 2));

  // Write BVH file
  const bvhPath = outputPath.replace(/\.json$/, '.bvh');
  fs.writeFileSync(bvhPath, bvh);

  // Write interactive HTML
  const htmlPath = outputPath.replace(/\.json$/, '_preview.html');
  fs.writeFileSync(htmlPath, html);

  return {
    filePath: jsonPath,
    bvhPath,
    jsonPath,
    moveCount: motionData.moves.length
  };
}

function generateMotionData(params: ChoreographyParams): any {
  const moveCount = Math.floor(params.complexity * 20) + 5;
  const moves = [];
  const skeleton = createSkeleton();

  for (let i = 0; i < moveCount; i++) {
    const time = (i / moveCount) * params.duration;
    moves.push({
      index: i,
      time,
      name: getMoveName(params.style, i),
      joints: skeleton.joints.map(joint => ({
        name: joint.name,
        rotation: [
          (Math.random() - 0.5) * Math.PI * params.complexity,
          (Math.random() - 0.5) * Math.PI * params.complexity,
          (Math.random() - 0.5) * Math.PI * params.complexity
        ],
        position: joint.name === 'Hips' ? [0, Math.sin(time * params.tempo) * 0.5, 0] : [0, 0, 0]
      }))
    });
  }

  return { moves, skeleton };
}

function createSkeleton(): any {
  return {
    joints: [
      { name: 'Hips', parent: -1 },
      { name: 'Spine', parent: 0 },
      { name: 'Chest', parent: 1 },
      { name: 'Neck', parent: 2 },
      { name: 'Head', parent: 3 },
      { name: 'LeftShoulder', parent: 2 },
      { name: 'LeftArm', parent: 5 },
      { name: 'LeftForeArm', parent: 6 },
      { name: 'LeftHand', parent: 7 },
      { name: 'RightShoulder', parent: 2 },
      { name: 'RightArm', parent: 9 },
      { name: 'RightForeArm', parent: 10 },
      { name: 'RightHand', parent: 11 },
      { name: 'LeftUpLeg', parent: 0 },
      { name: 'LeftLeg', parent: 13 },
      { name: 'LeftFoot', parent: 14 },
      { name: 'RightUpLeg', parent: 0 },
      { name: 'RightLeg', parent: 16 },
      { name: 'RightFoot', parent: 17 }
    ]
  };
}

function getMoveName(style: string, index: number): string {
  const moves: Record<string, string[]> = {
    ballet: ['plié', 'pirouette', 'arabesque', 'jeté', 'glissade'],
    hiphop: ['break', 'pop', 'lock', 'wave', 'freeze'],
    contemporary: ['fall', 'recovery', 'spiral', 'contract', 'release'],
    salsa: ['basic', 'cross-body lead', 'turn', 'spin', 'dip']
  };

  const styleMoves = moves[style] || moves.contemporary;
  return styleMoves[index % styleMoves.length];
}

function generateBVH(params: ChoreographyParams, motionData: any): string {
  let bvh = `HIERARCHY\n`;
  
  // Write skeleton
  bvh += `ROOT Hips\n`;
  bvh += `{\n`;
  bvh += `  OFFSET 0.0 0.0 0.0\n`;
  bvh += `  CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation\n`;
  
  // Add joints
  motionData.skeleton.joints.forEach((joint: any, i: number) => {
    if (i === 0) return; // Skip root
    
    const indent = '  '.repeat(i);
    bvh += `${indent}JOINT ${joint.name}\n`;
    bvh += `${indent}{\n`;
    bvh += `${indent}  OFFSET 0.0 ${i * 0.5} 0.0\n`;
    bvh += `${indent}  CHANNELS 3 Zrotation Xrotation Yrotation\n`;
    bvh += `${indent}}\n`;
  });

  // Write motion data
  bvh += `MOTION\n`;
  bvh += `Frames: ${motionData.moves.length}\n`;
  bvh += `Frame Time: ${1 / (params.tempo * 2)} \n\n`;

  motionData.moves.forEach((move: any) => {
    const values = move.joints.map((j: any) => j.rotation.map((r: number) => r.toFixed(3)).join(' ')).join(' ');
    bvh += `0.0 0.0 0.0 0.0 0.0 0.0 ${values}\n`;
  });

  return bvh;
}

function generateInteractivePreview(params: ChoreographyParams, motionData: any): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.style} Choreography Preview</title>
  <style>
    body { margin: 0; padding: 20px; background: #1a1a1a; color: white; font-family: Arial, sans-serif; }
    .container { max-width: 1200px; margin: 0 auto; }
    canvas { border: 1px solid #333; border-radius: 8px; width: 100%; }
    .controls { margin: 20px 0; padding: 20px; background: #2a2a2a; border-radius: 8px; }
    button { padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer; }
    button:hover { background: #0056b3; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${params.style} Choreography Preview</h1>
    <div class="controls">
      <button onclick="playMotion()">Play</button>
      <button onclick="pauseMotion()">Pause</button>
      <button onclick="resetMotion()">Reset</button>
      <span>Speed: <input type="range" min="0.1" max="3" step="0.1" value="1" id="speed" oninput="updateSpeed(this.value)"></span>
    </div>
    <canvas id="motionCanvas" width="800" height="600"></canvas>
  </div>

  <script>
    const canvas = document.getElementById('motionCanvas');
    const ctx = canvas.getContext('2d');
    
    const moves = ${JSON.stringify(motionData.moves.slice(0, 50))}; // First 50 moves
    let currentFrame = 0;
    let playing = false;
    let speed = 1.0;
    let lastTime = 0;

    function drawFrame(frame) {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (!moves[frame]) return;
      
      const move = moves[frame];
      
      // Draw skeleton
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      
      move.joints.forEach((joint, i) => {
        if (i === 0) return;
        const parent = move.joints[0]; // Simple: all connected to hips
        const x1 = canvas.width / 2 + parent.position[0] * 100;
        const y1 = 300 + parent.position[1] * 100;
        const x2 = canvas.width / 2 + joint.position[0] * 100;
        const y2 = 300 + joint.position[1] * 100;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Draw joint
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(x2, y2, 5, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw move name
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText(move.name, 10, 30);
      ctx.fillText('Frame: ' + frame, 10, 50);
    }

    function playMotion() {
      playing = true;
      animate(0);
    }

    function pauseMotion() {
      playing = false;
    }

    function resetMotion() {
      currentFrame = 0;
      drawFrame(0);
    }

    function updateSpeed(value) {
      speed = parseFloat(value);
    }

    function animate(timestamp) {
      if (!playing) return;
      
      if (timestamp - lastTime > 1000 / (30 * speed)) {
        currentFrame = (currentFrame + 1) % moves.length;
        drawFrame(currentFrame);
        lastTime = timestamp;
      }
      
      requestAnimationFrame(animate);
    }

    // Initial draw
    drawFrame(0);
  </script>
</body>
</html>`;
}

function extractParams(seed: Seed): ChoreographyParams {
  const quality = seed.genes?.quality?.value || 'medium';

  return {
    style: seed.genes?.style?.value || 'contemporary',
    tempo: typeof seed.genes?.tempo?.value === 'number' ? seed.genes.tempo.value : 0.5,
    complexity: typeof seed.genes?.complexity?.value === 'number' ? seed.genes.complexity.value : 0.5,
    duration: typeof seed.genes?.duration?.value === 'number' ? seed.genes.duration.value : 60,
    quality: ['low', 'medium', 'high', 'photorealistic'].includes(quality) ? quality : 'medium'
  };
}
