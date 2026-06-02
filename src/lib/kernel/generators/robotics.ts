/**
 * Robotics Generator — CANONICAL (Doctrine v2 Phase 2 Consolidation)
 *
 * PRIMARY / canonical implementation for robotics/robot design generation.
 * All engine dispatch, contracts, paradigm make, and new development MUST target this file + robotics-contract.ts.
 *
 * Siblings (robotics-3d.ts, robotics-industrial.ts) carry deprecation banners + PARADIGM-RENAME-OK waivers (sunset 2026-08-25).
 * Real dispatch enforcement + golden regeneration in progress.
 *
 * Features: Kinematic chains, sensors, actuators, behavior trees
 * Export: JSON specs, URDF, GLTF 3D model
 *
 * PHASE 2 NOTE: Canonical primary. Target robotics.ts exclusively for new work.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as THREE from 'three';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';
import { createCanvas, canvasToDataTexture } from './canvas-utils.js';
import { exportGLTF, stripTextureMapsForServer } from './gltf-exporter';
import { exportOBJ } from './obj-exporter';

interface RoboticsParams {
  type: 'humanoid' | 'quadruped' | 'wheeled' | 'arm' | 'drone' | 'snake';
  purpose: 'industrial' | 'service' | 'medical' | 'exploration' | 'military';
  dof: number;
  sensors: string[];
  autonomy: 'teleoperated' | 'semi-autonomous' | 'fully-autonomous';
}

interface Joint {
  name: string;
  type: 'revolute' | 'prismatic' | 'continuous' | 'fixed';
  axis: [number, number, number];
  limit: { lower: number; upper: number; velocity: number };
}

interface Link {
  name: string;
  dimensions: [number, number, number];
  mass: number;
  material: string;
}

export async function generateRoboticsV3(
  seed: Seed,
  outputPath: string
): Promise<{
  jsonPath: string;
  urdfPath: string;
  gltfPath: string;
  objPath?: string;
  htmlPath?: string;
  specs: any;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'robotics-default');
  const params = extractRoboticsParams(seed, rng);

  const kinematics = generateKinematics(params, rng);
  const components = generateComponents(params, kinematics, rng);
  const behaviorTree = generateBehaviorTree(params, rng);

  const robotGroup = buildRoboticsMesh(params, kinematics, rng);

  const scene3D = new THREE.Scene();
  scene3D.add(robotGroup);
  scene3D.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 0.95); sun.position.set(8, 18, 6); scene3D.add(sun);

  const dir = outputPath.endsWith('.json') ? path.dirname(outputPath) : outputPath;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  stripTextureMapsForServer(scene3D);
  const gltfBuffer = await exportGLTF(scene3D, { binary: false, embedImages: true, trs: false });
  const gltfPath = path.join(dir, `robotics_${seed.$hash || 'unknown'}.gltf`);
  fs.writeFileSync(gltfPath, gltfBuffer);

  const objData = exportOBJ(robotGroup, { includeNormals: true, includeUVs: true });
  const objPath = path.join(dir, `robotics_${seed.$hash || 'unknown'}.obj`);
  fs.writeFileSync(objPath, objData.obj);
  fs.writeFileSync(path.join(dir, `robotics_${seed.$hash || 'unknown'}.mtl`), objData.mtl);

  const jsonPath = await exportRoboticsJSON({ params, kinematics, components, behaviorTree }, outputPath, seed);
  const urdfPath = await exportURDF(kinematics, outputPath, seed);
  const htmlPath = await exportRoboticsHTML(params, kinematics, outputPath, seed);

  return { jsonPath, urdfPath, gltfPath, objPath, htmlPath, specs: { dof: params.dof, links: kinematics.links.length, joints: kinematics.joints.length } };
}

function extractRoboticsParams(seed: Seed, rng: Xoshiro256StarStar): RoboticsParams {
  const types = ['humanoid', 'quadruped', 'wheeled', 'arm', 'drone', 'snake'] as const;
  const purposes = ['industrial', 'service', 'medical', 'exploration', 'military'] as const;
  const autonomys = ['teleoperated', 'semi-autonomous', 'fully-autonomous'] as const;
  const sensorList = ['camera', 'lidar', 'imu', 'force_torque', 'proximity', 'gps', 'microphone', 'thermal'];
  
  const numSensors = 2 + Math.floor(rng.nextF64() * 4);
  const sensors: string[] = [];
  for (let i = 0; i < numSensors; i++) {
    const s = sensorList[Math.floor(rng.nextF64() * sensorList.length)];
    if (!sensors.includes(s)) sensors.push(s);
  }
  
  return {
    type: types[Math.floor(rng.nextF64() * types.length)],
    purpose: purposes[Math.floor(rng.nextF64() * purposes.length)],
    dof: 3 + Math.floor(rng.nextF64() * 25),
    sensors,
    autonomy: autonomys[Math.floor(rng.nextF64() * autonomys.length)]
  };
}

function generateKinematics(params: RoboticsParams, rng: Xoshiro256StarStar): { links: Link[]; joints: Joint[] } {
  const links: Link[] = [];
  const joints: Joint[] = [];
  
  // Base link
  links.push({ name: 'base_link', dimensions: [0.3, 0.3, 0.2], mass: 5 + rng.nextF64() * 10, material: 'aluminum' });
  
  // Generate kinematic chain based on robot type
  const numLinks = 3 + Math.floor(params.dof / 3);
  
  for (let i = 0; i < numLinks; i++) {
    links.push({
      name: `link_${i}`,
      dimensions: [0.1 + rng.nextF64() * 0.3, 0.1 + rng.nextF64() * 0.3, 0.1 + rng.nextF64() * 0.5],
      mass: 0.5 + rng.nextF64() * 5,
      material: ['aluminum', 'carbon_fiber', 'steel', 'plastic'][Math.floor(rng.nextF64() * 4)]
    });
    
    joints.push({
      name: `joint_${i}`,
      type: ['revolute', 'prismatic', 'continuous'][Math.floor(rng.nextF64() * 3)] as any,
      axis: [rng.nextF64() > 0.5 ? 1 : 0, rng.nextF64() > 0.5 ? 1 : 0, rng.nextF64() > 0.5 ? 1 : 0],
      limit: {
        lower: -Math.PI * rng.nextF64(),
        upper: Math.PI * rng.nextF64(),
        velocity: 0.5 + rng.nextF64() * 2
      }
    });
  }
  
  return { links, joints };
}

function generateComponents(params: RoboticsParams, kinematics: any, rng: Xoshiro256StarStar): any {
  return {
    actuators: kinematics.joints.map((j: any) => ({
      type: j.type === 'prismatic' ? 'linear' : 'rotary',
      torque: 10 + rng.nextF64() * 100,
      speed: 0.5 + rng.nextF64() * 3
    })),
    sensors: params.sensors.map(s => ({
      type: s,
      accuracy: 0.8 + rng.nextF64() * 0.2,
      range: 1 + rng.nextF64() * 50
    })),
    power: {
      type: ['battery', 'hydraulic', 'pneumatic', 'electric'][Math.floor(rng.nextF64() * 4)],
      capacity: 100 + rng.nextF64() * 900,
      runtime: 1 + rng.nextF64() * 23
    }
  };
}

function generateBehaviorTree(params: RoboticsParams, rng: Xoshiro256StarStar): any {
  const nodes = ['sequence', 'selector', 'parallel', 'action', 'condition'];
  const actions = ['move', 'grasp', 'navigate', 'scan', 'communicate', 'wait', 'charge'];
  
  const tree: any = { root: { type: 'sequence', children: [] } };
  const numNodes = 3 + Math.floor(rng.nextF64() * 5);
  
  for (let i = 0; i < numNodes; i++) {
    tree.root.children.push({
      type: nodes[Math.floor(rng.nextF64() * nodes.length)],
      action: actions[Math.floor(rng.nextF64() * actions.length)],
      priority: Math.floor(rng.nextF64() * 10)
    });
  }
  
  return tree;
}

async function exportRoboticsJSON(data: any, outputPath: string, seed: Seed): Promise<string> {
  const dir = outputPath.endsWith('.json') ? path.dirname(outputPath) : outputPath;
  const filename = `robotics_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(dir, filename);
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
}

async function exportURDF(kinematics: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `robotics_${seed.$hash || 'unknown'}.urdf`;
  const filePath = path.join(outputPath, filename);
  
  const urdf = `<?xml version="1.0"?>
<robot name="paradigm_robot_${seed.$hash || 'unknown'}">
  ${kinematics.links.map((l: any) => `
  <link name="${l.name}">
    <inertial><mass value="${l.mass.toFixed(2)}"/></inertial>
    <visual><geometry><box size="${l.dimensions.join(' ')}"/></geometry></visual>
    <collision><geometry><box size="${l.dimensions.join(' ')}"/></geometry></collision>
  </link>`).join('')}
  ${kinematics.joints.map((j: any, i: number) => `
  <joint name="${j.name}" type="${j.type}">
    <parent link="${kinematics.links[i].name}"/>
    <child link="${kinematics.links[i + 1]?.name || 'end_effector'}"/>
    <axis xyz="${j.axis.join(' ')}"/>
    <limit lower="${j.limit.lower.toFixed(2)}" upper="${j.limit.upper.toFixed(2)}" velocity="${j.limit.velocity.toFixed(2)}"/>
  </joint>`).join('')}
</robot>`;
  
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, urdf);
  return filePath;
}

function buildRoboticsMesh(params: RoboticsParams, kinematics: { links: any[]; joints: any[] }, rng: Xoshiro256StarStar): THREE.Group {
  const group = new THREE.Group();
  group.name = `robot_${params.type}`;
  const linkMat = createRoboticsPBRMaterial('metal', rng);
  const jointMat = createRoboticsPBRMaterial('joint', rng);

  let y = 0;
  kinematics.links.forEach((link, i) => {
    const [lx, ly, lz] = link.dimensions;
    const linkMesh = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.04, lx / 2), Math.max(0.04, lz / 2), ly, 8), linkMat);
    linkMesh.position.y = y + ly / 2;
    group.add(linkMesh);

    if (i < kinematics.joints.length) {
      const j = kinematics.joints[i];
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), jointMat);
      joint.position.y = y + ly;
      group.add(joint);
    }
    y += ly + 0.12;
  });

  // End effector
  const ee = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.22), jointMat);
  ee.position.y = y + 0.08;
  group.add(ee);

  return group;
}

function createRoboticsPBRMaterial(kind: string, rng: Xoshiro256StarStar): THREE.MeshStandardMaterial {
  const res = 128;
  const canvas = createCanvas(res, res);
  const ctx = canvas ? canvas.getContext('2d', { willReadFrequently: true } as any /* canvas interop */) : null;
  const base = kind === 'joint' ? [0.55, 0.57, 0.6] : [0.72, 0.73, 0.76];
  let tex: any = null;
  if (ctx && canvas) {
    (ctx as any).fillStyle = `rgb(${Math.floor(base[0]*255)},${Math.floor(base[1]*255)},${Math.floor(base[2]*255)})`;
    (ctx as any).fillRect(0, 0, res, res);
    (ctx as any).globalAlpha = 0.25;
    for (let i = 0; i < 90; i++) {
      const x = rng.nextInt(0, res), y = rng.nextInt(0, res);
      (ctx as any).fillStyle = `rgb(${Math.floor((base[0]+(rng.nextF64()-0.5)*0.1)*255)},${Math.floor((base[1]+(rng.nextF64()-0.5)*0.1)*255)},${Math.floor((base[2]+(rng.nextF64()-0.5)*0.1)*255)})`;
      (ctx as any).fillRect(x, y, 2, 2);
    }
    (ctx as any).globalAlpha = 1;
    tex = canvasToDataTexture(canvas); if (tex) tex.flipY = false;
  }
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(base[0], base[1], base[2]), map: tex || undefined, metalness: 0.9, roughness: kind === 'joint' ? 0.35 : 0.45 });
}

async function exportRoboticsHTML(params: RoboticsParams, kinematics: any, outputPath: string, seed: Seed): Promise<string> {
  const dir = outputPath.endsWith('.json') ? path.dirname(outputPath) : outputPath;
  const fp = path.join(dir, `robotics_${seed.$hash || 'unknown'}.html`);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Paradigm Robotics — ${seed.$hash}</title>
<style>body{margin:0;font-family:system-ui;background:#0a0a0c;color:#ccc}#v{width:100vw;height:68vh}.p{position:absolute;top:8px;left:8px;background:#151518;padding:8px 12px;border-radius:6px;font-size:12px}</style></head>
<body><canvas id="v"></canvas><div class="p"><b>${params.type} ${params.purpose}</b> dof=${params.dof} links=${kinematics.links?.length||4}</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
const c=document.getElementById('v');const rd=new THREE.WebGLRenderer({canvas:c,antialias:true});rd.setSize(innerWidth,innerHeight*.68);
const s=new THREE.Scene();s.background=new THREE.Color(0x0a0a0c);
const cam=new THREE.PerspectiveCamera(52,innerWidth/(innerHeight*.68),0.1,60);cam.position.set(2.2,2.4,3.2);
const am=new THREE.AmbientLight(0xeee,0.75);s.add(am);const sun=new THREE.DirectionalLight(0xfff,1);sun.position.set(6,12,4);s.add(sun);
const lm=new THREE.MeshStandardMaterial({color:0xb8bac0,metalness:.92,roughness:.42});
let y=0; const links=${JSON.stringify(kinematics.links||[])};
links.forEach((l,i)=>{const [lx,ly,lz]=l.dimensions||[0.12,0.6,0.12]; const ln=new THREE.Mesh(new THREE.CylinderGeometry(Math.max(.04,lx/2),Math.max(.04,lz/2),ly,8),lm); ln.position.y=y+ly/2; s.add(ln); if(i<links.length-1){const jt=new THREE.Mesh(new THREE.SphereGeometry(.07,9,9),new THREE.MeshStandardMaterial({color:0x777,metalness:.8})); jt.position.y=y+ly; s.add(jt);} y+=ly+0.1;});
const ee=new THREE.Mesh(new THREE.BoxGeometry(.12,.05,.18),new THREE.MeshStandardMaterial({color:0x666,metalness:.7}));ee.position.y=y+.06;s.add(ee);
let yw=0.9,pt=0.35,ds=3.8;function uc(){cam.position.x=Math.cos(yw)*Math.cos(pt)*ds;cam.position.z=Math.sin(yw)*Math.cos(pt)*ds;cam.position.y=1.4+Math.sin(pt)*1.6;cam.lookAt(0,1.1,0);}uc();
let dr=false,lx=0,ly=0;c.onmousedown=e=>{dr=true;lx=e.clientX;ly=e.clientY};onmouseup=()=>dr=false;onmousemove=e=>{if(!dr)return;yw-=(e.clientX-lx)*0.004;pt=Math.max(-.5,Math.min(1.0,pt-(e.clientY-ly)*0.004));lx=e.clientX;ly=e.clientY;uc();};c.onwheel=e=>{ds=Math.max(1.5,Math.min(9,ds+e.deltaY*0.003));uc();e.preventDefault();};
(function f(){s.rotation.y = Math.sin(Date.now()/4800)*0.09; rd.render(s,cam); requestAnimationFrame(f);})();
onresize=()=>{rd.setSize(innerWidth,innerHeight*.68);cam.aspect=innerWidth/(innerHeight*.68);cam.updateProjectionMatrix();};
</script></body></html>`;
  fs.writeFileSync(fp, html); return fp;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateRoboticsV3 as generateRobotics };
