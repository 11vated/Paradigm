export function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0.0) / k;
  return Math.min(a, b) - h * h * k * (1.0 / 4.0);
}

export function sdSphere(p: [number, number, number], s: number): number {
  return Math.sqrt(p[0]*p[0] + p[1]*p[1] + p[2]*p[2]) - s;
}

export function sdBox(p: [number, number, number], b: [number, number, number]): number {
  const d = [Math.abs(p[0]) - b[0], Math.abs(p[1]) - b[1], Math.abs(p[2]) - b[2]];
  const out = Math.sqrt(Math.max(d[0], 0)**2 + Math.max(d[1], 0)**2 + Math.max(d[2], 0)**2);
  const inn = Math.min(Math.max(d[0], Math.max(d[1], d[2])), 0.0);
  return out + inn;
}

export function sdTorus(p: [number, number, number], t: [number, number]): number {
  const q = [Math.sqrt(p[0]*p[0] + p[2]*p[2]) - t[0], p[1]];
  return Math.sqrt(q[0]*q[0] + q[1]*q[1]) - t[1];
}

export function sdCylinder(p: [number, number, number], c: [number, number]): number {
  const d = [Math.sqrt(p[0]*p[0] + p[2]*p[2]) - c[0], Math.abs(p[1]) - c[1]];
  return Math.min(Math.max(d[0], d[1]), 0.0) + Math.sqrt(Math.max(d[0], 0)**2 + Math.max(d[1], 0)**2);
}

export function sdCapsule(p: [number, number, number], a: [number, number, number], b: [number, number, number], r: number): number {
  const pa = [p[0]-a[0], p[1]-a[1], p[2]-a[2]];
  const ba = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
  const h = Math.max(0.0, Math.min(1.0, (pa[0]*ba[0] + pa[1]*ba[1] + pa[2]*ba[2]) / (ba[0]*ba[0] + ba[1]*ba[1] + ba[2]*ba[2])));
  const d = [pa[0] - ba[0]*h, pa[1] - ba[1]*h, pa[2] - ba[2]*h];
  return Math.sqrt(d[0]*d[0] + d[1]*d[1] + d[2]*d[2]) - r;
}

// Very basic hash for noise
function xorshift32(seed: number) {
  let x = seed || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x;
}

export function createNoise3D(seed: number) {
  const p = new Uint8Array(512);
  let x = seed;
  for (let i = 0; i < 256; i++) {
    x = xorshift32(x);
    p[i] = x & 255;
  }
  for (let i = 0; i < 256; i++) {
    p[256 + i] = p[i];
  }

  const grad3 = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];

  function dot(g: number[], x: number, y: number, z: number) {
    return g[0]*x + g[1]*y + g[2]*z;
  }

  return function(xin: number, yin: number, zin: number) {
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;
    
    let n0, n1, n2, n3;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    const z0 = zin - Z0;
    
    let i1, j1, k1;
    let i2, j2, k2;
    
    if (x0 >= y0) {
      if (y0 >= z0)      { i1=1; j1=0; k1=0; i2=1; j2=1; k2=0; }
      else if (x0 >= z0) { i1=1; j1=0; k1=0; i2=1; j2=0; k2=1; }
      else               { i1=0; j1=0; k1=1; i2=1; j2=0; k2=1; }
    } else {
      if (y0 < z0)       { i1=0; j1=0; k1=1; i2=0; j2=1; k2=1; }
      else if (x0 < z0)  { i1=0; j1=1; k1=0; i2=0; j2=1; k2=1; }
      else               { i1=0; j1=1; k1=0; i2=1; j2=1; k2=0; }
    }
    
    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;
    
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 < 0) n0 = 0.0;
    else { t0 *= t0; n0 = t0 * t0 * dot(grad3[p[ii+p[jj+p[kk]]] % 12], x0, y0, z0); }
    
    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (t1 < 0) n1 = 0.0;
    else { t1 *= t1; n1 = t1 * t1 * dot(grad3[p[ii+i1+p[jj+j1+p[kk+k1]]] % 12], x1, y1, z1); }
    
    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (t2 < 0) n2 = 0.0;
    else { t2 *= t2; n2 = t2 * t2 * dot(grad3[p[ii+i2+p[jj+j2+p[kk+k2]]] % 12], x2, y2, z2); }
    
    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (t3 < 0) n3 = 0.0;
    else { t3 *= t3; n3 = t3 * t3 * dot(grad3[p[ii+1+p[jj+1+p[kk+1]]] % 12], x3, y3, z3); }
    
    return 32.0 * (n0 + n1 + n2 + n3);
  };
}
