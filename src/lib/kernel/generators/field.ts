/**
 * Field Generator — Electromagnetic Field Visualization
 *
 * Grows a seed into a real FDTD simulation result: electric and magnetic
 * field snapshots rendered as SVG/JSON. Uses the QFT em_solver under the hood.
 *
 * What it produces:
 *   - SVG field map (vector arrows + magnitude heatmap)
 *   - JSON field data (Ex, Ey, Bz grids)
 *   - Metadata: frequency, source positions, boundary conditions
 *
 * Domains bridged: physics gene → FDTD params, visual gene → colormap
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

export type FieldType = 'electric' | 'magnetic' | 'electromagnetic' | 'static_e' | 'static_b';
export type BoundaryCondition = 'pml' | 'periodic' | 'pec';
export type SourceType = 'point' | 'plane_wave' | 'dipole' | 'gaussian_beam';
export type ColorMap = 'plasma' | 'viridis' | 'inferno' | 'diverging' | 'spectral';

export interface FieldParams {
  fieldType: FieldType;
  gridSize: number;
  steps: number;
  frequency: number;
  amplitude: number;
  sources: Array<{ x: number; y: number; type: SourceType; phase: number }>;
  boundary: BoundaryCondition;
  colorMap: ColorMap;
  showVectors: boolean;
  showHeatmap: boolean;
}

export interface FieldSnapshot {
  Ex: Float32Array;
  Ey: Float32Array;
  Bz: Float32Array;
  width: number;
  height: number;
  step: number;
  time: number;
}

export interface FieldOutput {
  filePath: string;
  svgPath: string;
  jsonPath: string;
  format: string;
  peakMagnitude: number;
  energyDensity: number;
  gridSize: number;
  steps: number;
}

const FIELD_TYPES: FieldType[] = ['electric', 'magnetic', 'electromagnetic', 'static_e', 'static_b'];
const BOUNDARY_CONDITIONS: BoundaryCondition[] = ['pml', 'periodic', 'pec'];
const SOURCE_TYPES: SourceType[] = ['point', 'plane_wave', 'dipole', 'gaussian_beam'];
const COLOR_MAPS: ColorMap[] = ['plasma', 'viridis', 'inferno', 'diverging', 'spectral'];

function extractParams(seed: Seed, rng: Xoshiro256StarStar): FieldParams {
  const gridSize = 64;
  const steps = 120 + rng.nextInt(0, 80);
  const freq = 2.4e9 * (0.1 + rng.nextF64() * 4.0);
  const amplitude = 0.5 + rng.nextF64() * 2.0;
  const fieldType: FieldType = (seed.genes?.fieldType?.value as FieldType) ?? FIELD_TYPES[rng.nextInt(0, FIELD_TYPES.length - 1)];
  const boundary: BoundaryCondition = (seed.genes?.boundary?.value as BoundaryCondition) ?? BOUNDARY_CONDITIONS[rng.nextInt(0, 2)];
  const colorMap: ColorMap = (seed.genes?.colorMap?.value as ColorMap) ?? COLOR_MAPS[rng.nextInt(0, COLOR_MAPS.length - 1)];

  const sourceCount = 1 + rng.nextInt(0, 2);
  const sources = Array.from({ length: sourceCount }, () => ({
    x: 0.1 + rng.nextF64() * 0.8,
    y: 0.1 + rng.nextF64() * 0.8,
    type: SOURCE_TYPES[rng.nextInt(0, SOURCE_TYPES.length - 1)],
    phase: rng.nextF64() * Math.PI * 2,
  }));

  return {
    fieldType, gridSize, steps, frequency: freq, amplitude,
    sources, boundary, colorMap,
    showVectors: rng.nextF64() > 0.4,
    showHeatmap: true,
  };
}

function runFDTD(params: FieldParams, rng: Xoshiro256StarStar): FieldSnapshot[] {
  const { gridSize: N, steps, frequency, amplitude } = params;
  const dx = 1.0 / N;
  const dt = dx / (2.0 * 3e8);
  const k = (2 * Math.PI * frequency) / 3e8;

  const Ex = new Float32Array(N * N);
  const Ey = new Float32Array(N * N);
  const Bz = new Float32Array(N * N);

  const snapshots: FieldSnapshot[] = [];
  const snapshotSteps = [Math.floor(steps * 0.25), Math.floor(steps * 0.5), Math.floor(steps * 0.75), steps - 1];

  for (let step = 0; step < steps; step++) {
    const t = step * dt;

    for (const src of params.sources) {
      const sx = Math.floor(src.x * N);
      const sy = Math.floor(src.y * N);
      const si = sy * N + sx;
      const excitation = amplitude * Math.sin(2 * Math.PI * frequency * t + src.phase);

      if (src.type === 'point' || src.type === 'dipole') {
        if (si >= 0 && si < N * N) {
          Bz[si] += excitation * dt;
        }
      } else if (src.type === 'plane_wave') {
        for (let x = 0; x < N; x++) {
          const idx = sy * N + x;
          Bz[idx] += excitation * dt;
        }
      } else if (src.type === 'gaussian_beam') {
        const sigma = N * 0.08;
        for (let y = 0; y < N; y++) {
          for (let x = 0; x < N; x++) {
            const gx = Math.exp(-((x - sx) ** 2) / (2 * sigma ** 2));
            const gy = Math.exp(-((y - sy) ** 2) / (2 * sigma ** 2));
            Bz[y * N + x] += excitation * gx * gy * dt;
          }
        }
      }
    }

    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x;
        Ex[i] += (Bz[i] - Bz[(y - 1) * N + x]) * dt / dx;
        Ey[i] -= (Bz[i] - Bz[y * N + (x - 1)]) * dt / dx;
      }
    }

    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        const i = y * N + x;
        Bz[i] -= (
          (Ey[(y) * N + (x + 1)] - Ey[i]) / dx -
          (Ex[(y + 1) * N + x] - Ex[i]) / dx
        ) * dt;
      }
    }

    if (params.boundary === 'pml') {
      const sigma_max = 0.5;
      for (let j = 0; j < N; j++) {
        const edge_l = Math.max(0, 3 - j);
        const edge_r = Math.max(0, j - (N - 4));
        const damp = 1.0 - sigma_max * (edge_l + edge_r) / 3;
        Ex[j * N + 0] *= damp; Ex[j * N + N - 1] *= damp;
        Ey[j] *= damp; Ey[(N - 1) * N + j] *= damp;
        Bz[j * N + 0] *= damp; Bz[j * N + N - 1] *= damp;
        Bz[j] *= damp; Bz[(N - 1) * N + j] *= damp;
      }
    } else if (params.boundary === 'periodic') {
      for (let j = 0; j < N; j++) {
        Ex[j * N + 0] = Ex[j * N + N - 2];
        Ex[j * N + N - 1] = Ex[j * N + 1];
        Ey[0 * N + j] = Ey[(N - 2) * N + j];
        Ey[(N - 1) * N + j] = Ey[1 * N + j];
      }
    }

    if (snapshotSteps.includes(step)) {
      snapshots.push({
        Ex: new Float32Array(Ex), Ey: new Float32Array(Ey), Bz: new Float32Array(Bz),
        width: N, height: N, step, time: t,
      });
    }
  }

  return snapshots;
}

const COLOR_PALETTES: Record<ColorMap, Array<[number, number, number]>> = {
  plasma:    [[13,8,135],[84,2,163],[139,10,165],[185,50,137],[219,92,104],[244,136,73],[254,188,43],[240,249,33]],
  viridis:   [[68,1,84],[72,40,120],[62,83,160],[49,120,174],[38,153,178],[31,183,171],[53,211,136],[109,229,84],[180,242,43],[253,231,37]],
  inferno:   [[0,0,4],[40,11,84],[101,21,110],[159,42,99],[212,72,66],[245,125,21],[252,193,7],[252,255,164]],
  diverging: [[33,102,172],[67,147,195],[146,197,222],[247,247,247],[244,165,130],[214,96,77],[178,24,43]],
  spectral:  [[158,1,66],[213,62,79],[244,109,67],[253,174,97],[254,224,139],[255,255,191],[230,245,152],[171,221,164],[102,194,165],[50,136,189],[94,79,162]],
};

function sampleColorMap(map: ColorMap, t: number): string {
  const palette = COLOR_PALETTES[map];
  t = Math.max(0, Math.min(1, t));
  const idx = t * (palette.length - 1);
  const lo = Math.floor(idx); const hi = Math.ceil(idx);
  const f = idx - lo;
  const c0 = palette[lo]; const c1 = palette[hi];
  const r = Math.round(c0[0] + (c1[0] - c0[0]) * f);
  const g = Math.round(c0[1] + (c1[1] - c0[1]) * f);
  const b = Math.round(c0[2] + (c1[2] - c0[2]) * f);
  return `rgb(${r},${g},${b})`;
}

function snapshotToSvg(snap: FieldSnapshot, params: FieldParams): string {
  const { Ex, Ey, Bz, width: N, height: N2, step, time } = snap;
  const SVG_SIZE = 640;
  const cell = SVG_SIZE / N;

  let maxMag = 0;
  for (let i = 0; i < N * N; i++) {
    const mag = Math.sqrt(Ex[i] ** 2 + Ey[i] ** 2 + Bz[i] ** 2);
    if (mag > maxMag) maxMag = mag;
  }
  if (maxMag === 0) maxMag = 1;

  const rects: string[] = [];
  const arrows: string[] = [];

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const px = x * cell; const py = y * cell;

      let magnitude: number;
      if (params.fieldType === 'electric' || params.fieldType === 'static_e') {
        magnitude = Math.sqrt(Ex[i] ** 2 + Ey[i] ** 2) / maxMag;
      } else if (params.fieldType === 'magnetic' || params.fieldType === 'static_b') {
        magnitude = Math.abs(Bz[i]) / maxMag;
      } else {
        magnitude = Math.sqrt(Ex[i] ** 2 + Ey[i] ** 2 + Bz[i] ** 2) / maxMag;
      }

      const color = sampleColorMap(params.colorMap, magnitude);
      rects.push(`<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="${color}" opacity="${(0.7 + magnitude * 0.3).toFixed(2)}"/>`);

      if (params.showVectors && x % 4 === 0 && y % 4 === 0) {
        const ex = Ex[i]; const ey = Ey[i];
        const emag = Math.sqrt(ex ** 2 + ey ** 2);
        if (emag > maxMag * 0.01) {
          const nx = ex / emag * cell * 1.6; const ny = ey / emag * cell * 1.6;
          const cx = px + cell / 2; const cy = py + cell / 2;
          arrows.push(`<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx + nx).toFixed(1)}" y2="${(cy + ny).toFixed(1)}" stroke="rgba(255,255,255,0.55)" stroke-width="0.7"/>`);
        }
      }
    }
  }

  const sourceMarkers = params.sources.map(src => {
    const sx = (src.x * SVG_SIZE).toFixed(1);
    const sy = (src.y * SVG_SIZE).toFixed(1);
    return `<circle cx="${sx}" cy="${sy}" r="4" fill="white" opacity="0.85" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" width="${SVG_SIZE}" height="${SVG_SIZE}" style="background:#0a0a10">
  <title>Paradigm EM Field — ${params.fieldType} — t=${(time * 1e9).toFixed(2)} ns</title>
  <g id="heatmap">${rects.join('')}</g>
  <g id="vectors">${arrows.join('')}</g>
  <g id="sources">${sourceMarkers.join('')}</g>
  <text x="10" y="20" fill="rgba(255,255,255,0.6)" font-size="11" font-family="monospace">${params.fieldType.toUpperCase()} FIELD · step=${step} · f=${(params.frequency / 1e9).toFixed(2)} GHz</text>
  <text x="10" y="36" fill="rgba(255,255,255,0.4)" font-size="9" font-family="monospace">N=${N} · boundary=${params.boundary} · t=${(time * 1e9).toFixed(3)} ns</text>
</svg>`;
}

export async function generateField(
  seed: Seed,
  outputPath: string,
): Promise<FieldOutput> {
  const rng = rngFromHash(seed.$hash ?? 'field-default');
  const params = extractParams(seed, rng);

  const snapshots = runFDTD(params, rng);
  const finalSnap = snapshots[snapshots.length - 1];

  let peakMag = 0;
  let totalEnergy = 0;
  const N = finalSnap.width;
  for (let i = 0; i < N * N; i++) {
    const m = Math.sqrt(finalSnap.Ex[i] ** 2 + finalSnap.Ey[i] ** 2 + finalSnap.Bz[i] ** 2);
    if (m > peakMag) peakMag = m;
    totalEnergy += m ** 2;
  }
  const energyDensity = totalEnergy / (N * N);

  const svg = snapshotToSvg(finalSnap, params);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const base = outputPath.replace(/\.[^.]+$/, '');
  const svgPath = base + '.svg';
  const jsonPath = base + '.json';

  fs.writeFileSync(svgPath, svg, 'utf-8');

  const jsonData = {
    fieldType: params.fieldType, gridSize: N, steps: params.steps,
    frequency: params.frequency, amplitude: params.amplitude,
    boundary: params.boundary, colorMap: params.colorMap,
    sources: params.sources,
    snapshots: snapshots.map(s => ({
      step: s.step, time: s.time,
      Ex: Array.from(s.Ex.slice(0, 64)),
      Ey: Array.from(s.Ey.slice(0, 64)),
      Bz: Array.from(s.Bz.slice(0, 64)),
    })),
    peakMagnitude: peakMag, energyDensity,
  };
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');

  return {
    filePath: svgPath, svgPath, jsonPath, format: 'svg+json',
    peakMagnitude: peakMag, energyDensity, gridSize: N, steps: params.steps,
  };
}
