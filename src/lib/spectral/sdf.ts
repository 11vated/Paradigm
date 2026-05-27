/**
 * SDF — signed distance functions and combinators.
 * Pure / deterministic / IO-free.
 */
export type V3 = [number, number, number];
export type V2 = [number, number];
export type SdfFn = (p: V3) => number;
export interface SdfHit { d: number; matId: number; }
export type SdfSceneFn = (p: V3) => SdfHit;

export const v3 = (x: number, y: number, z: number): V3 => [x, y, z];
export const v3Add = (a: V3, b: V3): V3 => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
export const v3Sub = (a: V3, b: V3): V3 => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
export const v3Scale = (a: V3, k: number): V3 => [a[0]*k, a[1]*k, a[2]*k];
export const v3Dot = (a: V3, b: V3): number => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const v3Len = (a: V3): number => Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]);
export const v3Norm = (a: V3): V3 => { const l = v3Len(a) || 1; return [a[0]/l, a[1]/l, a[2]/l]; };
export const v3Abs = (a: V3): V3 => [Math.abs(a[0]), Math.abs(a[1]), Math.abs(a[2])];
export const v3Max = (a: V3, b: V3): V3 => [Math.max(a[0],b[0]), Math.max(a[1],b[1]), Math.max(a[2],b[2])];

export const sdSphere = (radius: number): SdfFn => p => v3Len(p) - radius;
export const sdBox = (b: V3): SdfFn => p => {
  const q = v3Sub(v3Abs(p), b);
  const maxQ = Math.max(q[0], q[1], q[2]);
  const outside = v3Len(v3Max(q, [0,0,0]));
  return outside + Math.min(maxQ, 0);
};
export const sdPlane = (n: V3, h: number): SdfFn => p => v3Dot(p, v3Norm(n)) + h;
export const sdTorus = (R: number, r: number): SdfFn => p => {
  const q: V2 = [Math.sqrt(p[0]*p[0]+p[2]*p[2]) - R, p[1]];
  return Math.sqrt(q[0]*q[0]+q[1]*q[1]) - r;
};
export const sdCylinder = (h: number, r: number): SdfFn => p => {
  const d: V2 = [Math.sqrt(p[0]*p[0]+p[2]*p[2]) - r, Math.abs(p[1]) - h];
  return Math.min(Math.max(d[0], d[1]), 0) + Math.sqrt(Math.max(d[0],0)**2 + Math.max(d[1],0)**2);
};
export const translate = (offset: V3, f: SdfFn): SdfFn => p => f(v3Sub(p, offset));
export const rotateY = (theta: number, f: SdfFn): SdfFn => {
  const c = Math.cos(theta), s = Math.sin(theta);
  return p => f([c*p[0] - s*p[2], p[1], s*p[0] + c*p[2]]);
};
export const opUnion = (a: SdfFn, b: SdfFn): SdfFn => p => Math.min(a(p), b(p));
export const opIntersection = (a: SdfFn, b: SdfFn): SdfFn => p => Math.max(a(p), b(p));
export const opSubtract = (a: SdfFn, b: SdfFn): SdfFn => p => Math.max(a(p), -b(p));
export const opSmoothUnion = (a: SdfFn, b: SdfFn, k: number): SdfFn => p => {
  const da = a(p), db = b(p);
  const h = Math.max(k - Math.abs(da - db), 0) / k;
  return Math.min(da, db) - h*h*h*k * (1/6);
};
export const opRepeat = (period: V3, f: SdfFn): SdfFn => p => {
  const q: V3 = [
    p[0] - period[0] * Math.round(p[0] / period[0]),
    p[1] - period[1] * Math.round(p[1] / period[1]),
    p[2] - period[2] * Math.round(p[2] / period[2]),
  ];
  return f(q);
};
export const withMat = (matId: number, f: SdfFn): SdfSceneFn => p => ({ d: f(p), matId });
export const sceneUnion = (...scenes: SdfSceneFn[]): SdfSceneFn => p => {
  let best: SdfHit = { d: Infinity, matId: 0 };
  for (const s of scenes) {
    const h = s(p);
    if (h.d < best.d) best = h;
  }
  return best;
};
export function sceneNormal(scene: SdfSceneFn, p: V3, eps = 0.001): V3 {
  const dx = scene([p[0]+eps, p[1], p[2]]).d - scene([p[0]-eps, p[1], p[2]]).d;
  const dy = scene([p[0], p[1]+eps, p[2]]).d - scene([p[0], p[1]-eps, p[2]]).d;
  const dz = scene([p[0], p[1], p[2]+eps]).d - scene([p[0], p[1], p[2]-eps]).d;
  return v3Norm([dx, dy, dz]);
}
