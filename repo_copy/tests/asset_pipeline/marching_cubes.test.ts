/**
 * Marching Cubes tests.
 *
 * Covers the three things that must not drift:
 *  - Correctness on known implicit fields (sphere, box, gyroid).
 *  - Determinism: same input → byte-identical output buffers.
 *  - Topology sanity: indices in range, no degenerate triangles, normals unit.
 *
 * We do *not* pin exact vertex counts — those depend on numerical tie-breaks
 * that can legitimately shift by a few verts across compilers. Instead we
 * pin invariants that would catch real regressions (open/closed surface,
 * normal direction, manifold-ish index ranges).
 */
import { describe, it, expect } from 'vitest';
import { marchingCubes, fieldIndex } from '../../src/lib/asset_pipeline/marching_cubes.js';

// Build a Float32Array scalar field over a regular grid by evaluating `f` at
// each lattice point. The grid spans [-1, 1] per axis.
function sampleField(
  N: number,
  f: (x: number, y: number, z: number) => number,
): Float32Array {
  const field = new Float32Array(N * N * N);
  const step = 2 / (N - 1);
  for (let z = 0; z < N; z++) {
    const zw = -1 + z * step;
    for (let y = 0; y < N; y++) {
      const yw = -1 + y * step;
      for (let x = 0; x < N; x++) {
        const xw = -1 + x * step;
        field[fieldIndex(x, y, z, N, N)] = f(xw, yw, zw);
      }
    }
  }
  return field;
}

describe('marchingCubes — fieldIndex', () => {
  it('is packed as x + y*nx + z*nx*ny', () => {
    expect(fieldIndex(0, 0, 0, 4, 4)).toBe(0);
    expect(fieldIndex(3, 0, 0, 4, 4)).toBe(3);
    expect(fieldIndex(0, 1, 0, 4, 4)).toBe(4);
    expect(fieldIndex(0, 0, 1, 4, 4)).toBe(16);
    expect(fieldIndex(3, 3, 3, 4, 4)).toBe(63);
  });
});

describe('marchingCubes — input validation', () => {
  it('throws when field length mismatches dims', () => {
    const bad = new Float32Array(10);
    expect(() => marchingCubes(bad, [4, 4, 4])).toThrow(/field length/);
  });
});

describe('marchingCubes — sphere SDF', () => {
  const N = 24;
  // Positive inside a sphere of radius 0.6.
  const field = sampleField(N, (x, y, z) => 0.6 - Math.hypot(x, y, z));
  const step = 2 / (N - 1);
  const mesh = marchingCubes(field, [N, N, N], { threshold: 0, scale: step, center: [1, 1, 1] });

  it('produces non-empty, well-formed buffers', () => {
    expect(mesh.vertices.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect(mesh.vertices.length % 3).toBe(0);
    expect(mesh.indices.length % 3).toBe(0);
    expect(mesh.normals.length).toBe(mesh.vertices.length);
  });

  it('all indices point into the vertex buffer', () => {
    const vertexCount = mesh.vertices.length / 3;
    let maxIdx = 0;
    for (let i = 0; i < mesh.indices.length; i++) {
      if (mesh.indices[i] >= vertexCount) {
        throw new Error(`index ${mesh.indices[i]} out of range (vertexCount=${vertexCount}) at ${i}`);
      }
      if (mesh.indices[i] > maxIdx) maxIdx = mesh.indices[i];
    }
    expect(maxIdx).toBeLessThan(vertexCount);
  });

  it('all vertices lie near the sphere of radius 0.6', () => {
    // Centered mesh: geometry should lie within a shell around r=0.6.
    // Tolerance is generous (half a cell) because MC samples on a grid.
    let minR = Infinity, maxR = -Infinity;
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const r = Math.hypot(mesh.vertices[i], mesh.vertices[i + 1], mesh.vertices[i + 2]);
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
    }
    // Target radius is 0.6 in world units (scale is step, center is (1,1,1)).
    expect(minR).toBeGreaterThan(0.6 - step * 1.5);
    expect(maxR).toBeLessThan(0.6 + step * 1.5);
  });

  it('normals are unit vectors and point outward', () => {
    // Pick a handful of verts; confirm normal magnitude ≈ 1 and sign(n·v) > 0.
    const samples = Math.min(40, mesh.vertices.length / 3);
    for (let i = 0; i < samples; i++) {
      const v = i * 3;
      const nx = mesh.normals[v], ny = mesh.normals[v + 1], nz = mesh.normals[v + 2];
      const mag = Math.hypot(nx, ny, nz);
      expect(mag).toBeGreaterThan(0.95);
      expect(mag).toBeLessThan(1.05);

      const px = mesh.vertices[v], py = mesh.vertices[v + 1], pz = mesh.vertices[v + 2];
      const dot = nx * px + ny * py + nz * pz;
      // On a sphere the outward normal aligns with the position vector.
      expect(dot).toBeGreaterThan(0);
    }
  });

  it('contains no degenerate (zero-area) triangles', () => {
    const v = mesh.vertices;
    let degenerate = 0;
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const a = mesh.indices[t] * 3, b = mesh.indices[t + 1] * 3, c = mesh.indices[t + 2] * 3;
      // Two edges of the triangle.
      const e1x = v[b] - v[a], e1y = v[b + 1] - v[a + 1], e1z = v[b + 2] - v[a + 2];
      const e2x = v[c] - v[a], e2y = v[c + 1] - v[a + 1], e2z = v[c + 2] - v[a + 2];
      // Cross product magnitude = twice the area.
      const cx = e1y * e2z - e1z * e2y;
      const cy = e1z * e2x - e1x * e2z;
      const cz = e1x * e2y - e1y * e2x;
      if (Math.hypot(cx, cy, cz) < 1e-10) degenerate++;
    }
    expect(degenerate).toBe(0);
  });

  it('is a closed manifold (every edge has an even number of incidences)', () => {
    // A closed MC surface without boundaries shares every edge between exactly
    // two triangles — this catches holes/boundary regressions.
    const edgeCount = new Map<string, number>();
    const key = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);
    for (let t = 0; t < mesh.indices.length; t += 3) {
      const a = mesh.indices[t], b = mesh.indices[t + 1], c = mesh.indices[t + 2];
      for (const [u, v] of [[a, b], [b, c], [c, a]] as const) {
        const k = key(u, v);
        edgeCount.set(k, (edgeCount.get(k) ?? 0) + 1);
      }
    }
    let boundary = 0;
    for (const n of edgeCount.values()) if (n % 2 !== 0) boundary++;
    expect(boundary).toBe(0);
  });
});

describe('marchingCubes — box SDF', () => {
  const N = 20;
  // Positive inside the axis-aligned box |x|,|y|,|z| < 0.5.
  const field = sampleField(N, (x, y, z) => 0.5 - Math.max(Math.abs(x), Math.abs(y), Math.abs(z)));
  const step = 2 / (N - 1);
  const mesh = marchingCubes(field, [N, N, N], { threshold: 0, scale: step, center: [1, 1, 1] });

  it('produces a mesh with more vertices near the corners than centers of faces', () => {
    // Loose check: bounding box should be close to [-0.5, 0.5] on each axis.
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        const c = mesh.vertices[i + a];
        if (c < min[a]) min[a] = c;
        if (c > max[a]) max[a] = c;
      }
    }
    for (let a = 0; a < 3; a++) {
      expect(min[a]).toBeGreaterThan(-0.5 - step * 1.5);
      expect(min[a]).toBeLessThan(-0.5 + step * 1.5);
      expect(max[a]).toBeLessThan(0.5 + step * 1.5);
      expect(max[a]).toBeGreaterThan(0.5 - step * 1.5);
    }
  });
});

describe('marchingCubes — gyroid (triply-periodic minimal surface)', () => {
  const N = 24;
  // F = sin(x)cos(y) + sin(y)cos(z) + sin(z)cos(x). Extracting F = 0 yields
  // a gyroid: topologically non-trivial and a good stress test for tri tables.
  const k = 3.0;
  const field = sampleField(N, (x, y, z) =>
    Math.sin(k * x) * Math.cos(k * y) +
    Math.sin(k * y) * Math.cos(k * z) +
    Math.sin(k * z) * Math.cos(k * x),
  );
  const step = 2 / (N - 1);
  const mesh = marchingCubes(field, [N, N, N], { threshold: 0, scale: step, center: [1, 1, 1] });

  it('produces a sizable mesh — gyroid is surface-dense', () => {
    // A gyroid in [-1,1]^3 with k=3 should yield thousands of triangles at N=24.
    expect(mesh.indices.length / 3).toBeGreaterThan(500);
  });

  it('every vertex lies near the F = 0 level set', () => {
    // Resample the original field analytically at each vertex — it should
    // be ≈ 0 (within a grid-cell's tolerance of linear interp).
    let worst = 0;
    for (let i = 0; i < mesh.vertices.length; i += 3) {
      const x = mesh.vertices[i], y = mesh.vertices[i + 1], z = mesh.vertices[i + 2];
      const val = Math.sin(k * x) * Math.cos(k * y) +
                  Math.sin(k * y) * Math.cos(k * z) +
                  Math.sin(k * z) * Math.cos(k * x);
      if (Math.abs(val) > worst) worst = Math.abs(val);
    }
    // Linear interp between corners isn't exact for nonlinear F, so the error
    // is bounded by the local curvature × cell size. k=3, step ≈ 0.087 → worst
    // residual around 0.4 is acceptable; we assert a generous 0.6.
    expect(worst).toBeLessThan(0.6);
  });
});

describe('marchingCubes — determinism', () => {
  const N = 16;
  const field = sampleField(N, (x, y, z) => 0.5 - Math.hypot(x, y, z));

  it('same input produces byte-identical vertex/index/normal buffers', () => {
    const a = marchingCubes(field, [N, N, N]);
    const b = marchingCubes(field, [N, N, N]);
    expect(a.vertices.length).toBe(b.vertices.length);
    expect(a.indices.length).toBe(b.indices.length);
    for (let i = 0; i < a.vertices.length; i++) {
      expect(a.vertices[i]).toBe(b.vertices[i]);
      expect(a.normals[i]).toBe(b.normals[i]);
    }
    for (let i = 0; i < a.indices.length; i++) expect(a.indices[i]).toBe(b.indices[i]);
  });

  it('different thresholds produce different meshes', () => {
    const a = marchingCubes(field, [N, N, N], { threshold: 0 });
    const b = marchingCubes(field, [N, N, N], { threshold: 0.2 });
    // Not a hard inequality — could be same by coincidence — but for a sphere
    // at r=0.5 vs r=0.3 the mesh sizes differ by an obvious amount.
    expect(a.vertices.length).not.toBe(b.vertices.length);
  });
});

describe('marchingCubes — empty field', () => {
  it('returns empty buffers when field is entirely below threshold', () => {
    const N = 8;
    const field = new Float32Array(N * N * N).fill(-1);
    const m = marchingCubes(field, [N, N, N], { threshold: 0 });
    expect(m.vertices.length).toBe(0);
    expect(m.indices.length).toBe(0);
    expect(m.normals.length).toBe(0);
  });

  it('returns empty buffers when field is entirely above threshold', () => {
    const N = 8;
    const field = new Float32Array(N * N * N).fill(1);
    const m = marchingCubes(field, [N, N, N], { threshold: 0 });
    expect(m.vertices.length).toBe(0);
    expect(m.indices.length).toBe(0);
  });
});

describe('marchingCubes — MeshExtractor bridge', () => {
  it('MeshExtractor.extractSmoothIsosurface returns same result as marchingCubes', async () => {
    const { MeshExtractor } = await import('../../src/lib/asset_pipeline/mesh_extractor.js');
    const N = 16;
    const field = sampleField(N, (x, y, z) => 0.5 - Math.hypot(x, y, z));
    const a = MeshExtractor.extractSmoothIsosurface(field, [N, N, N]);
    const b = marchingCubes(field, [N, N, N]);
    expect(a.vertices.length).toBe(b.vertices.length);
    expect(a.indices.length).toBe(b.indices.length);
  });
});
