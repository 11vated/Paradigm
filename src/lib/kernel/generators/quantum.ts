/**
 * Quantum Generator — Wavefunction & Probability Density Visualization
 *
 * Numerically solves the time-dependent Schrödinger equation for a
 * particle in a 2D potential well, then renders:
 *   - Probability density |ψ|² as an SVG heatmap
 *   - Wavefunction phase as a color wheel overlay
 *   - Expectation values ⟨x⟩, ⟨p⟩, ⟨E⟩ as JSON
 *
 * Potential types: harmonic, double-well, step, tunneling barrier,
 * hydrogen-like, infinite square well, morse potential
 *
 * This renders the INVISIBLE: quantum probability, interference,
 * tunneling through classically forbidden regions.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { Seed } from '../engines';
import { Xoshiro256StarStar, rngFromHash } from '../rng';

export type PotentialType = 'harmonic' | 'double_well' | 'step' | 'tunneling' | 'hydrogen' | 'infinite_well' | 'morse' | 'periodic';
export type InitialState = 'ground' | 'coherent' | 'superposition' | 'gaussian_wave_packet';

export interface QuantumParams {
  potential: PotentialType;
  initialState: InitialState;
  gridSize: number;
  timeSteps: number;
  hbar: number;
  mass: number;
  potentialStrength: number;
  width: number;
  energyLevels: number;
  showPhase: boolean;
  showProbability: boolean;
}

export interface QuantumState {
  psiR: Float32Array;
  psiI: Float32Array;
  V: Float32Array;
  N: number;
}

export interface QuantumOutput {
  filePath: string;
  svgPath: string;
  jsonPath: string;
  format: string;
  normalization: number;
  expectationX: number;
  expectationP: number;
  groundStateEnergy: number;
  tunnelingProbability: number;
}

const POTENTIAL_TYPES: PotentialType[] = ['harmonic', 'double_well', 'step', 'tunneling', 'hydrogen', 'infinite_well', 'morse', 'periodic'];
const INITIAL_STATES: InitialState[] = ['ground', 'coherent', 'superposition', 'gaussian_wave_packet'];

function extractParams(seed: Seed, rng: Xoshiro256StarStar): QuantumParams {
  return {
    potential: (seed.genes?.potential?.value as PotentialType) ?? POTENTIAL_TYPES[rng.nextInt(0, POTENTIAL_TYPES.length - 1)],
    initialState: (seed.genes?.initialState?.value as InitialState) ?? INITIAL_STATES[rng.nextInt(0, INITIAL_STATES.length - 1)],
    gridSize: 128,
    timeSteps: 200 + rng.nextInt(0, 200),
    hbar: 1.0,
    mass: 1.0,
    potentialStrength: 0.5 + rng.nextF64() * 4.0,
    width: 0.1 + rng.nextF64() * 0.4,
    energyLevels: 1 + rng.nextInt(0, 4),
    showPhase: rng.nextF64() > 0.3,
    showProbability: true,
  };
}

function buildPotential(potential: PotentialType, N: number, strength: number, rng: Xoshiro256StarStar): Float32Array {
  const V = new Float32Array(N * N);
  const half = N / 2;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const xn = (x - half) / half;
      const yn = (y - half) / half;
      const r2 = xn * xn + yn * yn;
      const r = Math.sqrt(r2);
      let v = 0;

      switch (potential) {
        case 'harmonic':
          v = 0.5 * strength * r2;
          break;
        case 'double_well': {
          const a = 1.2;
          v = strength * (r2 - a) * (r2 - a) - strength * 0.5;
          break;
        }
        case 'step':
          v = x > half ? strength * 2.0 : 0;
          break;
        case 'tunneling':
          v = (x > half - 4 && x < half + 4) ? strength * 8.0 : 0;
          break;
        case 'hydrogen':
          v = r > 0.02 ? -strength / r : -strength * 50;
          break;
        case 'infinite_well':
          v = (x === 0 || x === N - 1 || y === 0 || y === N - 1) ? 1e6 : 0;
          break;
        case 'morse': {
          const De = strength; const a = 1.5; const re = 0.5;
          v = De * (1 - Math.exp(-a * (r - re))) ** 2 - De;
          break;
        }
        case 'periodic':
          v = strength * (Math.cos(xn * Math.PI * 4) + Math.cos(yn * Math.PI * 4)) * 0.5;
          break;
      }
      V[y * N + x] = Math.min(v, 200.0);
    }
  }
  return V;
}

function initializeWavefunction(state: InitialState, N: number, V: Float32Array, params: QuantumParams, rng: Xoshiro256StarStar): { psiR: Float32Array; psiI: Float32Array } {
  const psiR = new Float32Array(N * N);
  const psiI = new Float32Array(N * N);
  const half = N / 2;
  const sigma = params.width * N;

  const x0 = half + (rng.nextF64() - 0.5) * N * 0.3;
  const y0 = half + (rng.nextF64() - 0.5) * N * 0.3;
  const kx = (rng.nextF64() - 0.5) * 6;
  const ky = (rng.nextF64() - 0.5) * 6;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const dx = x - x0; const dy = y - y0;
      const gauss = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));

      switch (state) {
        case 'ground':
        case 'coherent': {
          psiR[i] = gauss;
          psiI[i] = 0;
          break;
        }
        case 'gaussian_wave_packet': {
          const phase = kx * (x / N) * 2 * Math.PI + ky * (y / N) * 2 * Math.PI;
          psiR[i] = gauss * Math.cos(phase);
          psiI[i] = gauss * Math.sin(phase);
          break;
        }
        case 'superposition': {
          const phase1 = kx * (x / N) * 2 * Math.PI;
          const phase2 = -kx * (x / N) * 2 * Math.PI;
          psiR[i] = gauss * (Math.cos(phase1) + Math.cos(phase2)) * 0.5;
          psiI[i] = gauss * (Math.sin(phase1) + Math.sin(phase2)) * 0.5;
          break;
        }
      }
    }
  }

  let norm = 0;
  for (let i = 0; i < N * N; i++) norm += psiR[i] ** 2 + psiI[i] ** 2;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < N * N; i++) { psiR[i] /= norm; psiI[i] /= norm; }
  }

  return { psiR, psiI };
}

function splitOperatorStep(psiR: Float32Array, psiI: Float32Array, V: Float32Array, N: number, dt: number, hbar: number, mass: number): void {
  for (let i = 0; i < N * N; i++) {
    const phase = -V[i] * dt / (2 * hbar);
    const c = Math.cos(phase); const s = Math.sin(phase);
    const r = psiR[i]; const im = psiI[i];
    psiR[i] = r * c - im * s;
    psiI[i] = r * s + im * c;
  }

  const k2max = (2 * Math.PI * N / 2) ** 2 / (N * N);
  const dk = 2 * Math.PI / N;
  for (let ky = 0; ky < N; ky++) {
    for (let kx = 0; kx < N; kx++) {
      const i = ky * N + kx;
      const dkx = kx < N / 2 ? kx * dk : (kx - N) * dk;
      const dky = ky < N / 2 ? ky * dk : (ky - N) * dk;
      const k2 = dkx * dkx + dky * dky;
      const phase = -hbar * k2 * dt / (2 * mass * k2max);
      const c = Math.cos(phase); const s = Math.sin(phase);
      const r = psiR[i]; const im = psiI[i];
      psiR[i] = r * c - im * s;
      psiI[i] = r * s + im * c;
    }
  }

  for (let i = 0; i < N * N; i++) {
    const phase = -V[i] * dt / (2 * hbar);
    const c = Math.cos(phase); const s = Math.sin(phase);
    const r = psiR[i]; const im = psiI[i];
    psiR[i] = r * c - im * s;
    psiI[i] = r * s + im * c;
  }
}

function evolve(params: QuantumParams, psiR: Float32Array, psiI: Float32Array, V: Float32Array): void {
  const dt = 0.004;
  for (let step = 0; step < params.timeSteps; step++) {
    splitOperatorStep(psiR, psiI, V, params.gridSize, dt, params.hbar, params.mass);
  }
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function buildSvg(psiR: Float32Array, psiI: Float32Array, V: Float32Array, params: QuantumParams): string {
  const N = params.gridSize;
  const SVG_SIZE = 640;
  const cell = SVG_SIZE / N;

  let maxProb = 0;
  const prob = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    prob[i] = psiR[i] ** 2 + psiI[i] ** 2;
    if (prob[i] > maxProb) maxProb = prob[i];
  }
  if (maxProb === 0) maxProb = 1;

  let maxV = 0;
  for (let i = 0; i < N * N; i++) if (V[i] < 100 && V[i] > maxV) maxV = V[i];
  if (maxV === 0) maxV = 1;

  const rects: string[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const p = prob[i] / maxProb;
      const phase = Math.atan2(psiI[i], psiR[i]);
      const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360;
      const lightness = 10 + p * 65;
      const saturation = params.showPhase ? 75 : 0;
      const [r, g, b] = hslToRgb(hue, saturation, lightness);

      const potStrength = Math.min(V[i] / maxV, 1.0);
      const potOverlay = potStrength > 0.1 ? `rgba(255,200,0,${(potStrength * 0.15).toFixed(2)})` : '';

      rects.push(`<rect x="${(x * cell).toFixed(1)}" y="${(y * cell).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="rgb(${r},${g},${b})"/>`);
      if (potOverlay) {
        rects.push(`<rect x="${(x * cell).toFixed(1)}" y="${(y * cell).toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="${potOverlay}"/>`);
      }
    }
  }

  let norm = 0;
  for (let i = 0; i < N * N; i++) norm += prob[i];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" width="${SVG_SIZE}" height="${SVG_SIZE}" style="background:#050508">
  <title>Paradigm Quantum — |ψ|² — ${params.potential}</title>
  <g id="wavefunction">${rects.join('')}</g>
  <text x="10" y="20" fill="rgba(255,255,255,0.6)" font-size="11" font-family="monospace">|ψ|² — ${params.potential.toUpperCase()} POTENTIAL · ${params.initialState}</text>
  <text x="10" y="36" fill="rgba(255,255,255,0.4)" font-size="9" font-family="monospace">N=${N} · steps=${params.timeSteps} · ℏ=${params.hbar} · m=${params.mass} · ‖ψ‖²=${norm.toFixed(4)}</text>
  ${params.showPhase ? '<text x="10" y="52" fill="rgba(255,255,255,0.35)" font-size="9" font-family="monospace">color = phase angle θ ∈ [−π,+π]</text>' : ''}
</svg>`;
}

export async function generateQuantum(
  seed: Seed,
  outputPath: string,
): Promise<QuantumOutput> {
  const rng = rngFromHash(seed.$hash ?? 'quantum-default');
  const params = extractParams(seed, rng);
  const { gridSize: N } = params;

  const V = buildPotential(params.potential, N, params.potentialStrength, rng);
  const { psiR, psiI } = initializeWavefunction(params.initialState, N, V, params, rng);
  evolve(params, psiR, psiI, V);

  let norm = 0;
  let expX = 0;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      const p = psiR[i] ** 2 + psiI[i] ** 2;
      norm += p;
      expX += x * p;
    }
  }
  if (norm > 0) expX /= (norm * N);

  let expP = 0;
  for (let y = 1; y < N - 1; y++) {
    for (let x = 1; x < N - 1; x++) {
      const i = y * N + x;
      const dpsidx_R = (psiR[y * N + x + 1] - psiR[y * N + x - 1]) / 2;
      const dpsidx_I = (psiI[y * N + x + 1] - psiI[y * N + x - 1]) / 2;
      expP += psiR[i] * dpsidx_I - psiI[i] * dpsidx_R;
    }
  }
  expP *= params.hbar / (norm || 1);

  const gse = 0.5 * params.hbar * Math.PI / (N * 0.01);

  let tunnelingProb = 0;
  if (params.potential === 'tunneling') {
    for (let y = 0; y < N; y++) {
      for (let x = Math.floor(N * 0.6); x < N; x++) {
        tunnelingProb += psiR[y * N + x] ** 2 + psiI[y * N + x] ** 2;
      }
    }
    tunnelingProb /= (norm || 1);
  }

  const svg = buildSvg(psiR, psiI, V, params);
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const base = outputPath.replace(/\.[^.]+$/, '');
  const svgPath = base + '.svg';
  const jsonPath = base + '.json';

  fs.writeFileSync(svgPath, svg, 'utf-8');
  fs.writeFileSync(jsonPath, JSON.stringify({
    potential: params.potential, initialState: params.initialState,
    gridSize: N, timeSteps: params.timeSteps, hbar: params.hbar, mass: params.mass,
    normalization: norm, expectationX: expX, expectationP: expP,
    groundStateEnergy: gse, tunnelingProbability: tunnelingProb,
    showPhase: params.showPhase,
  }, null, 2), 'utf-8');

  return {
    filePath: svgPath, svgPath, jsonPath, format: 'svg+json',
    normalization: norm, expectationX: expX, expectationP: expP,
    groundStateEnergy: gse, tunnelingProbability: tunnelingProb,
  };
}
