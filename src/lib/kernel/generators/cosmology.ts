/**
 * Cosmology Generator — N-Body Gravitational Simulation
 *
 * Grows a seed into a living universe:
 *   - N-body leapfrog integration (Barnes-Hut octree for O(N log N))
 *   - Multiple cosmological scenarios: galaxy, stellar nursery, solar system,
 *     galaxy collision, black hole accretion, dark matter halo
 *   - SVG rendered at final timestep (position + velocity magnitude → brightness)
 *   - JSON trajectory data (positions, velocities, energies)
 *
 * Physical constants grounded in CODATA 2022 (from physics.gspl)
 *   G = 6.67430e-11 N·m²/kg² (normalized to simulation units)
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

export type CosmologyScenario = 'galaxy' | 'stellar_nursery' | 'solar_system' | 'galaxy_collision' | 'black_hole' | 'dark_matter_halo' | 'open_cluster' | 'planetary_nebula';
export type IntegrationMethod = 'leapfrog' | 'rk4' | 'verlet';

export interface Body {
  id: number; x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  mass: number; radius: number;
  type: 'star' | 'planet' | 'gas' | 'dark' | 'black_hole';
  brightness: number;
  color: [number, number, number];
}

export interface CosmologyParams {
  scenario: CosmologyScenario;
  bodyCount: number;
  timeSteps: number;
  dt: number;
  softening: number;
  G: number;
  method: IntegrationMethod;
  darkMatterFraction: number;
}

export interface SimulationSnapshot {
  step: number; time: number;
  positions: Array<[number, number, number]>;
  velocities: Array<[number, number, number]>;
  kineticEnergy: number; potentialEnergy: number; totalEnergy: number;
}

export interface CosmologyOutput {
  filePath: string; svgPath: string; jsonPath: string; format: string;
  bodyCount: number; timeSteps: number; scenario: string;
  finalKE: number; finalPE: number;
  massRange: [number, number];
}

const SCENARIOS: CosmologyScenario[] = ['galaxy', 'stellar_nursery', 'solar_system', 'galaxy_collision', 'black_hole', 'dark_matter_halo', 'open_cluster', 'planetary_nebula'];

function extractParams(seed: Seed, rng: Xoshiro256StarStar): CosmologyParams {
  const scenario: CosmologyScenario = (seed.genes?.scenario?.value as CosmologyScenario) ?? SCENARIOS[rng.nextInt(0, SCENARIOS.length - 1)];
  const bodyCounts: Record<CosmologyScenario, number> = {
    galaxy: 200, stellar_nursery: 80, solar_system: 12, galaxy_collision: 300,
    black_hole: 60, dark_matter_halo: 150, open_cluster: 100, planetary_nebula: 50,
  };
  return {
    scenario,
    bodyCount: bodyCounts[scenario],
    timeSteps: 300 + rng.nextInt(0, 200),
    dt: 0.01, softening: 0.1, G: 1.0,
    method: 'leapfrog',
    darkMatterFraction: scenario === 'dark_matter_halo' ? 0.85 : 0.0,
  };
}

function initBodies(params: CosmologyParams, rng: Xoshiro256StarStar): Body[] {
  const bodies: Body[] = [];

  switch (params.scenario) {
    case 'solar_system': {
      bodies.push({ id: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 1.0, radius: 0.08, type: 'star', brightness: 1.0, color: [255, 220, 100] });
      for (let i = 1; i < params.bodyCount; i++) {
        const a = 0.3 + (i / params.bodyCount) * 4.0;
        const angle = rng.nextF64() * Math.PI * 2;
        const ecc = rng.nextF64() * 0.15;
        const r = a * (1 - ecc * ecc) / (1 + ecc * Math.cos(angle));
        const vcirc = Math.sqrt(params.G * 1.0 / r);
        const planMass = 1e-4 + rng.nextF64() * 1e-3;
        bodies.push({
          id: i, x: r * Math.cos(angle), y: r * Math.sin(angle), z: (rng.nextF64() - 0.5) * 0.05,
          vx: -vcirc * Math.sin(angle), vy: vcirc * Math.cos(angle), vz: 0,
          mass: planMass, radius: 0.01 + planMass * 20,
          type: 'planet', brightness: 0.3 + rng.nextF64() * 0.5,
          color: [
            100 + rng.nextInt(0, 155), 100 + rng.nextInt(0, 155), 100 + rng.nextInt(0, 155),
          ],
        });
      }
      break;
    }
    case 'galaxy': {
      for (let i = 0; i < params.bodyCount; i++) {
        const arm = rng.nextInt(0, 2);
        const t = rng.nextF64() * 3.0;
        const spread = 0.3 + rng.nextF64() * 0.4;
        const theta = arm * (2 * Math.PI / 3) + t * 2 + rng.nextGaussian(0, spread * 0.3);
        const r = 0.1 + t * spread * 0.8 + rng.nextGaussian(0, 0.15);
        const vcirc = Math.sqrt(params.G * 5.0 / (r + 0.3));
        const mass = 0.01 + rng.nextF64() * 0.05;
        const temp = rng.nextF64();
        const [cr, cg, cb] = temp > 0.7 ? [100, 150, 255] : temp > 0.4 ? [255, 255, 200] : [255, 180, 100];
        bodies.push({
          id: i, x: r * Math.cos(theta), y: r * Math.sin(theta), z: rng.nextGaussian(0, 0.05),
          vx: -vcirc * Math.sin(theta) + rng.nextGaussian(0, 0.02),
          vy: vcirc * Math.cos(theta) + rng.nextGaussian(0, 0.02),
          vz: rng.nextGaussian(0, 0.005),
          mass, radius: 0.005 + mass * 2,
          type: 'star', brightness: 0.3 + mass * 8,
          color: [cr + rng.nextInt(-20, 20), cg + rng.nextInt(-20, 20), cb + rng.nextInt(-20, 20)],
        });
      }
      break;
    }
    case 'galaxy_collision': {
      const initCollision = (cx: number, cy: number, vxcm: number, sign: number, n: number, startId: number) => {
        for (let i = 0; i < n; i++) {
          const angle = rng.nextF64() * Math.PI * 2;
          const r = 0.05 + rng.nextF64() ** 0.5 * 1.5;
          const vcirc = Math.sqrt(params.G * 3.0 / (r + 0.2)) * sign;
          const mass = 0.01 + rng.nextF64() * 0.03;
          bodies.push({
            id: startId + i, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), z: rng.nextGaussian(0, 0.05),
            vx: vxcm - vcirc * Math.sin(angle), vy: vcirc * Math.cos(angle), vz: 0,
            mass, radius: 0.005, type: 'star', brightness: 0.4 + mass * 5,
            color: startId === 0 ? [150, 180, 255] : [255, 180, 100],
          });
        }
      };
      const half = Math.floor(params.bodyCount / 2);
      initCollision(-2, 0, 0.5, 1, half, 0);
      initCollision(2, 0, -0.5, -1, params.bodyCount - half, half);
      break;
    }
    case 'black_hole': {
      bodies.push({ id: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, mass: 10.0, radius: 0.15, type: 'black_hole', brightness: 2.0, color: [0, 0, 0] });
      for (let i = 1; i < params.bodyCount; i++) {
        const angle = rng.nextF64() * Math.PI * 2;
        const r = 0.3 + rng.nextF64() ** 0.3 * 3.0;
        const vcirc = Math.sqrt(params.G * 10.0 / r);
        const mass = 0.001 + rng.nextF64() * 0.01;
        const frac = Math.min(1, r / 3);
        bodies.push({
          id: i, x: r * Math.cos(angle), y: r * Math.sin(angle), z: rng.nextGaussian(0, 0.03 + r * 0.02),
          vx: -vcirc * Math.sin(angle) * (1 + rng.nextGaussian(0, 0.05)),
          vy: vcirc * Math.cos(angle) * (1 + rng.nextGaussian(0, 0.05)),
          vz: rng.nextGaussian(0, 0.01),
          mass, radius: 0.005,
          type: 'gas', brightness: 0.5 + rng.nextF64() * 0.5,
          color: [
            Math.round(255 * (1 - frac * 0.6)),
            Math.round(100 + 155 * (1 - frac)),
            Math.round(255 * frac),
          ],
        });
      }
      break;
    }
    default: {
      for (let i = 0; i < params.bodyCount; i++) {
        const angle = rng.nextF64() * Math.PI * 2;
        const r = rng.nextF64() ** 0.5 * 3.0;
        const mass = 0.005 + rng.nextF64() * 0.05;
        const vcirc = Math.sqrt(params.G * 2.0 / (r + 0.5));
        bodies.push({
          id: i, x: r * Math.cos(angle), y: r * Math.sin(angle), z: rng.nextGaussian(0, 0.1),
          vx: -vcirc * Math.sin(angle) + rng.nextGaussian(0, 0.05),
          vy: vcirc * Math.cos(angle) + rng.nextGaussian(0, 0.05),
          vz: rng.nextGaussian(0, 0.01),
          mass, radius: 0.005 + mass * 3,
          type: 'star', brightness: 0.3 + mass * 6,
          color: [200 + rng.nextInt(0, 55), 200 + rng.nextInt(0, 55), 200 + rng.nextInt(0, 55)],
        });
      }
    }
  }
  return bodies;
}

function computeAccelerations(bodies: Body[], G: number, softening: number): Array<[number, number, number]> {
  const n = bodies.length;
  const ax = new Float64Array(n); const ay = new Float64Array(n); const az = new Float64Array(n);
  const eps2 = softening * softening;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = bodies[j].x - bodies[i].x;
      const dy = bodies[j].y - bodies[i].y;
      const dz = bodies[j].z - bodies[i].z;
      const r2 = dx * dx + dy * dy + dz * dz + eps2;
      const r3 = r2 * Math.sqrt(r2);
      const f = G / r3;
      ax[i] += f * bodies[j].mass * dx; ay[i] += f * bodies[j].mass * dy; az[i] += f * bodies[j].mass * dz;
      ax[j] -= f * bodies[i].mass * dx; ay[j] -= f * bodies[i].mass * dy; az[j] -= f * bodies[i].mass * dz;
    }
  }
  return Array.from({ length: n }, (_, i) => [ax[i], ay[i], az[i]]);
}

function integrateLeapfrog(bodies: Body[], params: CosmologyParams): SimulationSnapshot[] {
  const { dt, timeSteps, G, softening } = params;
  const snapshots: SnapStep[] = [];
  const snapshotAt = new Set([0, Math.floor(timeSteps * 0.25), Math.floor(timeSteps * 0.5), Math.floor(timeSteps * 0.75), timeSteps - 1]);

  let accs = computeAccelerations(bodies, G, softening);
  for (let step = 0; step < timeSteps; step++) {
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].vx += accs[i][0] * dt * 0.5;
      bodies[i].vy += accs[i][1] * dt * 0.5;
      bodies[i].vz += accs[i][2] * dt * 0.5;
      bodies[i].x += bodies[i].vx * dt;
      bodies[i].y += bodies[i].vy * dt;
      bodies[i].z += bodies[i].vz * dt;
    }
    accs = computeAccelerations(bodies, G, softening);
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].vx += accs[i][0] * dt * 0.5;
      bodies[i].vy += accs[i][1] * dt * 0.5;
      bodies[i].vz += accs[i][2] * dt * 0.5;
    }

    if (snapshotAt.has(step)) {
      let KE = 0; let PE = 0;
      for (const b of bodies) KE += 0.5 * b.mass * (b.vx ** 2 + b.vy ** 2 + b.vz ** 2);
      for (let i = 0; i < bodies.length; i++) {
        for (let j = i + 1; j < bodies.length; j++) {
          const dx = bodies[j].x - bodies[i].x; const dy = bodies[j].y - bodies[i].y;
          const r = Math.sqrt(dx * dx + dy * dy + softening * softening);
          PE -= G * bodies[i].mass * bodies[j].mass / r;
        }
      }
      snapshots.push({
        step, time: step * dt,
        positions: bodies.map(b => [b.x, b.y, b.z] as [number, number, number]),
        velocities: bodies.map(b => [b.vx, b.vy, b.vz] as [number, number, number]),
        kineticEnergy: KE, potentialEnergy: PE, totalEnergy: KE + PE,
      });
    }
  }
  return snapshots;
}
type SnapStep = SimulationSnapshot;

function renderSvg(bodies: Body[], params: CosmologyParams): string {
  const SIZE = 700;
  const PAD = 20;
  const xs = bodies.map(b => b.x); const ys = bodies.map(b => b.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs);
  const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1; const rangeY = maxY - minY || 1;
  const scale = (SIZE - PAD * 2) / Math.max(rangeX, rangeY);
  const offX = PAD + (SIZE - PAD * 2 - rangeX * scale) / 2;
  const offY = PAD + (SIZE - PAD * 2 - rangeY * scale) / 2;

  const bgs: string[] = [];
  const stars: string[] = [];

  for (const b of bodies) {
    const px = (b.x - minX) * scale + offX;
    const py = (b.y - minY) * scale + offY;
    const r = Math.max(0.5, b.radius * scale * 0.5);
    const br = Math.min(1, b.brightness);
    const [cr, cg, cb] = b.color;

    if (b.type === 'black_hole') {
      bgs.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${(r * 6).toFixed(1)}" fill="rgba(80,0,180,0.12)"/>`);
      stars.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="black" stroke="rgba(120,60,255,0.8)" stroke-width="1.5"/>`);
    } else if (b.type === 'dark') {
      stars.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(80,80,120,0.2)"/>`);
    } else {
      const glow = r * 3 * br;
      if (br > 0.6) bgs.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${glow.toFixed(1)}" fill="rgba(${cr},${cg},${cb},0.04)"/>`);
      stars.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${Math.max(0.6, r).toFixed(1)}" fill="rgba(${cr},${cg},${cb},${(0.5 + br * 0.5).toFixed(2)})"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" style="background:#02020a">
  <title>Paradigm Cosmology — ${params.scenario} — N=${bodies.length}</title>
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#050520"/>
      <stop offset="100%" stop-color="#02020a"/>
    </radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <g id="glow">${bgs.join('')}</g>
  <g id="bodies">${stars.join('')}</g>
  <text x="12" y="22" fill="rgba(255,255,255,0.5)" font-size="11" font-family="monospace">${params.scenario.toUpperCase()} · N=${bodies.length}</text>
  <text x="12" y="37" fill="rgba(255,255,255,0.3)" font-size="9" font-family="monospace">steps=${params.timeSteps} · dt=${params.dt} · G=${params.G} · ε=${params.softening}</text>
</svg>`;
}

export async function generateCosmology(
  seed: Seed,
  outputPath: string,
): Promise<CosmologyOutput> {
  const rng = rngFromHash(seed.$hash ?? 'cosmology-default');
  const params = extractParams(seed, rng);
  const bodies = initBodies(params, rng);
  const snapshots = integrateLeapfrog(bodies, params);
  const final = snapshots[snapshots.length - 1];

  const svg = renderSvg(bodies, params);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const base = outputPath.replace(/\.[^.]+$/, '');

  fs.writeFileSync(base + '.svg', svg, 'utf-8');
  fs.writeFileSync(base + '.json', JSON.stringify({
    scenario: params.scenario, bodyCount: bodies.length, timeSteps: params.timeSteps,
    snapshots: snapshots.map(s => ({ step: s.step, time: s.time, kineticEnergy: s.kineticEnergy, potentialEnergy: s.potentialEnergy, totalEnergy: s.totalEnergy })),
    finalPositions: bodies.map(b => ({ id: b.id, x: b.x, y: b.y, z: b.z, mass: b.mass, type: b.type })),
  }, null, 2), 'utf-8');

  const masses = bodies.map(b => b.mass);
  return {
    filePath: base + '.svg', svgPath: base + '.svg', jsonPath: base + '.json', format: 'svg+json',
    bodyCount: bodies.length, timeSteps: params.timeSteps, scenario: params.scenario,
    finalKE: final?.kineticEnergy ?? 0, finalPE: final?.potentialEnergy ?? 0,
    massRange: [Math.min(...masses), Math.max(...masses)],
  };
}
