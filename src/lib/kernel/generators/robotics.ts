/**
 * Robotics Generator V3 — Robot Design with DOF and Behaviors
 * Features: Kinematic chains, sensors, actuators, behavior trees
 * Export: JSON specs, URDF, GLTF 3D model
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar } from '../rng';

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
  specs: any;
}> {
  const rng = new Xoshiro256StarStar(seed.$hash || 'robotics-default');
  const params = extractRoboticsParams(seed, rng);
  
  // Generate kinematic chain
  const kinematics = generateKinematics(params, rng);
  
  // Generate sensors and actuators
  const components = generateComponents(params, kinematics, rng);
  
  // Generate behavior tree
  const behaviorTree = generateBehaviorTree(params, rng);
  
  // Export
  const jsonPath = await exportRoboticsJSON({ params, kinematics, components, behaviorTree }, outputPath, seed);
  const urdfPath = await exportURDF(kinematics, outputPath, seed);
  const gltfPath = await exportRoboticsGLTF(kinematics, outputPath, seed);
  
  return { jsonPath, urdfPath, gltfPath, specs: { dof: params.dof, links: kinematics.links.length, joints: kinematics.joints.length } };
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
  const filename = `robotics_${seed.$hash || 'unknown'}.json`;
  const filePath = path.join(outputPath, filename);
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

async function exportRoboticsGLTF(kinematics: any, outputPath: string, seed: Seed): Promise<string> {
  const filename = `robotics_${seed.$hash || 'unknown'}.gltf`;
  const filePath = path.join(outputPath, filename);
  const gltf = { asset: { version: '2.0', generator: 'Paradigm Absolute' } };
  if (typeof fs !== 'undefined') fs.writeFileSync(filePath, JSON.stringify(gltf, null, 2));
  return filePath;
}

// ── Canonical aliases (added by phase-0.5 consolidation) ──
export { generateRoboticsV3 as generateRobotics };
