/**
 * Sphere-tracing raymarcher with PBR shading and multi-channel output.
 *
 * Output channels per pixel:
 *   - RGB           (visible-light render, Cook-Torrance + Disney diffuse)
 *   - UV            (ultraviolet fluorescence — material-dependent)
 *   - IR            (infrared / thermal — based on emission temp)
 *   - Depth         (camera-space z in scene units)
 *   - Normal        (world-space xyz packed to 0..1)
 *   - MaterialId    (per-pixel integer)
 */
import { v3, v3Add, v3Sub, v3Scale, v3Dot, v3Len, v3Norm, sceneNormal, type V3, type SdfSceneFn } from './sdf';

export interface Material {
  id: number;
  name: string;
  albedo: V3;          // visible-light diffuse
  metallic: number;    // 0..1
  roughness: number;   // 0..1
  uvFluor: V3;         // UV-fluorescence color (when illuminated by sun's UV)
  ir: number;          // 0..1 (thermal emission)
}

export const DEFAULT_MATERIALS: Record<number, Material> = {
  0: { id: 0, name: 'sky',     albedo: [0.55, 0.72, 0.95], metallic: 0,    roughness: 1,    uvFluor: [0.05, 0.1, 0.4], ir: 0.05 },
  1: { id: 1, name: 'ground',  albedo: [0.38, 0.30, 0.22], metallic: 0,    roughness: 0.85, uvFluor: [0.0, 0.0, 0.0],  ir: 0.08 },
  2: { id: 2, name: 'metal',   albedo: [0.65, 0.65, 0.70], metallic: 0.95, roughness: 0.15, uvFluor: [0.2, 0.2, 0.4],  ir: 0.45 },
  3: { id: 3, name: 'crystal', albedo: [0.85, 0.92, 0.95], metallic: 0.15, roughness: 0.05, uvFluor: [0.7, 0.85, 1.0], ir: 0.10 },
  4: { id: 4, name: 'ember',   albedo: [1.0, 0.45, 0.15],  metallic: 0,    roughness: 0.7,  uvFluor: [0.0, 0.0, 0.0],  ir: 0.92 },
  5: { id: 5, name: 'foliage', albedo: [0.18, 0.42, 0.12], metallic: 0,    roughness: 0.9,  uvFluor: [0.45, 0.6, 0.1], ir: 0.30 },
  6: { id: 6, name: 'bone',    albedo: [0.91, 0.88, 0.78], metallic: 0,    roughness: 0.8,  uvFluor: [0.85, 0.8, 0.65],ir: 0.18 },
};

export interface Camera {
  origin: V3;
  target: V3;
  up: V3;
  fovDeg: number;
}

export interface Light {
  direction: V3;         // direction toward sun (normalized)
  color: V3;             // RGB intensity
  ambient: V3;           // ambient term
}

export interface RenderOpts {
  width: number;
  height: number;
  samples?: number;        // 1 = no supersample
  maxSteps?: number;
  minDist?: number;
  maxDist?: number;
  exposure?: number;       // gamma correction
}

export interface SpectralFrame {
  width: number;
  height: number;
  rgb:   Float32Array;     // length = w*h*3
  uv:    Float32Array;     // length = w*h*3
  ir:    Float32Array;     // length = w*h (greyscale)
  depth: Float32Array;     // length = w*h
  normal: Float32Array;    // length = w*h*3 (in 0..1)
  matId: Int32Array;       // length = w*h
}


interface RayHit { t: number; matId: number; pos: V3; }

function marchRay(scene: SdfSceneFn, origin: V3, dir: V3, opts: Required<Pick<RenderOpts, 'maxSteps' | 'minDist' | 'maxDist'>>): RayHit | null {
  let t = 0;
  for (let i = 0; i < opts.maxSteps; i++) {
    const p: V3 = [origin[0] + dir[0]*t, origin[1] + dir[1]*t, origin[2] + dir[2]*t];
    const hit = scene(p);
    if (hit.d < opts.minDist) return { t, matId: hit.matId, pos: p };
    t += hit.d;
    if (t > opts.maxDist) return null;
  }
  return null;
}

// Cook-Torrance + Lambertian, simplified
function shade(mat: Material, normal: V3, viewDir: V3, light: Light, occluded: boolean): V3 {
  const lDir = light.direction;
  const nDotL = Math.max(0, v3Dot(normal, lDir));
  const halfV = v3Norm(v3Add(lDir, viewDir));
  const nDotH = Math.max(0, v3Dot(normal, halfV));
  const nDotV = Math.max(0, v3Dot(normal, viewDir));
  // GGX distribution
  const a = mat.roughness * mat.roughness;
  const a2 = a * a;
  const denom = nDotH*nDotH * (a2 - 1) + 1;
  const D = a2 / (Math.PI * denom * denom + 1e-6);
  // Smith G
  const k = (mat.roughness + 1) ** 2 / 8;
  const Gv = nDotV / (nDotV * (1 - k) + k + 1e-6);
  const Gl = nDotL / (nDotL * (1 - k) + k + 1e-6);
  const G = Gv * Gl;
  // Fresnel (Schlick)
  const F0 = mat.metallic > 0.5 ? mat.albedo : v3(0.04, 0.04, 0.04);
  const hDotV = Math.max(0, v3Dot(halfV, viewDir));
  const F: V3 = [
    F0[0] + (1 - F0[0]) * Math.pow(1 - hDotV, 5),
    F0[1] + (1 - F0[1]) * Math.pow(1 - hDotV, 5),
    F0[2] + (1 - F0[2]) * Math.pow(1 - hDotV, 5),
  ];
  const specDenom = 4 * nDotV * nDotL + 1e-6;
  const specFactor = (D * G) / specDenom;
  const spec: V3 = [F[0]*specFactor, F[1]*specFactor, F[2]*specFactor];
  // kD energy conservation
  const kD: V3 = [(1-F[0])*(1-mat.metallic), (1-F[1])*(1-mat.metallic), (1-F[2])*(1-mat.metallic)];
  const diffuse: V3 = [mat.albedo[0]*kD[0]/Math.PI, mat.albedo[1]*kD[1]/Math.PI, mat.albedo[2]*kD[2]/Math.PI];
  const direct = occluded ? 0 : 1;
  return [
    (diffuse[0] + spec[0]) * light.color[0] * nDotL * direct + light.ambient[0] * mat.albedo[0],
    (diffuse[1] + spec[1]) * light.color[1] * nDotL * direct + light.ambient[1] * mat.albedo[1],
    (diffuse[2] + spec[2]) * light.color[2] * nDotL * direct + light.ambient[2] * mat.albedo[2],
  ];
}

function shadowRay(scene: SdfSceneFn, origin: V3, dir: V3, opts: Required<Pick<RenderOpts, 'maxSteps' | 'minDist' | 'maxDist'>>): boolean {
  let t = opts.minDist * 4;
  for (let i = 0; i < opts.maxSteps / 2; i++) {
    const p: V3 = [origin[0]+dir[0]*t, origin[1]+dir[1]*t, origin[2]+dir[2]*t];
    const h = scene(p);
    if (h.d < opts.minDist) return true;
    t += h.d;
    if (t > opts.maxDist) return false;
  }
  return false;
}


export function renderSpectral(
  scene: SdfSceneFn,
  cam: Camera,
  light: Light,
  materials: Record<number, Material>,
  opts: RenderOpts,
): SpectralFrame {
  const w = opts.width, h = opts.height;
  const samples = opts.samples ?? 1;
  const settings = {
    maxSteps: opts.maxSteps ?? 128,
    minDist: opts.minDist ?? 0.002,
    maxDist: opts.maxDist ?? 80,
  };
  const exposure = opts.exposure ?? 1.2;
  const rgb = new Float32Array(w*h*3);
  const uv = new Float32Array(w*h*3);
  const ir = new Float32Array(w*h);
  const depth = new Float32Array(w*h);
  const normal = new Float32Array(w*h*3);
  const matId = new Int32Array(w*h);

  // Camera basis
  const forward = v3Norm(v3Sub(cam.target, cam.origin));
  const right = v3Norm([
    forward[1]*cam.up[2] - forward[2]*cam.up[1],
    forward[2]*cam.up[0] - forward[0]*cam.up[2],
    forward[0]*cam.up[1] - forward[1]*cam.up[0],
  ]);
  const up = [right[1]*forward[2]-right[2]*forward[1], right[2]*forward[0]-right[0]*forward[2], right[0]*forward[1]-right[1]*forward[0]] as V3;
  const aspect = w / h;
  const fovScale = Math.tan((cam.fovDeg * 0.5) * Math.PI / 180);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rR=0, rG=0, rB=0, uR=0, uG=0, uB=0, iSum=0, dSum=0;
      const nAccum: V3 = [0,0,0];
      let matSeen = 0;
      for (let s = 0; s < samples; s++) {
        const jx = samples === 1 ? 0 : (s % 2) * 0.5;
        const jy = samples === 1 ? 0 : (Math.floor(s / 2) % 2) * 0.5;
        const ndcX = ((x + 0.5 + jx) / w) * 2 - 1;
        const ndcY = 1 - ((y + 0.5 + jy) / h) * 2;
        const dir = v3Norm([
          forward[0] + right[0]*ndcX*aspect*fovScale + up[0]*ndcY*fovScale,
          forward[1] + right[1]*ndcX*aspect*fovScale + up[1]*ndcY*fovScale,
          forward[2] + right[2]*ndcX*aspect*fovScale + up[2]*ndcY*fovScale,
        ]);
        const hit = marchRay(scene, cam.origin, dir, settings);
        if (!hit) {
          // sky
          const sky = materials[0];
          rR += sky.albedo[0]; rG += sky.albedo[1]; rB += sky.albedo[2];
          uR += sky.uvFluor[0]; uG += sky.uvFluor[1]; uB += sky.uvFluor[2];
          iSum += sky.ir;
          dSum += settings.maxDist;
          nAccum[0] += 0.5; nAccum[1] += 1; nAccum[2] += 0.5;
          matSeen = 0;
          continue;
        }
        const mat = materials[hit.matId] || materials[1];
        const n = sceneNormal(scene, hit.pos);
        // Light shadow
        const occluded = shadowRay(scene, hit.pos, light.direction, settings);
        const viewDir = v3Norm(v3Sub(cam.origin, hit.pos));
        const c = shade(mat, n, viewDir, light, occluded);
        rR += c[0]; rG += c[1]; rB += c[2];
        // UV: angle-of-incidence-modulated fluorescence (stronger when surface faces sun)
        const nDotL = Math.max(0, v3Dot(n, light.direction));
        uR += mat.uvFluor[0] * nDotL;
        uG += mat.uvFluor[1] * nDotL;
        uB += mat.uvFluor[2] * nDotL;
        // IR: material emission + view-angle modulation (Stefan-Boltzmann-ish)
        const nDotV = Math.max(0, v3Dot(n, viewDir));
        iSum += mat.ir * (0.4 + 0.6 * nDotV);
        dSum += hit.t;
        nAccum[0] += n[0]*0.5+0.5; nAccum[1] += n[1]*0.5+0.5; nAccum[2] += n[2]*0.5+0.5;
        matSeen = mat.id;
      }
      const inv = 1 / samples;
      const idx = (y*w+x)*3;
      // Tone map (Reinhard) + gamma 2.2
      const tmR = rR*inv/(1 + rR*inv) * exposure;
      const tmG = rG*inv/(1 + rG*inv) * exposure;
      const tmB = rB*inv/(1 + rB*inv) * exposure;
      rgb[idx]   = Math.pow(Math.max(0, tmR), 1/2.2);
      rgb[idx+1] = Math.pow(Math.max(0, tmG), 1/2.2);
      rgb[idx+2] = Math.pow(Math.max(0, tmB), 1/2.2);
      uv[idx]   = Math.min(1, uR*inv);
      uv[idx+1] = Math.min(1, uG*inv);
      uv[idx+2] = Math.min(1, uB*inv);
      ir[y*w+x] = Math.min(1, iSum*inv);
      depth[y*w+x] = dSum * inv;
      normal[idx]   = nAccum[0]*inv;
      normal[idx+1] = nAccum[1]*inv;
      normal[idx+2] = nAccum[2]*inv;
      matId[y*w+x] = matSeen;
    }
  }
  return { width: w, height: h, rgb, uv, ir, depth, normal, matId };
}

// PNG encoding helpers (Float32 → 8-bit RGBA)
export function rgbToRGBA8(frame: SpectralFrame, channel: 'rgb' | 'uv' | 'ir' | 'depth' | 'normal' | 'matId'): Uint8Array {
  const n = frame.width * frame.height;
  const out = new Uint8Array(n * 4);
  const maxDepth = (channel === 'depth') ? Math.max(1, ...Array.from(frame.depth)) : 1;
  for (let i = 0; i < n; i++) {
    let r=0,g=0,b=0;
    if (channel === 'rgb')      { r = frame.rgb[i*3];   g = frame.rgb[i*3+1]; b = frame.rgb[i*3+2]; }
    else if (channel === 'uv')  { r = frame.uv[i*3];    g = frame.uv[i*3+1];  b = frame.uv[i*3+2]; }
    else if (channel === 'ir')  {
      // Thermal map: blue→red→yellow ramp
      const v = frame.ir[i];
      r = Math.min(1, v*1.8); g = Math.max(0, v*1.4-0.4); b = Math.max(0, 0.6 - v*1.2);
    }
    else if (channel === 'depth') { const v = 1 - Math.min(1, frame.depth[i] / maxDepth); r=g=b=v; }
    else if (channel === 'normal') { r = frame.normal[i*3]; g = frame.normal[i*3+1]; b = frame.normal[i*3+2]; }
    else if (channel === 'matId') {
      // Distinct color per material id
      const m = frame.matId[i];
      r = ((m*73)%256)/255; g = ((m*131)%256)/255; b = ((m*191)%256)/255;
    }
    out[i*4]   = Math.round(Math.min(1, Math.max(0, r)) * 255);
    out[i*4+1] = Math.round(Math.min(1, Math.max(0, g)) * 255);
    out[i*4+2] = Math.round(Math.min(1, Math.max(0, b)) * 255);
    out[i*4+3] = 255;
  }
  return out;
}
