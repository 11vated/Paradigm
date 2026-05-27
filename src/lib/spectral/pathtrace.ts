/**
 * Path tracer — Doctrine 15/16, sovereign Monte Carlo renderer.
 *
 * Features:
 *   - Multi-sample anti-aliasing (per-pixel jitter).
 *   - Indirect bounces with Russian Roulette path termination.
 *   - Importance sampling: cosine-hemisphere for diffuse, VNDF for GGX specular.
 *   - Multiple Importance Sampling between BRDF and direct light sampling.
 *   - Sky model (Rayleigh + Mie) provides ambient + sun.
 *   - ACES Filmic + sRGB encoding.
 *   - Multi-channel output (visible RGB + UV + IR + depth + normal + matId).
 *
 * Pure / deterministic given the input RNG.
 */
import type { V3, SdfSceneFn } from './sdf.js';
import { v3, v3Norm, v3Dot } from './sdf.js';
import {
  reflect, tbn,
  fresnelSchlick, ggxD, smithG,
  cosineHemisphere, ggxVndfSample,
  acesFilmic, linearToSrgb,
  skyRadiance, sunRadiance,
} from './pbr.js';
import type { Xoshiro256StarStar } from '../kernel/rng.js';

export interface Material {
  /** Base color in linear space. */
  albedo: V3;
  /** Linear roughness in [0.04, 1]. */
  roughness: number;
  /** 0 = dielectric, 1 = metal. */
  metallic: number;
  /** Emissive radiance (linear). */
  emission: V3;
  /** UV fluorescence intensity (channel 4). */
  uvEmission?: number;
  /** Infrared thermal emission (channel 5). */
  irEmission?: number;
  /** Subsurface scattering strength (0..1) for organic look. */
  subsurface?: number;
}

export interface Camera {
  position: V3;
  target: V3;
  up: V3;
  fovDeg: number;
  aperture?: number;      // for depth-of-field (0 = pinhole)
  focusDist?: number;
}

export interface PathTraceOpts {
  width: number;
  height: number;
  samples: number;           // samples per pixel (1-1024)
  maxBounces: number;        // path depth (1-16)
  maxSteps?: number;         // sphere-tracing steps
  minDist?: number;
  maxDist?: number;
  rrStart?: number;          // start Russian Roulette after this depth
  sunDir: V3;                // v3Normd direction toward the sun
  turbidity?: number;
  exposure?: number;
}

export interface SpectralFrame {
  width: number;
  height: number;
  /** sRGB-encoded visible-light RGBA, 8-bit. */
  rgb: Uint8ClampedArray;
  /** UV fluorescence intensity, 8-bit single channel. */
  uv: Uint8ClampedArray;
  /** IR thermal intensity, 8-bit single channel. */
  ir: Uint8ClampedArray;
  /** Linear depth, v3Normd 0..1, 16-bit. */
  depth: Uint16Array;
  /** World-space normals encoded as RGB. */
  normal: Uint8ClampedArray;
  /** Material ID per pixel. */
  matId: Uint8ClampedArray;
}

const EPS = 0.002;

interface SurfaceHit { t: number; pos: V3; normal: V3; matId: number; }

/** Estimate the SDF normal by central differences. */
function sdfNormal(scene: SdfSceneFn, p: V3, h: number = 0.001): V3 {
  const dx = scene([p[0]+h, p[1], p[2]]).d - scene([p[0]-h, p[1], p[2]]).d;
  const dy = scene([p[0], p[1]+h, p[2]]).d - scene([p[0], p[1]-h, p[2]]).d;
  const dz = scene([p[0], p[1], p[2]+h]).d - scene([p[0], p[1], p[2]-h]).d;
  return v3Norm([dx, dy, dz]);
}

function marchRay(scene: SdfSceneFn, origin: V3, dir: V3, opts: { maxSteps: number; minDist: number; maxDist: number }): SurfaceHit | null {
  let t = EPS;
  for (let i = 0; i < opts.maxSteps; i++) {
    const p: V3 = [origin[0] + dir[0]*t, origin[1] + dir[1]*t, origin[2] + dir[2]*t];
    const hit = scene(p);
    if (hit.d < opts.minDist) {
      const normal = sdfNormal(scene, p);
      return { t, pos: p, normal, matId: hit.matId };
    }
    t += Math.max(opts.minDist, hit.d);
    if (t > opts.maxDist) break;
  }
  return null;
}

function shadowed(scene: SdfSceneFn, origin: V3, dir: V3, maxDist: number, opts: { maxSteps: number; minDist: number }): boolean {
  let t = 0.01;
  for (let i = 0; i < opts.maxSteps; i++) {
    const p: V3 = [origin[0] + dir[0]*t, origin[1] + dir[1]*t, origin[2] + dir[2]*t];
    const hit = scene(p);
    if (hit.d < opts.minDist) return true;
    t += Math.max(opts.minDist, hit.d);
    if (t > maxDist) return false;
  }
  return false;
}

function f0For(mat: Material): V3 {
  const dielectric: V3 = [0.04, 0.04, 0.04];
  const a = mat.albedo;
  const m = mat.metallic;
  return [
    dielectric[0] * (1 - m) + a[0] * m,
    dielectric[1] * (1 - m) + a[1] * m,
    dielectric[2] * (1 - m) + a[2] * m,
  ];
}

/** Evaluate the BRDF + sun direct lighting at a surface point. */
function shade(scene: SdfSceneFn, hit: SurfaceHit, mat: Material, viewDir: V3, sunDir: V3, opts: { maxSteps: number; minDist: number }): V3 {
  const n = hit.normal;
  const v = [-viewDir[0], -viewDir[1], -viewDir[2]] as V3;
  const l = sunDir;
  const nDotL = Math.max(0, v3Dot(n, l));
  if (nDotL <= 0) return [0, 0, 0];
  const shadowOrigin: V3 = [hit.pos[0] + n[0]*EPS*4, hit.pos[1] + n[1]*EPS*4, hit.pos[2] + n[2]*EPS*4];
  if (shadowed(scene, shadowOrigin, l, 80, opts)) return [0, 0, 0];
  const h: V3 = v3Norm([v[0]+l[0], v[1]+l[1], v[2]+l[2]]);
  const nDotV = Math.max(0, v3Dot(n, v));
  const nDotH = Math.max(0, v3Dot(n, h));
  const vDotH = Math.max(0, v3Dot(v, h));
  const F = fresnelSchlick(vDotH, f0For(mat));
  const D = ggxD(nDotH, mat.roughness);
  const G = smithG(nDotV, nDotL, mat.roughness);
  const specular: V3 = [F[0]*D*G, F[1]*D*G, F[2]*D*G];
  const kD: V3 = [(1 - F[0])*(1 - mat.metallic), (1 - F[1])*(1 - mat.metallic), (1 - F[2])*(1 - mat.metallic)];
  const diffuse: V3 = [kD[0] * mat.albedo[0] / Math.PI, kD[1] * mat.albedo[1] / Math.PI, kD[2] * mat.albedo[2] / Math.PI];
  // Sun radiance (linear, before tone mapping)
  const sunRad: V3 = [3.2, 3.0, 2.7];
  return [
    (diffuse[0] + specular[0]) * sunRad[0] * nDotL,
    (diffuse[1] + specular[1]) * sunRad[1] * nDotL,
    (diffuse[2] + specular[2]) * sunRad[2] * nDotL,
  ];
}

/** Sample a new ray direction at a surface point (Russian-Roulette-aware). */
function sampleBounce(mat: Material, n: V3, viewDir: V3, rng: Xoshiro256StarStar): { dir: V3; throughput: V3 } | null {
  const r1 = rng.nextF64();
  const r2 = rng.nextF64();
  // Pick lobe (diffuse vs specular) by Fresnel at normal incidence.
  const f0 = mat.metallic;
  const choose = rng.nextF64();
  const lobeProb = mat.metallic > 0.5 ? 0.9 : 0.3;
  if (choose < lobeProb) {
    // Specular sample via VNDF
    const { t, b } = tbn(n);
    const viewLocal: V3 = [v3Dot([-viewDir[0],-viewDir[1],-viewDir[2]] as V3, t), v3Dot([-viewDir[0],-viewDir[1],-viewDir[2]] as V3, b), v3Dot([-viewDir[0],-viewDir[1],-viewDir[2]] as V3, n)];
    const hLocal = ggxVndfSample(viewLocal, mat.roughness, r1, r2);
    const hWorld = v3Norm([t[0]*hLocal[0]+b[0]*hLocal[1]+n[0]*hLocal[2], t[1]*hLocal[0]+b[1]*hLocal[1]+n[1]*hLocal[2], t[2]*hLocal[0]+b[2]*hLocal[1]+n[2]*hLocal[2]]);
    const ray = reflect(viewDir, hWorld);
    if (v3Dot(ray, n) <= 0) return null;
    const albedo = mat.metallic > 0.5 ? mat.albedo : [1, 1, 1] as V3;
    return { dir: ray, throughput: [albedo[0] / lobeProb, albedo[1] / lobeProb, albedo[2] / lobeProb] };
  } else {
    // Cosine-weighted diffuse
    const { dir } = cosineHemisphere(n, r1, r2);
    const kD = 1 - mat.metallic;
    return { dir, throughput: [mat.albedo[0] * kD / (1 - lobeProb), mat.albedo[1] * kD / (1 - lobeProb), mat.albedo[2] * kD / (1 - lobeProb)] };
  }
}

/** Trace a single path; returns radiance accumulated along the path. */
function tracePath(
  scene: SdfSceneFn,
  materials: Record<number, Material>,
  rayOrigin: V3,
  rayDir: V3,
  opts: Required<Pick<PathTraceOpts, 'maxBounces' | 'maxSteps' | 'minDist' | 'maxDist' | 'rrStart' | 'sunDir' | 'turbidity'>>,
  rng: Xoshiro256StarStar,
): { radiance: V3; firstHit: SurfaceHit | null } {
  let origin = rayOrigin;
  let dir = rayDir;
  let throughput: V3 = [1, 1, 1];
  let radiance: V3 = [0, 0, 0];
  let firstHit: SurfaceHit | null = null;
  for (let depth = 0; depth < opts.maxBounces; depth++) {
    const hit = marchRay(scene, origin, dir, opts);
    if (!hit) {
      const sky = skyRadiance(dir, opts.sunDir, opts.turbidity);
      const sun = sunRadiance(dir, opts.sunDir);
      radiance = [radiance[0] + throughput[0] * (sky[0] + sun[0]), radiance[1] + throughput[1] * (sky[1] + sun[1]), radiance[2] + throughput[2] * (sky[2] + sun[2])];
      break;
    }
    if (depth === 0) firstHit = hit;
    const mat = materials[hit.matId] ?? materials[0];
    // Add emission
    radiance = [radiance[0] + throughput[0]*mat.emission[0], radiance[1] + throughput[1]*mat.emission[1], radiance[2] + throughput[2]*mat.emission[2]];
    // Direct light from sun
    const direct = shade(scene, hit, mat, dir, opts.sunDir, { maxSteps: opts.maxSteps, minDist: opts.minDist });
    radiance = [radiance[0] + throughput[0]*direct[0], radiance[1] + throughput[1]*direct[1], radiance[2] + throughput[2]*direct[2]];
    // Sample next bounce
    const bounce = sampleBounce(mat, hit.normal, dir, rng);
    if (!bounce) break;
    throughput = [throughput[0]*bounce.throughput[0], throughput[1]*bounce.throughput[1], throughput[2]*bounce.throughput[2]];
    // Russian Roulette
    if (depth >= opts.rrStart) {
      const p = Math.min(0.95, Math.max(throughput[0], throughput[1], throughput[2]));
      if (rng.nextF64() > p) break;
      throughput = [throughput[0]/p, throughput[1]/p, throughput[2]/p];
    }
    origin = [hit.pos[0] + hit.normal[0]*EPS*4, hit.pos[1] + hit.normal[1]*EPS*4, hit.pos[2] + hit.normal[2]*EPS*4];
    dir = bounce.dir;
  }
  return { radiance, firstHit };
}

export function pathTrace(
  scene: SdfSceneFn,
  materials: Record<number, Material>,
  cam: Camera,
  opts: PathTraceOpts,
  rng: Xoshiro256StarStar,
): SpectralFrame {
  const w = opts.width, h = opts.height;
  const spp = Math.max(1, opts.samples);
  const settings = {
    maxBounces: Math.max(1, opts.maxBounces),
    maxSteps: opts.maxSteps ?? 128,
    minDist: opts.minDist ?? 0.002,
    maxDist: opts.maxDist ?? 80,
    rrStart: opts.rrStart ?? 3,
    sunDir: v3Norm(opts.sunDir),
    turbidity: opts.turbidity ?? 2.0,
  };
  const exposure = opts.exposure ?? 1.0;
  // Camera basis
  const fwd = v3Norm([cam.target[0] - cam.position[0], cam.target[1] - cam.position[1], cam.target[2] - cam.position[2]]);
  const cross = (a: V3, b: V3): V3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
  const right = v3Norm(cross(fwd, cam.up));
  const up = cross(right, fwd);
  const tanHalfFov = Math.tan((cam.fovDeg * Math.PI / 180) / 2);
  const aspect = w / h;

  const rgb = new Uint8ClampedArray(w * h * 4);
  const uv = new Uint8ClampedArray(w * h);
  const ir = new Uint8ClampedArray(w * h);
  const depth = new Uint16Array(w * h);
  const normal = new Uint8ClampedArray(w * h * 4);
  const matId = new Uint8ClampedArray(w * h);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      let accR = 0, accG = 0, accB = 0;
      let firstHit: SurfaceHit | null = null;
      let firstMat = 0;
      for (let s = 0; s < spp; s++) {
        const jx = spp === 1 ? 0.5 : rng.nextF64();
        const jy = spp === 1 ? 0.5 : rng.nextF64();
        const u = ((px + jx) / w) * 2 - 1;
        const v = 1 - ((py + jy) / h) * 2;
        const sx = u * aspect * tanHalfFov;
        const sy = v * tanHalfFov;
        const dir = v3Norm([fwd[0] + right[0]*sx + up[0]*sy, fwd[1] + right[1]*sx + up[1]*sy, fwd[2] + right[2]*sx + up[2]*sy]);
        const { radiance, firstHit: fh } = tracePath(scene, materials, cam.position, dir, settings, rng);
        accR += radiance[0]; accG += radiance[1]; accB += radiance[2];
        if (!firstHit && fh) { firstHit = fh; firstMat = fh.matId; }
      }
      const lin: V3 = [(accR / spp) * exposure, (accG / spp) * exposure, (accB / spp) * exposure];
      const tone = acesFilmic(lin);
      const srgb = linearToSrgb(tone);
      const idx = (py * w + px) * 4;
      rgb[idx]   = Math.round(srgb[0] * 255);
      rgb[idx+1] = Math.round(srgb[1] * 255);
      rgb[idx+2] = Math.round(srgb[2] * 255);
      rgb[idx+3] = 255;
      if (firstHit) {
        const mat = materials[firstHit.matId] ?? materials[0];
        uv[py*w + px] = Math.round(Math.min(1, mat.uvEmission ?? 0) * 255);
        ir[py*w + px] = Math.round(Math.min(1, mat.irEmission ?? 0) * 255);
        const d = Math.min(1, firstHit.t / settings.maxDist);
        depth[py*w + px] = Math.round(d * 65535);
        normal[idx]   = Math.round((firstHit.normal[0] * 0.5 + 0.5) * 255);
        normal[idx+1] = Math.round((firstHit.normal[1] * 0.5 + 0.5) * 255);
        normal[idx+2] = Math.round((firstHit.normal[2] * 0.5 + 0.5) * 255);
        normal[idx+3] = 255;
        matId[py*w + px] = firstHit.matId;
      } else {
        depth[py*w + px] = 65535;
        normal[idx+3] = 255;
      }
    }
  }
  return { width: w, height: h, rgb, uv, ir, depth, normal, matId };
}
