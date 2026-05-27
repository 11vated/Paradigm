/**
 * PBR — physically-based shading + Monte Carlo sampling.
 * Cook-Torrance specular (GGX-Smith) + Lambert diffuse + Fresnel-Schlick.
 * Pure / IO-free / deterministic.
 */
import type { V3 } from './sdf.js';
import { v3, v3Norm, v3Dot, v3Cross } from './sdf.js';

const sub = (a: V3, b: V3): V3 => [a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const add = (a: V3, b: V3): V3 => [a[0]+b[0],a[1]+b[1],a[2]+b[2]];
const scale = (a: V3, s: number): V3 => [a[0]*s, a[1]*s, a[2]*s];

export function reflect(v: V3, n: V3): V3 {
  const k = 2 * v3Dot(v, n);
  return [v[0] - k*n[0], v[1] - k*n[1], v[2] - k*n[2]];
}

/** Tangent-space basis from a normal. */
export function tbn(n: V3): { t: V3; b: V3 } {
  const a = Math.abs(n[0]) > 0.9 ? v3(0, 1, 0) : v3(1, 0, 0);
  const t = v3Norm(v3Cross(a, n));
  return { t, b: v3Cross(n, t) };
}

/** Schlick Fresnel approximation. F0 is reflectance at normal incidence. */
export function fresnelSchlick(cosTheta: number, f0: V3): V3 {
  const k = Math.pow(1 - Math.max(0, cosTheta), 5);
  return [f0[0] + (1-f0[0])*k, f0[1] + (1-f0[1])*k, f0[2] + (1-f0[2])*k];
}

/** GGX normal distribution. */
export function ggxD(nDotH: number, roughness: number): number {
  const a = roughness * roughness;
  const a2 = a * a;
  const d = nDotH * nDotH * (a2 - 1) + 1;
  return a2 / Math.max(1e-7, Math.PI * d * d);
}

/** Smith-GGX geometry visibility (height-correlated). */
export function smithG(nDotV: number, nDotL: number, roughness: number): number {
  const a = roughness * roughness;
  const gv = nDotL * Math.sqrt(nDotV * nDotV * (1-a) + a);
  const gl = nDotV * Math.sqrt(nDotL * nDotL * (1-a) + a);
  return 0.5 / Math.max(1e-7, gv + gl);
}

/** Cosine-weighted hemisphere sample for diffuse importance sampling. */
export function cosineHemisphere(n: V3, r1: number, r2: number): { dir: V3; pdf: number } {
  const phi = 2 * Math.PI * r1;
  const r = Math.sqrt(r2);
  const x = r * Math.cos(phi);
  const y = r * Math.sin(phi);
  const z = Math.sqrt(Math.max(0, 1 - r2));
  const { t, b } = tbn(n);
  const dir: V3 = v3Norm([
    t[0]*x + b[0]*y + n[0]*z,
    t[1]*x + b[1]*y + n[1]*z,
    t[2]*x + b[2]*y + n[2]*z,
  ]);
  return { dir, pdf: z / Math.PI };
}

/** GGX VNDF (Heitz 2018) sample — for specular importance sampling. */
export function ggxVndfSample(viewLocal: V3, roughness: number, r1: number, r2: number): V3 {
  const a = roughness;
  const vh = v3Norm([a * viewLocal[0], a * viewLocal[1], viewLocal[2]]);
  const lensq = vh[0]*vh[0] + vh[1]*vh[1];
  const T1: V3 = lensq > 0
    ? v3Norm([-vh[1], vh[0], 0])
    : v3(1, 0, 0);
  const T2: V3 = v3Cross(vh, T1);
  const r = Math.sqrt(r1);
  const phi = 2 * Math.PI * r2;
  const t1 = r * Math.cos(phi);
  let t2 = r * Math.sin(phi);
  const s = 0.5 * (1 + vh[2]);
  t2 = (1 - s) * Math.sqrt(1 - t1*t1) + s * t2;
  const nh: V3 = [
    t1*T1[0] + t2*T2[0] + Math.sqrt(Math.max(0, 1 - t1*t1 - t2*t2)) * vh[0],
    t1*T1[1] + t2*T2[1] + Math.sqrt(Math.max(0, 1 - t1*t1 - t2*t2)) * vh[1],
    t1*T1[2] + t2*T2[2] + Math.sqrt(Math.max(0, 1 - t1*t1 - t2*t2)) * vh[2],
  ];
  return v3Norm([a * nh[0], a * nh[1], Math.max(0, nh[2])]);
}

/** ACES Filmic tone mapping (Stephen Hill fit). */
export function acesFilmic(x: V3): V3 {
  const a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  const m = (v: number) => Math.min(1, Math.max(0, (v*(a*v+b))/(v*(c*v+d)+e)));
  return [m(x[0]), m(x[1]), m(x[2])];
}

/** Reinhard extended tone mapping. */
export function reinhard(x: V3, white: number = 4): V3 {
  const w2 = white * white;
  const r = (v: number) => Math.min(1, Math.max(0, v * (1 + v/w2) / (1 + v)));
  return [r(x[0]), r(x[1]), r(x[2])];
}

/** Linear → sRGB gamma encode. */
export function linearToSrgb(c: V3): V3 {
  const g = (v: number) => v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1/2.4) - 0.055;
  return [g(c[0]), g(c[1]), g(c[2])];
}

/** Hosek-Wilkie-inspired sky radiance (simplified). Direction must be v3Normd. */
export function skyRadiance(dir: V3, sun: V3, turbidity: number = 2.0): V3 {
  const t = Math.max(0, dir[1]);                     // up component
  const cosGamma = Math.max(-1, Math.min(1, v3Dot(dir, sun)));
  const gamma = Math.acos(cosGamma);
  // Rayleigh scattering (blue sky)
  const rayleigh = (1 + cosGamma * cosGamma) * 0.75;
  // Mie scattering (haze around sun)
  const g = 0.76;
  const g2 = g * g;
  const mie = (1 - g2) / Math.pow(1 + g2 - 2*g*cosGamma, 1.5);
  // Color: zenith blue → horizon orange-white
  const horizon: V3 = [1.0, 0.7, 0.5];
  const zenith:  V3 = [0.25, 0.45, 0.85];
  const sky: V3 = [
    horizon[0] * (1 - t) + zenith[0] * t,
    horizon[1] * (1 - t) + zenith[1] * t,
    horizon[2] * (1 - t) + zenith[2] * t,
  ];
  const sunGlow = Math.pow(Math.max(0, cosGamma), 8) * 6;
  return [
    sky[0] * rayleigh * (turbidity * 0.12) + sunGlow,
    sky[1] * rayleigh * (turbidity * 0.12) + sunGlow * 0.9,
    sky[2] * rayleigh * (turbidity * 0.12) + sunGlow * 0.7,
  ];
}

/** Sun disc radiance (if dir is close enough to the sun). */
export function sunRadiance(dir: V3, sun: V3, intensity: number = 30, angularRadius: number = 0.05): V3 {
  const cosTheta = v3Dot(dir, sun);
  if (cosTheta < Math.cos(angularRadius)) return [0, 0, 0];
  return [intensity, intensity * 0.95, intensity * 0.85];
}
